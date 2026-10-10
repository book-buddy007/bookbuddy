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
      // DigiClassroom's works carry none of the hub's extras.
      format: 'pdf',
      publisher: null,
      publishYear: null,
      pages: null,
      description: null,
    });
  });

  describe('from PDLMS’s hub, which holds the whole record', () => {
    const hubWork = {
      ...work,
      author: 'NCERT',
      publisher: ' NCERT ',
      publishYear: 2024,
      pages: 180,
      description: ' A textbook. ',
      formats: ['epub', 'audiobook'],
    };

    it('needs nothing typed: author, publisher, year, pages, description and format all come from the work', () => {
      expect(newBookFromWork(hubWork, {})).toEqual({
        title: 'Understanding Society',
        author: 'NCERT',
        isbn: '978-93-5729-100-2',
        language: 'en',
        format: 'epub', // the first rendition it holds, in the order pdf, epub, audiobook
        publisher: 'NCERT',
        publishYear: 2024,
        pages: 180,
        description: 'A textbook.',
      });
    });

    it('lets the admin’s author win over the work’s', () => {
      expect(newBookFromWork(hubWork, { author: ' Someone Else ' }).author).toBe('Someone Else');
    });

    it('is an audiobook only when that is all it holds, and a pdf when the formats are unknown', () => {
      expect(newBookFromWork({ ...hubWork, formats: ['audiobook'] }, {}).format).toBe('audiobook');
      expect(newBookFromWork({ ...hubWork, formats: [] }, {}).format).toBe('pdf');
      expect(newBookFromWork({ ...hubWork, formats: ['pdf', 'epub'] }, {}).format).toBe('pdf');
    });

    it('drops values that cannot be right instead of saving them', () => {
      const b = newBookFromWork({ ...hubWork, publishYear: 24, pages: -3, publisher: '   ' }, {});
      expect([b.publishYear, b.pages, b.publisher]).toEqual([null, null, null]);
    });

    it('still asks for an author when the work has none', () => {
      expect(() => newBookFromWork({ ...hubWork, author: null }, {})).toThrow(/does not hold one/);
      expect(() => newBookFromWork({ ...hubWork, author: '  ' }, {})).toThrow(BadRequestException);
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
