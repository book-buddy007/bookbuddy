import { readFileSync } from 'fs';
import { join } from 'path';
import {
  Chunk,
  isPracticeSection,
  parseEnrichedMarkdown,
  splitFrontmatter,
  splitLongText,
} from './enriched-markdown';

const sample = readFileSync(join(__dirname, '__fixtures__', 'sample-chapter.md'), 'utf8');

const FM = `---
chapter_title: "Test Chapter"
validation_status: PENDING
---
`;
const chunksOf = (body: string, options = {}) =>
  parseEnrichedMarkdown(FM + body, options).chunks;
const byLabel = (chunks: Chunk[], type: string, label: string) =>
  chunks.find((c) => c.blockType === type && c.label === label);

describe('splitFrontmatter', () => {
  it('reads keys, strips quotes and returns the body', () => {
    const { meta, body } = splitFrontmatter(
      '---\nbook_title: My Book\nclass_level: "9"\nisbn: "978-1"\n---\nBody here\n',
    );
    expect(meta).toMatchObject({ book_title: 'My Book', class_level: '9', isbn: '978-1' });
    expect(body.trim()).toBe('Body here');
  });

  it('copes with a BOM and CRLF line endings', () => {
    const { meta, body } = splitFrontmatter('﻿---\r\nsubject: Physics\r\n---\r\nText\r\n');
    expect(meta.subject).toBe('Physics');
    expect(body.trim()).toBe('Text');
  });

  it('treats a file without frontmatter as all body and warns', () => {
    expect(splitFrontmatter('Just text').meta).toEqual({});
    expect(parseEnrichedMarkdown('Just some body text that is long enough to index.').warnings[0]).toMatch(
      /No frontmatter/,
    );
  });
});

