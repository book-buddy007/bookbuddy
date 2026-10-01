# Enriched Markdown — STEM & Multilingual Authoring Guide

How to write the enriched `.md` files that are ingested into the vector store so
the app embeds them well and Varta answers accurately across **English, Hindi,
Sanskrit** and across **physics, chemistry, maths, biology, medicine**.

## The one mental model

The enriched markdown is **the substrate the AI reads** — it is embedded, chunked
and retrieved. It is **not** what the student sees: the reader renders the
**original PDF/EPUB** (real figures, real typeset equations) via pdf.js. So the
enriched file's job is to make every part of the page **retrievable and
answerable as text**, even the parts that were originally pictures.

Consequence: **anything that is only a picture is invisible to the model.** A
diagram, a graph, a geometry figure, a labelled apparatus — if you don't describe
it in words, the AI cannot answer about it. This is why the good files verbalize
every figure (see the biology sample: each `> **Fig. 10.2 …**` block is a full
prose description). Keep doing that for every subject.

## Equations & formulas — write them **twice**

Retrieval has two halves. Dense (semantic) embedding understands prose well and
LaTeX moderately. Lexical (BM25) retrieval **strips math symbols entirely**
(`=`, `+`, `∫`, `→`, `^`, `\frac`, `{}` all disappear before indexing). So an
equation given *only* as symbols is weakly retrievable, and a student asking in
words may never reach it.

**Rule: give every important equation a symbolic form AND a prose gloss.**

Good:

```
Newton's second law states that force equals mass times acceleration:
$$F = ma$$
where $F$ is the net force, $m$ the mass, and $a$ the acceleration.
```

- The **prose** ("force equals mass times acceleration") is what a natural-language
  question retrieves and what the model can fall back on.
- The **`$$…$$` LaTeX** is what displays as real typeset maths in Varta (the reader
  now renders KaTeX). Without the `$…$`/`$$…$$` delimiters it shows as raw source.

Delimiters:
- Inline maths: `$E = mc^2$`
- Display (own line): `$$\int_a^b f(x)\,dx = F(b) - F(a)$$`
- **Never** paste a bare `\frac{a}{b}` or `x^2` outside delimiters — it renders as
  literal backslashes.

## Chemistry

- **Prefer Unicode subscripts/superscripts** for formulae in prose: `H₂O`, `CO₂`,
  `Ca²⁺`. These normalize cleanly (`H₂O` → indexable as `h2o`) and display without
  KaTeX. Avoid LaTeX underscores in plain prose (`H_2O`) — they tokenize badly.
- **Reactions** as display LaTeX so arrows and states render:
  `$$6\mathrm{CO_2} + 6\mathrm{H_2O} \rightarrow \mathrm{C_6H_{12}O_6} + 6\mathrm{O_2}$$`
  and also name it in prose ("photosynthesis converts carbon dioxide and water
  into glucose and oxygen") for retrieval.
- Structural diagrams: describe them in words like any figure.

## Figures, diagrams, maps, geometry

Verbalize every one, exactly as the biology sample does:

```
> **Fig. 10.2 a and b — stages in mitosis** (p. 123)
> Four circular cell diagrams in sequence: (1) "Early Prophase" — …
```

- Keep the **label and page** on the first line (`Fig. 10.2`, `Table 3.1`,
  `Map 2`) — the app has a reference lookup that finds a figure by its label when
  a question names it, and that only works if the label text is present.
- Describe what the figure *shows and teaches*, not just that it exists. For
  geometry, state the given/known elements and relationships in words.

## Tables

Plain GitHub-flavoured markdown tables. They embed as text and now render as real
tables in Varta. Keep headers meaningful.

## Language (English / Hindi / Sanskrit)

- Set the frontmatter honestly: `medium` / `language` should match the body.
- **Write the prose in the book's own language.** A Hindi textbook's enriched file
  is written in Hindi; the app answers Hindi questions in Hindi by mirroring.
- **Keep technical terms, proper nouns, formulae and cited quotations in their
  original form** even inside translated prose — citations and figure lookups
  match on the original text.
- Devanagari is fully supported by the tokenizer (combining marks/matras are
  preserved). Hindi retrieves well.
- **Sanskrit caveat:** it embeds (shared Devanagari script) but the embedding
  model has weaker Sanskrit signal than Hindi/English. Lean harder on the
  **prose-gloss rule** for Sanskrit — give a translation/explanation alongside the
  śloka so retrieval has natural-language handles.

## What the sparse index keeps vs drops (quick reference)

| You write | Indexed as (lexical) | Verdict |
|---|---|---|
| `force = mass × acceleration` (prose) | `force`, `mass`, `acceleration` | ✅ retrievable |
| `F = ma` only | `ma` | ⚠️ weak — add prose |
| `H₂O` | `h2o` | ✅ |
| `H_2O` | `2o` | ❌ avoid |
| `$$\frac{1}{2}mv^2$$` only | `frac`, `mv` | ⚠️ weak — add prose |
| Figure described in words | every content word | ✅ retrievable |
| Figure left as an image ref only | nothing | ❌ invisible |

## Author checklist

- [ ] Every figure/table/map verbalized, with its label + page on the first line.
- [ ] Every key equation given as **symbolic LaTeX (`$…$`/`$$…$$`) + prose gloss**.
- [ ] Chemistry uses Unicode subscripts in prose; reactions in LaTeX + named in words.
- [ ] Prose is in the book's language; terms/quotes/formulae kept original.
- [ ] Sanskrit passages carry a prose translation/explanation.
- [ ] Frontmatter `medium`/`language`/`subject`/`class_level`/pages accurate.
- [ ] `validation_status: APPROVED` only after the above hold.
