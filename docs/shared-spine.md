# One library, one set of embeddings: DigiClassroom, PDLMS and Book Buddy

Goal: a book is uploaded and embedded **once**, in DigiClassroom (DCP). PDLMS answers from those
embeddings, DCP's own tutor and Virat Gyankosh use them, and Book Buddy uses the same books and
embeddings in its library and Varta. Book Buddy never embeds a book that is already there.

## How it is arranged

```
DigiClassroom (owner, only writer)               shared Qdrant: trio_content_v1_openai3072
  upload book -> chunk -> embed (3072d) ---------------> passages (public / restricted)
  content.* tables: work, grants, source refs
        ^  ^                                                   ^           ^
        |  | service secret (HTTPS)                            |           | read-only
        |  +-- trio-works (browse public works)               |           |
        |  +-- trio-link  (attach a record to a work)    PDLMS reads   Book Buddy reads
        |  +-- trio-ingest (hand over a chapter)         (own network)  (read-only key)
        +--------------- Book Buddy ---------------------------------------+
```

- **Writing** to the shared index happens only inside DCP. Book Buddy asks; it never writes there.
- **Reading** is direct to Qdrant, as PDLMS does, but with a read-only key and, ideally, a network
  that holds nothing else (see "Server side").
- **Which book is which work** is stored on Book Buddy's own book record
  (`Book.spineContentItemId`), set only after DCP has confirmed it. No connection to the shared
  database is needed or used.

## Security rules built in

| Rule | Where |
|---|---|
| Only PUBLIC works can be listed or linked. A work with any restricted grant is invisible. | DCP `content-sharing.ts` |
| Only global-catalogue, AI-licensed books can be pushed INTO the shared index. An institution's own book can never be published to every app. | Book Buddy `shared-index-policy.ts`, checked when you press Embed and again in the job |
| Linking refuses a work whose ISBN differs from the book's, and refuses to repoint a record already linked to another work. | DCP `trio-link` |
| Deleting a book in Book Buddy never deletes anything from the shared index (other apps use it). | Book Buddy catalogue service |
| The service secret is compared in constant time, sent only in a header, never logged, and no redirect is followed with it. | DCP `service-secret.ts`, Book Buddy `shared-library.service.ts` |
| Search and the citation table only use passages marked `visibility: public`; a book with no linked work is refused rather than searched across the whole library. | Book Buddy `rag-search.service.ts`, `ingestion.processor.ts`, `content-spine.service.ts` |
| Book Buddy's connection to Qdrant is read-only by key, not only by convention. | Server side, below |

## Using it day to day

1. Upload and embed the book in **DigiClassroom**, as today.
2. In Book Buddy, make sure the book exists in the catalogue (its own record, cover, PDF/EPUB).
3. As super-admin, browse the shared library (`GET /api/shared-library/works?q=title`) and link:
   `POST /api/books/<bookId>/link-shared-work {"contentItemId": "<work id>"}`.
   Book Buddy asks DCP to link, reads the passages back to build its citation table, then marks the
   book READY. No embedding is done and no OpenAI cost is incurred beyond questions and answers.
4. Varta in Book Buddy now answers from the same passages as PDLMS and the DCP tutor.

For a NEW global book uploaded in Book Buddy instead, pressing Embed sends it to DCP (the book must
be global-catalogue and AI-licensed). DCP embeds it once; PDLMS and DCP can then use it too.

## Switch-over, in this order

### DigiClassroom (a production deploy of another app)
1. Apply migration `011_accept_bookbuddy_source_app.sql` to the `trio` database (superuser). It only
   widens two CHECK constraints, so it is safe while old code runs.
2. Deploy DCP branch `feat/accept-bookbuddy-source` (accepts `bookbuddy`, adds `trio-works` and
   `trio-link`). Deploying before step 1 is the one unsafe order.

### Server side
3. **Qdrant keys.** Today the shared Qdrant answers without any key to anything on its network.
   Give it a full key and a separate read-only key (Qdrant settings `QDRANT__SERVICE__API_KEY` and
   `QDRANT__SERVICE__READ_ONLY_API_KEY`). Set the full key as `QDRANT_API_KEY` for DCP and PDLMS
   FIRST (they already read that variable), then enable the keys on Qdrant, so nothing is cut off.
4. **Network.** Book Buddy's API is on its own network and cannot see Qdrant. Do not attach it to the
   shared `coolify` network: that would let it reach every container on the server. Instead create
   a small network holding only Qdrant and Book Buddy's API, e.g. `docker network create trio-data`,
   connect `trio-content-qdrant` to it, and declare it for the API service in the compose file
   (`networks: [default, trio-data]`, with `trio-data` marked `external: true`). The compose file
   does not declare it yet, because a missing network stops the deploy.

### Book Buddy
5. Apply the new database migration (`20261006000000_book_spine_content_item`); deploys run it.
6. Set in Coolify (you enter the secrets):
   ```
   INGESTION_MODE=trio
   QDRANT_URL=http://trio-content-qdrant:6333
   QDRANT_COLLECTION_NAME=trio_content_v1_openai3072
   QDRANT_ALLOW_COLLECTION_CREATE=false
   EMBEDDING_DIMENSIONS=3072
   QDRANT_API_KEY=<the READ-ONLY key>
   TRIO_INGEST_URL=https://api.dgcl.vinstitution.com/api/internal/trio-ingest
   TRIO_SERVICE_SECRET=<same value as DigiClassroom's>
   ```
   `OPENAI_EMBED_MODEL` stays `text-embedding-3-large`: at 3072 dimensions it is the model the shared
   passages were embedded with; a different model would search the wrong space. Keep
   `QDRANT_ALLOW_COLLECTION_CREATE=false` so a wrong address can never create an empty collection.
7. Redeploy, run `npm run check:ai` from `backend/`, then link a book.

Going back: set `INGESTION_MODE=local` and redeploy; Book Buddy's own index is untouched.

## What this does not cover yet (decide before relying on it)

- **Institution-private books** cannot use shared mode. Nothing in the shared index can hide a book
  from other apps, so those must stay in Book Buddy's own index. Today the mode is one switch for
  the whole app; serving shared books and private books side by side needs each book routed to the
  right index, which touches Varta search, graph, quiz, digest and text adaptation. Not built.
- **DigiClassroom's own search does not filter by `visibility` or `grant_org_ids` at query time**
  (the fields are written but nothing reads them). That is why only fully public works are shared
  from Book Buddy. Fixing it in DCP would let restricted books be shared safely later.
- **Removing a work** from the shared library is done in DCP; Book Buddy only drops its own record.
- **PDLMS** deletes shared points directly when its own purge URL is unset (its audit finding
  PDLMS-018); that is PDLMS's to fix and applies equally to books Book Buddy has linked.
- Book Buddy's catalogue has no screen yet for the browse-and-link steps; they are API calls.
- The 4 works now in the shared index: titles not confirmed from here.
