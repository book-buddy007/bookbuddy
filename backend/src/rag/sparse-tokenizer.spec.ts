import { readFileSync } from 'fs';
import { join } from 'path';
import {
  tokenizeForSparse,
  hashTerm,
  buildSparseVector,
  MIN_TOKEN_LENGTH,
} from './sparse-tokenizer';

/**
 * CROSS-REPO PARITY TEST.
 *
 * DCP builds the document-side sparse vectors at ingest; this repo builds the
 * query-side ones at search time. A sparse dot product only means anything if
 * both map the same word to the same index — and a divergence does not throw.
 * Recall just degrades, and it presents as "the AI gives bad answers" rather
 * than as a tokenizer bug, which is close to undiagnosable months later.
 *
 * `sparse-tokenizer.fixture.json` is the shared contract, copied byte-identical
 * from DCP. If this test fails after a dependency bump or a Node upgrade, the
 * two repos have drifted and hybrid retrieval is silently broken — do not
 * "fix" it by regenerating the fixture on this side.
 */
describe('sparse-tokenizer (cross-repo contract)', () => {
  const fixture = JSON.parse(
    readFileSync(join(__dirname, 'sparse-tokenizer.fixture.json'), 'utf8'),
  ) as {
    minTokenLength: number;
    termIndex: Record<string, { tokens: string[]; indices: number[] }>;
    sentences: Record<string, { indices: number[]; values: number[] }>;
  };

  it('agrees with DCP on the minimum token length', () => {
    expect(MIN_TOKEN_LENGTH).toBe(fixture.minTokenLength);
  });

  describe('termIndex — tokenization and FNV-1a hashing', () => {
    for (const [term, expected] of Object.entries(fixture.termIndex)) {
      it(`matches DCP for ${JSON.stringify(term)}`, () => {
        expect(tokenizeForSparse(term)).toEqual(expected.tokens);
        expect(expected.tokens.map(hashTerm)).toEqual(expected.indices);
      });
    }
  });

  describe('sentences — full sparse vectors', () => {
    for (const [sentence, expected] of Object.entries(fixture.sentences)) {
      it(`matches DCP for ${JSON.stringify(sentence)}`, () => {
        expect(buildSparseVector(sentence)).toEqual({
          indices: expected.indices,
          values: expected.values,
        });
      });
    }
  });

  it('sums repeated terms rather than emitting duplicate indices', () => {
    const v = buildSparseVector('the the the cat');
    expect(new Set(v.indices).size).toBe(v.indices.length);
    expect(v.values.some((n) => n > 1)).toBe(true);
  });

  it('keeps Devanagari syllables intact (the \\p{M} case)', () => {
    // Without combining marks in the token class this shatters into fragments
    // that the length filter then mostly discards — English would keep working
    // and Hindi would quietly stop matching.
    const tokens = tokenizeForSparse('प्रकाश संश्लेषण');
    expect(tokens).toEqual(['प्रकाश', 'संश्लेषण']);
  });
});
