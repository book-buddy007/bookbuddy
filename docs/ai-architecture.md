# Varta: how Book Buddy indexes books and answers questions

Book Buddy does all of this itself. The only outside service it needs is OpenAI, and the only secret
is `OPENAI_API_KEY`. (The older route through a separate ingestion service is still in the code as
`INGESTION_MODE=trio`, see the last section; nothing deployed uses it.)

## The path of a book

```
chapter .md files (AI_EMBED format, one per chapter)      uploaded in the admin catalogue, stored in R2
        │  reads with the app's own storage credentials (private bucket, never over public HTTP)
        ▼
parseEnrichedMarkdown        rag/local/enriched-markdown.ts
        │  splits by page, section and typed block; figures/tables/worked examples stay whole;
        │  "SKIP FOR EMBEDDING" pages are left out; exercises and discussion prompts are marked
        │  retrieval_class=practice
        ▼
OpenAI embeddings            rag/providers/openai.embedding.provider.ts
        │  text-embedding-3-large, 1024 dimensions; each chunk is embedded with its chapter and
        │  section in front, but the stored text is the clean excerpt
        ▼
Qdrant collection book_buddy_chunks_v1      rag/local/local-indexer.service.ts
           dense vector + keyword (BM25-style) vector per passage, plus page / chapter / section payload
```

A question goes the opposite way: it is embedded with the same model, searched in Qdrant (dense and
keyword together, merged by reciprocal rank fusion, practice material excluded, locked to the
student's tenant and book), and the passages go to the chat model (`OPENAI_CHAT_MODEL`) which streams
the answer with page citations.

Indexing is all-or-nothing and safe to repeat. A new run writes its passages under a new `run_id`,
and only when every passage is stored does it delete the previous run. A failure at any point (bad
key, OpenAI outage, Qdrant down) leaves the old index exactly as it was.

## Settings

All in `docker-compose.coolify.yml`; values you change in Coolify override the file.

| Variable | Default | Notes |
|---|---|---|
| `OPENAI_API_KEY` | none | Set it in Coolify yourself. Without it the app runs but indexing and Varta report "not configured". |
| `OPENAI_CHAT_MODEL` | `gpt-4o-mini` | The answering model. Change any time, redeploy, no re-indexing. |
| `OPENAI_EMBED_MODEL` | `text-embedding-3-large` | Fixed together with the index (see below). |
| `EMBEDDING_DIMENSIONS` | `1024` | Fixed together with the index. |
| `QDRANT_COLLECTION_NAME` | `book_buddy_chunks_v1` | Names the index. |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | Only for a proxy or an OpenAI-compatible gateway. |
| `INGEST_REQUIRE_APPROVED` | off | `true` refuses chapters whose frontmatter is not `validation_status: APPROVED`. By default they index with a warning, because the super-admin is the validator. |
| `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_AI_TOKEN` | empty | Optional. Fallback answering model when OpenAI fails before it starts replying, and image descriptions. |
| `DAILY_AI_QUERY_LIMIT`, `VARTA_*_TOKENS` | 100 / 40000 / 60000 / 4000 | Per-student limits. |

## Changing the chat model

Edit `OPENAI_CHAT_MODEL` in Coolify and redeploy. Check the model id against the OpenAI models list
first; an unknown id fails with a clear "model not found" message in the chat and the log, not
silently.

## Changing the embedding model or dimensions

Never edit these in place. A question embedded one way cannot be compared with passages embedded
another, so the old index becomes meaningless, and the app refuses to start against a collection whose
vector size does not match, rather than quietly returning nonsense. To change:

1. Set a new `QDRANT_COLLECTION_NAME` (for example `book_buddy_chunks_v2`) together with the new
   model and dimensions, and redeploy. The empty collection is created on boot.
2. Re-index every book from the admin catalogue (Embed on each book).
3. Once all books show READY, the old collection can be deleted from Qdrant.

Until step 2 finishes, Varta has nothing to search in the new collection, so do it in one sitting.

## Bringing a book online

1. Upload each chapter's enriched markdown against the book (format AI_EMBED, with its part number).
2. In Edit Metadata: licence `AI_PERMITTED` and switch on "Enable AI indexing".
3. Trigger embedding. Progress and any error show in the catalogue; the same text is in the API log.
4. When the status is READY, ask Varta a question about a page in the book and open a citation.

A job is retried up to three times with backoff. A rejected key (401/403) or missing quota fails on
the first attempt with a student-safe message in the chat and the exact cause in the log.

## Checks and tests

```
cd backend
npx jest src/rag                 # parsing, indexing, providers, processor (no network needed)
npm run check:ai                 # real OpenAI key, models and Qdrant; spends a few cents
```

`local-index.integration.spec.ts` runs the real indexer and search against a real Qdrant (the one
from `docker-compose.yml` on port 6335) with OpenAI faked; it skips with a notice when Qdrant is not
running.

## Shared index: `INGESTION_MODE=trio`

Book Buddy can instead hand chapters to DigiClassroom and search the index shared with PDLMS and
DigiClassroom, so each book is embedded once for all apps. It needs changes on the DigiClassroom side
first; the steps and the trade-offs are in [shared-spine.md](shared-spine.md). Local mode stays the
default and keeps working untouched.