describe('the sample chapter', () => {
  const result = parseEnrichedMarkdown(sample);
  const { chunks } = result;

  it('reads the chapter identity', () => {
    expect(result.meta).toMatchObject({
      chapter_number: '8',
      chapter_title: 'Building Blocks in Economics: The Problem of Choice',
      validation_status: 'PENDING',
      subject: 'Economics',
    });
    expect(chunks.every((c) => c.chapter === result.meta.chapter_title)).toBe(true);
  });

  it('indexes figures, tables and graphs whole, with their label and own page', () => {
    const fig81 = byLabel(chunks, 'FIGURE', '8.1')!;
    expect(fig81.pageStart).toBe(183);
    expect(fig81.text).toContain('Fig. 8.1. Needs vs wants');
    expect(fig81.text).toContain('[/FIGURE]'.slice(0, 0)); // closing tag is not part of the text
    expect(fig81.retrievalClass).toBe('reference');

    const table = byLabel(chunks, 'TABLE', '1')!;
    expect(table.pageStart).toBe(185);
    // The data and its prose summary stay in ONE chunk.
    expect(table.text).toContain('| C | 50 | 70 |');
    expect(table.text).toContain('Prose summary: [provenance: authored]');

    const graph = byLabel(chunks, 'GRAPH', '8.3')!;
    expect(graph.text).toContain('Data transcription');
    expect(graph.text).toContain('Key insight');
  });

  it('marks discussion prompts as practice so answers never quote them', () => {
    const prompts = chunks.filter((c) => c.blockType === 'DISCUSSION_PROMPT');
    expect(prompts).toHaveLength(2);
    expect(prompts.every((c) => c.retrievalClass === 'practice')).toBe(true);
    expect(prompts.map((c) => c.pageStart).sort()).toEqual([183, 184]);
    expect(prompts[0].text).toMatch(/economic|wants|problems/i);
  });

  it('does not index the QR code block', () => {
    expect(chunks.some((c) => c.blockType === 'QR CODE')).toBe(false);
    expect(chunks.some((c) => c.text.includes('0908CH08'))).toBe(false);
  });

  it('records what was skipped, with page and reason, and ignores the comment under it', () => {
    expect(result.skipped).toEqual([{ page: 185, reason: 'fill-in student worksheet' }]);
    expect(chunks.some((c) => c.text.includes('Columns were'))).toBe(false);
  });

  it('keeps glossary entries separate, never merged', () => {
    const glossary = chunks.filter((c) => c.blockType === 'GLOSSARY TERM');
    expect(glossary.map((c) => c.text.match(/Term: (.+)/)![1])).toEqual([
      'Market',
      'Resources',
      'Production Possibility Curve (PPC)',
    ]);
  });

  it('puts answerable prose in reference chunks on the right page, with clean section names', () => {
    const opportunity = chunks.find((c) => c.text.includes('opportunity cost') && c.blockType === null)!;
    expect(opportunity.retrievalClass).toBe('reference');
    expect(opportunity.pageStart).toBe(184);
    expect(opportunity.sectionTitle).toBe('Choices and Limited Resources');

    const ppc = chunks.find((c) => c.text.includes('trade-off between barley and wheat'))!;
    expect(ppc.pageStart).toBe(185);
    // "(continued)" is dropped from the section name.
    expect(ppc.sectionTitle).toBe('Choices and Limited Resources');
  });

  it('does not emit chunks that are only a title', () => {
    expect(chunks.some((c) => c.text.trim() === '**Choices and Limited Resources**')).toBe(false);
  });

  it('has no markers or tags leaking into prose', () => {
    for (const c of chunks.filter((x) => x.blockType === null)) {
      expect(c.text).not.toMatch(/<!--|-->|\[\/[A-Z]/);
    }
  });
});

describe('block handling', () => {
  it("a block's own page tag beats the surrounding page marker, ASCII or en-dash", () => {
    const [a, b] = chunksOf(
      `<!-- PAGE 189 -->\n<!-- SECTION: S -->\n\n[TABLE 2 | Page 190-191 | Type: Data Table]\nTitle: T\n| a | b |\n|---|---|\n| 1 | 2 |\n[/TABLE]\n\n[CASE STUDY | Page 8–9 | Character: X]\nFull text: Savita borrows money at high interest and works as a labourer.\n[/CASE STUDY]\n`,
    );
    expect([a.pageStart, a.pageEnd]).toEqual([190, 191]);
    expect([b.pageStart, b.pageEnd]).toEqual([8, 9]);
  });

  it('classifies activities and exercise sections as practice, summaries as reference', () => {
    const chunks = chunksOf(
      [
        '<!-- PAGE 1 -->',
        '<!-- SECTION: Summary -->',
        'The summary of this chapter explains scarcity and choice in detail for students.',
        '<!-- PAGE 2 -->',
        '<!-- SECTION: Questions and activities -->',
        '1. Why do you think people wants keep changing over time in an economy?',
        '[ACTIVITY | Page 2 | Type: Suggested Activity]',
        'Instructions: Make a list of things your family bought this week and sort them.',
        '[/ACTIVITY]',
      ].join('\n'),
    );
    expect(chunks.find((c) => c.text.startsWith('The summary'))!.retrievalClass).toBe('reference');
    const practice = chunks.filter((c) => c.retrievalClass === 'practice');
    expect(practice).toHaveLength(2);
    expect(practice.some((c) => c.blockType === 'ACTIVITY')).toBe(true);
  });

  it('recognises exercise section names', () => {
    for (const name of ['Exercises', 'Questions and activities', 'Review Questions', 'Practise', 'Worksheet', 'Test yourself']) {
      expect(isPracticeSection(name)).toBe(true);
    }
    for (const name of ['Summary', 'Choices and Limited Resources', 'Introduction', null]) {
      expect(isPracticeSection(name as string | null)).toBe(false);
    }
  });

  it('ends an unclosed block at the next marker instead of swallowing the chapter, and warns', () => {
    const r = parseEnrichedMarkdown(
      `${FM}<!-- PAGE 5 -->\n[FIGURE 5.1 | Page 5 | Type: Photograph]\nTitle: Missing close\nDescription: A diagram that was never closed properly in the source file.\n<!-- PAGE 6 -->\nThe next page has ordinary prose that must still be indexed as a normal paragraph.\n`,
    );
    expect(r.warnings.join(' ')).toMatch(/no closing tag/);
    expect(r.chunks.find((c) => c.blockType === 'FIGURE')!.text).not.toContain('ordinary prose');
    expect(r.chunks.find((c) => c.text.includes('ordinary prose'))!.pageStart).toBe(6);
  });

  it('splits a huge block, repeating its header on each part', () => {
    const rows = Array.from({ length: 400 }, (_, i) => `| row ${i} | value ${i} |`).join('\n');
    const chunks = chunksOf(`<!-- PAGE 3 -->\n[TABLE 7 | Page 3 | Type: Data Table]\nTitle: Big\n${rows}\n[/TABLE]\n`, {
      maxBlockChars: 3000,
    });
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.blockType === 'TABLE' && c.label === '7')).toBe(true);
    expect(chunks.every((c) => c.text.length <= 3000)).toBe(true);
    expect(chunks[1].text).toContain('[TABLE 7 | Page 3 | Type: Data Table] (continued, part 2 of');
    // Every row survives somewhere.
    const all = chunks.map((c) => c.text).join('\n');
    expect(all).toContain('| row 0 |');
    expect(all).toContain('| row 399 |');
  });

  it('ignores multi-line comments', () => {
    const chunks = chunksOf(
      `<!-- PAGE 1 -->\n<!--\nprocessing note that\nspans lines\n-->\nReal paragraph content that is long enough to be indexed on its own.\n`,
    );
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).not.toMatch(/processing note/);
  });
});

