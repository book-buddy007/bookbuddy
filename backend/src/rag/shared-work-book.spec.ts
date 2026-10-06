import { BadRequestException } from '@nestjs/common';
import { languageCode, newBookFromWork } from './shared-work-book';

const work = { title: 'Understanding Society', isbn: '978-93-5729-100-2', lang: 'English' };

describe('languageCode', () => {
  it('reads names and codes, in any case', () => {
    expect(languageCode('Hindi')).toBe('hi');
    expect(languageCode(' MARATHI ')).toBe('mr');
    expect(languageCode('ta')).toBe('ta');
    expect(languageCode('English')).toBe('en');
  });
  it('falls back to English for anything it does not know, or nothing', () => {
    expect(languageCode('Klingon')).toBe('en');
    expect(languageCode(null)).toBe('en');
    expect(languageCode(undefined)).toBe('en');
  });
});

describe('newBookFromWork', () => {
  it("takes the title, ISBN and language from the work, and the author from the admin", () => {
    expect(newBookFromWork(work, { author: '  NCERT  ' })).toEqual({
      title: 'Understanding Society',
      author: 'NCERT',
      isbn: '978-93-5729-100-2',
      language: 'en',
    });
  });

  it("uses the work's language, which an admin may override with a known one", () => {
    expect(newBookFromWork({ ...work, lang: 'Hindi' }, { author: 'A' }).language).toBe('hi');
    expect(newBookFromWork({ ...work, lang: 'Hindi' }, { author: 'A', language: 'en' }).language).toBe('en');
  });

  it('lets the title be overridden but never the ISBN', () => {
    const book = newBookFromWork(work, { author: 'A', title: ' Understanding Society (Class 9) ', isbn: '000' } as any);
    expect(book.title).toBe('Understanding Society (Class 9)');
    expect(book.isbn).toBe('978-93-5729-100-2');
  });

  it('keeps a missing ISBN missing', () => {
    expect(newBookFromWork({ ...work, isbn: null }, { author: 'A' }).isbn).toBeNull();
  });

  it('requires an author', () => {
    for (const author of [undefined, null, '', '   ', 42]) {
      expect(() => newBookFromWork(work, { author })).toThrow(BadRequestException);
    }
    expect(() => newBookFromWork(work, { author: 'x'.repeat(201) })).toThrow(/200 characters/);
  });

  it('refuses a language it does not offer, a non-text title, and a title that is too long', () => {
    expect(() => newBookFromWork(work, { author: 'A', language: 'klingon' })).toThrow(/must be one of/);
    expect(() => newBookFromWork(work, { author: 'A', language: 5 })).toThrow(/must be one of/);
    expect(() => newBookFromWork(work, { author: 'A', title: 7 })).toThrow(/must be text/);
    expect(() => newBookFromWork(work, { author: 'A', title: 'x'.repeat(301) })).toThrow(/300 characters/);
    expect(() => newBookFromWork({ ...work, title: '' }, { author: 'A' })).toThrow(/title is required/);
  });
});
