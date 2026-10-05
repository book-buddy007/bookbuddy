# Using the shared book index (DigiClassroom's spine)

Book Buddy can run in two ways; pick one per deployment with `INGESTION_MODE`.

| | `local` (default) | `trio` (shared) |
|---|---|---|
| Who embeds a chapter | Book Buddy, with its own OpenAI key | DigiClassroom (DCP), with its key |
| Where passages live | Book Buddy's own Qdrant, `book_buddy_chunks_v1`, 1024 dimensions | The shared Qdrant, `trio_content_v1_openai3072`, 3072 dimensions |
| Books visible to other apps | No | Yes: PDLMS and DCP read the same passages |
| Needs DCP running to index | No | Yes |
| Book Buddy's OpenAI key is used for | indexing, questions, answers | questions and answers only |

DCP is the only writer to the shared spine. Book Buddy never writes to the shared Qdrant or the
shared database; it asks DCP to ingest, and reads.

## Why this did not work before

Book Buddy identifies itself to DCP as `bookbuddy`. DCP refused that name in its ingestion route,
its `SourceApp` type and two database CHECK constraints, so a Book Buddy chapter could never be
registered. The DCP side is fixed on branch `feat/accept-bookbuddy-source` (DigiClassroomPro repo,
migration `011_accept_bookbuddy_source_app.sql`). It is committed there but **not applied and not
deployed**.

## Switch-over, in this order

1. **DCP database (superuser):** apply migration 011 to the `trio` database. This only widens two
   CHECK constraints; running code is unaffected. Update the Applied column in
   `trio-migrations/README.md` in the same commit.
2. **DCP deploy:** merge and deploy the branch. Deploying before step 1 is the one unsafe order.
3. **Read-only login for Book Buddy (superuser):** a `book_buddy_content_reader` role on the `trio`
   database with `USAGE` on schema `content` and `SELECT` on `content_chunk`, `content_grant`,
   `content_item`, `content_source_ref`: exactly what `pdlms_content_reader` has (see lines 777-822
   and 878 of `000_baseline_20260807.sql`). Nothing else, so a write is refused by the database.
4. **Network:** the Book Buddy API container must reach DCP's API, the shared Qdrant
   (`trio-content-qdrant:6333`) and the trio Postgres by internal name. Coolify keeps stacks apart
   unless the app is attached to the shared `coolify` network.
5. **Coolify variables for Book Buddy** (you enter the secrets yourself):

   ```
   INGESTION_MODE=trio
   QDRANT_URL=http://trio-content-qdrant:6333
   QDRANT_COLLECTION_NAME=trio_content_v1_openai3072
   QDRANT_ALLOW_COLLECTION_CREATE=false
   EMBEDDING_DIMENSIONS=3072
   TRIO_INGEST_URL=<DCP's address>/api/internal/trio-ingest
   TRIO_PURGE_URL=<DCP's purge address, if it exists>
   TRIO_SERVICE_SECRET=<the same value DCP has>
   TRIO_CONTENT_DATABASE_URL=postgres://book_buddy_content_reader:<password>@<host>:5432/trio
   ```

   `OPENAI_EMBED_MODEL` stays `text-embedding-3-large`; at 3072 dimensions it is the model the shared
   passages were embedded with. A different model would return answers from the wrong part of the
   space. Keep `QDRANT_ALLOW_COLLECTION_CREATE=false` so a wrong `QDRANT_URL` can never create an
   empty collection on the wrong server.
6. **Redeploy Book Buddy, then check:** `npm run check:ai` from `backend/` with the same variables
   confirms OpenAI and that the collection is 3072-dimensional with the `bm25` keyword vector.
7. **Index a book:** in the admin catalogue, upload chapters, enable AI indexing and press Embed.
   DCP stores the chapters, embeds them, and Book Buddy rebuilds its citation table from the result.

## Linking books that already exist in the shared index

The shared index currently holds 4 works that belong to PDLMS or DCP records. To open one in Book
Buddy, the spine needs a `content_source_ref` row (`app='bookbuddy'`, `local_id=<Book Buddy book
id>`) pointing at that work's `content_item_id`, and Book Buddy needs a Book with the same title.
The reader login cannot write, so these rows are created from DCP's side once migration 011 is
applied. Do this per book, after confirming which work is which.

## Going back

Set `INGESTION_MODE=local` (and remove the shared overrides) and redeploy. The local index is
untouched by trio mode, so books indexed locally answer again immediately.

## Limits to know

- In trio mode Varta searches by book. A book with no `content_source_ref` row is refused rather
  than answered from the whole library.
- Local mode's tenant lock is not applied to the shared collection; visibility there is controlled
  by DCP's own fields (`visibility`, `grant_org_ids`).
- Chat answers still come from Book Buddy's `OPENAI_CHAT_MODEL`.