describe('packing prose', () => {
  const para = (n: number) =>
    `Paragraph ${n} talks about the economy, scarcity, choice and opportunity cost in some detail. `.repeat(6).trim();

  it('keeps chunks within the limits and loses no text', () => {
    const body = ['<!-- PAGE 1 -->', '<!-- SECTION: Long section -->', ...Array.from({ length: 30 }, (_, i) => para(i))].join('\n\n');
    const chunks = chunksOf(body);
    expect(chunks.length).toBeGreaterThan(3);
    for (const c of chunks) expect(c.text.length).toBeLessThanOrEqual(2600);
    const joined = chunks.map((c) => c.text).join('\n');
    for (let i = 0; i < 30; i++) expect(joined).toContain(`Paragraph ${i} talks`);
  });

  it('never packs across a section change or from reference into practice', () => {
    const chunks = chunksOf(
      [
        '<!-- PAGE 1 -->',
        '<!-- SECTION: One -->',
        'First section text about supply and demand in a competitive market economy.',
        '<!-- SECTION: Two -->',
        'Second section text about banking and credit in a rural economy setting.',
        '<!-- SECTION: Exercises -->',
        '1. Explain supply and demand using an everyday example from your own life.',
      ].join('\n'),
    );
    expect(chunks).toHaveLength(3);
    expect(chunks.map((c) => c.sectionTitle)).toEqual(['One', 'Two', 'Exercises']);
    expect(chunks.map((c) => c.retrievalClass)).toEqual(['reference', 'reference', 'practice']);
  });

  it('records the page range of a chunk that spans a page break', () => {
    const chunks = chunksOf(
      '<!-- PAGE 10 -->\n<!-- SECTION: S -->\nOpening paragraph on page ten about the topic being studied here.\n<!-- PAGE 11 -->\nContinuing paragraph on page eleven that finishes the thought begun earlier.\n',
    );
    expect(chunks).toHaveLength(1);
    expect([chunks[0].pageStart, chunks[0].pageEnd]).toEqual([10, 11]);
  });

  it('closes a chunk at a page break once it is big enough, keeping page citations tight', () => {
    const big = 'Detailed explanation of the concept with many words. '.repeat(25).trim(); // ~1.3k chars
    const chunks = chunksOf(`<!-- PAGE 20 -->\n<!-- SECTION: S -->\n${big}\n<!-- PAGE 21 -->\n${big.replace('Detailed', 'Further')}\n`);
    expect(chunks.length).toBe(2);
    expect([chunks[0].pageStart, chunks[0].pageEnd]).toEqual([20, 20]);
    expect([chunks[1].pageStart, chunks[1].pageEnd]).toEqual([21, 21]);
  });

  it('keeps a heading with the paragraph it introduces rather than stranding it', () => {
    const filler = Array.from({ length: 7 }, (_, i) => para(i)).join('\n\n');
    const chunks = chunksOf(`<!-- PAGE 1 -->\n<!-- SECTION: S -->\n${filler}\n\n**A Distinct Heading**\n\nBody text after the heading that explains the idea at some length for the reader.\n`);
    const withHeading = chunks.find((c) => c.text.includes('A Distinct Heading'))!;
    // The heading is followed by its body in the same chunk, never the last line of one.
    expect(withHeading.text.trimEnd().endsWith('**A Distinct Heading**')).toBe(false);
    expect(withHeading.text).toContain('Body text after the heading');
  });

  it('repeats a short trailing paragraph at the start of the next chunk for continuity', () => {
    // Two ordinary paragraphs and a short remark fit one chunk; the next paragraph is so long
    // that it cannot join them, so the chunk closes with the remark as its last paragraph.
    const bigNext = Array.from({ length: 4 }, (_, i) => para(20 + i)).join(' ');
    expect(bigNext.length).toBeGreaterThan(1900);
    expect(bigNext.length).toBeLessThan(2600);
    const chunks = chunksOf(
      `<!-- PAGE 1 -->\n<!-- SECTION: S -->\n${para(0)}\n\n${para(1)}\n\nA short closing remark about the section.\n\n${bigNext}\n`,
    );
    expect(chunks).toHaveLength(2);
    expect(chunks[0].text.endsWith('A short closing remark about the section.')).toBe(true);
    // ...and the same remark opens the next chunk, so the boundary has some shared context.
    expect(chunks[1].text.startsWith('A short closing remark about the section.')).toBe(true);
    expect(chunks[1].text).toContain('Paragraph 20 talks');
  });

  it('indexes Hindi text without losing combining marks', () => {
    const hindi = 'प्रकाश का संश्लेषण पौधों में होता है। यह प्रक्रिया क्लोरोफिल की उपस्थिति में सूर्य के प्रकाश से होती है।';
    const chunks = chunksOf(`<!-- PAGE 4 -->\n<!-- SECTION: प्रकाश संश्लेषण -->\n${hindi}\n`);
    expect(chunks[0].text).toBe(hindi);
    expect(chunks[0].sectionTitle).toBe('प्रकाश संश्लेषण');
  });

  it('handles an empty chapter and a body with only markers', () => {
    expect(chunksOf('')).toEqual([]);
    expect(chunksOf('<!-- PAGE 1 -->\n<!-- SECTION: Empty -->\n')).toEqual([]);
  });
});

describe('splitLongText', () => {
  it('returns short text untouched', () => {
    expect(splitLongText('Short.', 100)).toEqual(['Short.']);
  });

  it('splits at sentence ends within the limit and drops nothing', () => {
    const text = Array.from({ length: 40 }, (_, i) => `Sentence number ${i} ends here.`).join(' ');
    const parts = splitLongText(text, 200);
    expect(parts.length).toBeGreaterThan(5);
    expect(parts.every((p) => p.length <= 200)).toBe(true);
    expect(parts.join(' ').replace(/\s+/g, ' ')).toBe(text);
  });

  it('cuts an unbroken run-on hard rather than looping or dropping it', () => {
    const blob = 'x'.repeat(1000);
    const parts = splitLongText(blob, 300);
    expect(parts.every((p) => p.length <= 300)).toBe(true);
    expect(parts.join('')).toBe(blob);
  });

  it('keeps stray punctuation that is not a sentence', () => {
    const parts = splitLongText('... ' + 'word '.repeat(100), 120);
    expect(parts.join(' ').startsWith('...')).toBe(true);
  });
});
