import { findInBookDefinition, normalizeTerm, type BookPassage } from './in-book-definition';

const p = (text: string, page: number | null, chapter: string | null = null): BookPassage => ({ text, page, chapter });

describe('normalizeTerm', () => {
  it('trims punctuation and case, and collapses spaces', () => {
    expect(normalizeTerm('  “Opportunity   Cost”, ')).toBe('opportunity cost');
    expect(normalizeTerm('Market.')).toBe('market');
  });

  it('refuses what cannot be a term: too short, too long, or a sentence', () => {
    expect(normalizeTerm('a')).toBeNull();
    expect(normalizeTerm('')).toBeNull();
    expect(normalizeTerm('x'.repeat(61))).toBeNull();
    expect(normalizeTerm('the price puzzle what drives the market today')).toBeNull();
  });
});

describe('findInBookDefinition', () => {
  const book: BookPassage[] = [
    p('In the last chapter we saw how people choose. Every choice has a cost.', 40, 'Chapter 8'),
    p('**Scarcity** is the situation where wants exceed the resources available to meet them. It shapes every economy.', 42, 'Chapter 8'),
    p('Scarcity is mentioned again here when we discuss prices.', 61, 'Chapter 9'),
    p('Why does scarcity matter for a farmer?', 70, 'Chapter 9'),
  ];

  it('picks the sentence that defines the term, with its page and chapter', () => {
    const r = findInBookDefinition(book, 'scarcity')!;
    expect(r.kind).toBe('definition');
    expect(r.text).toBe('Scarcity is the situation where wants exceed the resources available to meet them.');
    expect(r.page).toBe(42);
    expect(r.chapter).toBe('Chapter 8');
  });

  it('strips markdown from what it shows', () => {
    const r = findInBookDefinition([p('The **market** is a place where buyers and sellers meet. [See Fig 2](x)', 5)], 'market')!;
    expect(r.text).not.toMatch(/\*|\]\(/);
    expect(r.text).toMatch(/^The market is a place where buyers and sellers meet\./);
  });

  it('counts where else the book uses it, in page order', () => {
    const r = findInBookDefinition(book, 'Scarcity')!;
    expect(r.occurrences).toBe(3);
    expect(r.pages).toEqual([42, 61, 70]);
  });

  it('is a "mention" when nothing reads like a definition, and says where it is used', () => {
    const r = findInBookDefinition([p('Farmers sell wheat at the local mandi on market days.', 12)], 'mandi')!;
    expect(r.kind).toBe('mention');
    expect(r.page).toBe(12);
  });

  it('is null when the book never uses the term, or the selection is a sentence', () => {
    expect(findInBookDefinition(book, 'photosynthesis')).toBeNull();
    expect(findInBookDefinition(book, 'why does scarcity matter for a farmer today')).toBeNull();
  });

  it('matches whole words and plain endings, not parts of other words', () => {
    expect(findInBookDefinition([p('Taxes are compulsory payments to the government.', 3)], 'tax')?.page).toBe(3);
    expect(findInBookDefinition([p('The taxi waited outside the station for a long time.', 3)], 'tax')).toBeNull();
  });

  it('prefers a definition to an earlier plain use, and an earlier page to a later equal one', () => {
    const r = findInBookDefinition(
      [
        p('Inflation was discussed by the council last year in the town hall meeting.', 10),
        p('Inflation is a sustained rise in the general level of prices.', 90),
        p('Inflation is a sustained rise in the general level of prices in an economy.', 20),
      ],
      'inflation',
    )!;
    expect(r.kind).toBe('definition');
    expect(r.page).toBe(20);
  });

  it('recognises the other ways a book introduces a term', () => {
    const called = findInBookDefinition([p('When a country sells goods abroad it is called exports by economists.', 7)], 'exports')!;
    expect(called.kind).toBe('definition');
    const glossary = findInBookDefinition([p('Barter: exchange of goods without using money.', 8)], 'barter')!;
    expect(glossary.kind).toBe('definition');
    const termIs = findInBookDefinition([p('The term demand refers to what buyers are willing to purchase.', 9)], 'demand')!;
    expect(termIs.kind).toBe('definition');
  });

  it('does not take a question as the definition', () => {
    const r = findInBookDefinition([p('What is scarcity? It is the central problem of economics, as shown below.', 4)], 'scarcity')!;
    expect(r.text).not.toBe('What is scarcity?');
  });

  it('adds the next sentence when the first is only a lead-in', () => {
    const r = findInBookDefinition([p('Demand is defined as: the quantity buyers will purchase at each price in a given period.', 11)], 'demand')!;
    expect(r.text.length).toBeGreaterThan(30);
    const lead = findInBookDefinition([p('Supply is the term. It means the quantity sellers offer for sale at each price in the market.', 12)], 'supply')!;
    expect(lead.text).toMatch(/It means the quantity sellers offer/);
  });

  it('works for a multi-word term', () => {
    const r = findInBookDefinition([p('Opportunity cost is the value of the next best alternative that is given up.', 33)], 'Opportunity Cost')!;
    expect(r.kind).toBe('definition');
    expect(r.term).toBe('opportunity cost');
  });

  it('finds a Hindi term by its exact form, and a Hindi definition', () => {
    const r = findInBookDefinition([p('लोकतंत्र वह शासन प्रणाली है जिसमें जनता अपने प्रतिनिधि चुनती है। यह सबसे प्रचलित प्रणाली है।', 21)], 'लोकतंत्र')!;
    expect(r.kind).toBe('definition');
    expect(r.page).toBe(21);
    expect(findInBookDefinition([p('लोकतंत्रिक देशों में चुनाव होते हैं।', 22)], 'लोकतंत्र')).toBeNull();
  });

  it('shortens a very long sentence, and handles passages with no page', () => {
    const long = `Capital is ${'a very long description of everything that counts as capital, '.repeat(20)}end.`;
    const r = findInBookDefinition([p(long, null)], 'capital')!;
    expect(r.text.length).toBeLessThanOrEqual(520);
    expect(r.page).toBeNull();
    expect(r.pages).toEqual([]);
  });

  describe("lessons from real textbook text", () => {
    it("reads \"known as the <term>\" with its article as a definition", () => {
      const r = findInBookDefinition([p("The value of what is given up is known as the opportunity cost.", 184)], "opportunity cost")!;
      expect(r.kind).toBe("definition");
    });

    it("does not let a longer name borrow the definition: \"known as market demand\" does not define \"market\"", () => {
      const r = findInBookDefinition([p("The total quantity bought by all buyers at different prices is known as market demand, that is, the sum.", 197)], "market")!;
      expect(r.kind).toBe("mention");
    });

    it("needs the term to be the subject: a layer \"of the atmosphere\" does not define the atmosphere", () => {
      const r = findInBookDefinition([p("The uppermost layer of the atmosphere is known as the exosphere, characterised by very thin air.", 43)], "atmosphere")!;
      expect(r.kind).toBe("mention");
      expect(findInBookDefinition([p("The uppermost layer of the atmosphere is known as the exosphere, characterised by very thin air.", 43)], "exosphere")!.kind).toBe("definition");
    });

    it("still reads a short lead-in before the term (\"In economics, opportunity cost is the value ...\")", () => {
      expect(findInBookDefinition([p("In economics, opportunity cost is the value of the next best alternative given up.", 5)], "opportunity cost")!.kind).toBe("definition");
    });

    it("does not read \"is one of\" or a past-tense statement as a definition", () => {
      expect(findInBookDefinition([p("Elections are one of the most important processes for exercising democratic rights.", 161)], "election")!.kind).toBe("mention");
      expect(findInBookDefinition([p("These three major civilisations were the Mesopotamian, Egyptian and Chinese ones.", 77)], "civilisation")!.kind).toBe("mention");
    });

    it("does not offer a figure caption as what the book says", () => {
      const r = findInBookDefinition([p("4.18 — Timeline showing Harappan Civilisation (p. 75)", 75), p("The Harappan Civilisation flourished in the Indus valley around 2600 BCE.", 76)], "civilisation")!;
      expect(r.page).toBe(76);
    });

    it("prefers a full sentence to a heading, and to the tail of a sentence cut at a passage boundary", () => {
      const heading = findInBookDefinition([p("Composition and Structure of the Atmosphere", 40), p("Dust and smoke from burning fuel are found in the atmosphere in small amounts.", 41)], "atmosphere")!;
      expect(heading.page).toBe(41);
      const tail = findInBookDefinition([p("and 18 days to draft the world's longest written Constitution.", 140), p("The Constitution was adopted by the Constituent Assembly after long debate.", 141)], "constitution")!;
      expect(tail.page).toBe(141);
    });
  });

  it('copes with an empty book', () => {
    expect(findInBookDefinition([], 'market')).toBeNull();
    expect(findInBookDefinition([p('', 1)], 'market')).toBeNull();
  });
});
