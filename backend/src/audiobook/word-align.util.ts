/**
 * Aligns a known reference transcript against an ASR transcription's own
 * word-level timestamps, so the reference text ends up with real timing
 * even when the ASR's wording differs slightly from the ground truth.
 *
 * This is the practical substitute for true phoneme-level forced alignment
 * (tools like the Montreal Forced Aligner or aeneas, neither of which has a
 * Node-usable implementation and both of which need a Python+acoustic-model
 * sidecar this deployment doesn't have): transcribe the actual audio with a
 * word-timestamped ASR model, then align its output back to the reference
 * text via a standard longest-common-subsequence technique. Not exact, but
 * robust to the kind of minor misheard-word ASR errors this is meant for.
 */

export interface RefWord {
  word: string;
  textOffset: number;
}

export interface AsrWord {
  word: string;
  startMs: number;
  endMs: number;
}

export interface AlignedWord {
  word: string;
  textOffset: number;
  startMs: number;
  endMs: number;
}

/** Splits reference text into words with their character offset in the original string. */
export function tokenizeReference(text: string): RefWord[] {
  const words: RefWord[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    words.push({ word: m[0], textOffset: m.index });
  }
  return words;
}

function normalize(w: string): string {
  return w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

/**
 * Longest-common-subsequence alignment between the reference words and the
 * ASR's words. Matched reference words take the ASR word's timing directly;
 * unmatched reference words (the ASR missed or misheard them) get a
 * timestamp interpolated between their nearest matched neighbors, so every
 * reference word ends up with *some* timing rather than a gap.
 *
 * O(n*m) — fine at the scale of one audiobook section (typically hundreds
 * to a couple thousand words), not designed for whole-book-at-once inputs.
 */
export function alignWords(
  refWords: RefWord[],
  asrWords: AsrWord[],
): AlignedWord[] {
  const n = refWords.length;
  const m = asrWords.length;

  if (n === 0) return [];
  if (m === 0) {
    // No ASR words at all — every reference word is unmatched; spread them
    // evenly across nothing meaningful is impossible, so surface zero
    // timing rather than a fabricated guess.
    return refWords.map((rw) => ({
      word: rw.word,
      textOffset: rw.textOffset,
      startMs: 0,
      endMs: 0,
    }));
  }

  const refNorm = refWords.map((w) => normalize(w.word));
  const asrNorm = asrWords.map((w) => normalize(w.word));

  const dp: Uint16Array[] = Array.from(
    { length: n + 1 },
    () => new Uint16Array(m + 1),
  );
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (refNorm[i - 1] && refNorm[i - 1] === asrNorm[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const matchRefToAsr = new Map<number, number>();
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    if (refNorm[i - 1] && refNorm[i - 1] === asrNorm[j - 1]) {
      matchRefToAsr.set(i - 1, j - 1);
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  const result: Array<{
    word: string;
    textOffset: number;
    startMs: number | null;
    endMs: number | null;
  }> = refWords.map((rw, idx) => {
    const asrIdx = matchRefToAsr.get(idx);
    if (asrIdx !== undefined) {
      return {
        word: rw.word,
        textOffset: rw.textOffset,
        startMs: Math.round(asrWords[asrIdx].startMs),
        endMs: Math.round(asrWords[asrIdx].endMs),
      };
    }
    return {
      word: rw.word,
      textOffset: rw.textOffset,
      startMs: null,
      endMs: null,
    };
  });

  for (let k = 0; k < result.length; k++) {
    if (result[k].startMs !== null) continue;

    let prev = k - 1;
    while (prev >= 0 && result[prev].startMs === null) prev--;
    let next = k + 1;
    while (next < result.length && result[next].startMs === null) next++;

    if (prev >= 0 && next < result.length) {
      const frac = (k - prev) / (next - prev);
      const prevEnd = result[prev].endMs as number;
      const nextStart = result[next].startMs as number;
      const t = Math.round(prevEnd + frac * (nextStart - prevEnd));
      result[k].startMs = t;
      result[k].endMs = t;
    } else if (prev >= 0) {
      result[k].startMs = result[prev].endMs;
      result[k].endMs = result[prev].endMs;
    } else if (next < result.length) {
      result[k].startMs = result[next].startMs;
      result[k].endMs = result[next].startMs;
    } else {
      result[k].startMs = 0;
      result[k].endMs = 0;
    }
  }

  return result as AlignedWord[];
}
