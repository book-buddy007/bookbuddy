import { csvCell, toCsv } from './csv';

describe('csv', () => {
  it('quotes commas, quotes and newlines', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"');
    expect(csvCell('plain')).toBe('plain');
  });

  it.each(['=1+1', '+1', '-1+2', '@SUM(A1)', '\tx', '=HYPERLINK("http://evil.test","x")'])(
    'neutralises formula-like text %j',
    (text) => {
      expect(csvCell(text).replace(/^"/, '')).toMatch(/^'/);
    },
  );

  it('leaves real numbers alone, including negatives, but guards the same text as a string', () => {
    expect(csvCell(-5)).toBe('-5');
    expect(csvCell('-5')).toBe("'-5");
    expect(csvCell(Number.NaN)).toBe('');
  });

  it('renders dates, booleans and empties', () => {
    expect(csvCell(new Date('2026-10-04T00:00:00.000Z'))).toBe('2026-10-04T00:00:00.000Z');
    expect(csvCell(true)).toBe('Yes');
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
  });

  it('starts with a BOM and ends rows with CRLF', () => {
    const out = toCsv([['Name'], ['Asha']]);
    expect(out.startsWith('﻿')).toBe(true);
    expect(out).toBe('﻿Name\r\nAsha\r\n');
  });
});
