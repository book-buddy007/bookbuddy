# One library, one set of embeddings: DigiClassroom, PDLMS and Book Buddy

Goal: a book is uploaded and embedded **once**, in DigiClassroom (DCP). PDLMS answers from those
embeddings, DCP's own tutor and Virat Gyankosh use them, and Book Buddy uses the same books and
embeddings in its library and Varta. Book Buddy never embeds a book that is already there.

Books that must stay private to an institution are not shared. They live in Book Buddy's own index,
side by side with the shared ones, and each book is routed to the right one automatically.

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
                            |
                            +-- its OWN Qdrant: book_buddy_chunks_v1 (private books, read/write)
```

**Every book lives in exactly one of the two indexes, and that is recorded on the book**
(`Book.spineContentItemId`: set = shared library, empty = Book Buddy's own). Search, citations,
page maps, graph, quiz, digest, chapter recap and paragraph simplification all ask the book where it
lives (`ContentSpineService.resolveIndex`) and use that index, at that index's vector width:

| | Book Buddy's own index | Shared library |
|---|---|---|
| Written by | Book Buddy (OpenAI embeddings, 1024d) | DigiClassroom only (3072d) |
| Book Buddy's access | read and write | read-only key |
| Search locked to | the book and its tenant | the book's work, public passages only |
| Used for | institution-private books, and anything not shared | books meant for everyone |
| Deleting a book | removes its passages and files | not possible from Book Buddy: only DigiClassroom can remove it |

Nothing is decided per request from an environment flag, and nothing falls back from one index to
the other: a shared book while the shared library is unreachable is refused, never answered from
Book Buddy's (empty) index; a book that cannot be resolved is refused, never searched across the
library.

## Security rules built in

| Rule | Where |
|---|---|
| Only PUBLIC works can be listed or linked. A work with any restricted grant is invisible. | DCP `content-sharing.ts` |
| Only global-catalogue, AI-licensed books are handed to DigiClassroom. Every other book is embedded into Book Buddy's own index instead, so an institution's book can never become readable by every app. | `shared-index-policy.ts`, decided in the ingestion job |
| Linking refuses a work whose ISBN differs from the book's, and refuses to repoint a record already linked to another work. | DCP `trio-link` |
| A shared-library book cannot be moved to the Bin, purged, or have a file deleted or replaced from Book Buddy; the catalogue hides those controls and the backend refuses the calls. Only DigiClassroom removes a shared book. | `book-deletion-policy.ts`, catalogue service |
| Every read of the shared library asks for `visibility: public` (searches, figure lookup, page map, graph, citation table, and reads by id are re-checked). | `ContentSpineService`, `readablePoints` |
| Book Buddy's connection to the shared library is read-only by key, and `npm run check:ai` proves it by attempting a write that must be refused. | server side, below |
| Book Buddy's own and the shared Qdrant use separate settings, so a wrong `QDRANT_URL` can never point Book Buddy's writes at the shared library. | `index-config.ts` |
| The service secret is compared in constant time, sent only in a header, never logged, and no redirect is followed with it. | DCP `service-secret.ts`, `shared-library.service.ts` |
| A boot-time check of the shared collection (width, keyword vector) never stops the app: a problem only refuses the books that need it. | `qdrant-init.service.ts` |

## Using it day to day

1. Upload and embed the book in **DigiClassroom**, as today.
2. In Book Buddy, make sure the book exists in the catalogue (its own record, cover, PDF/EPUB).
3. As super-admin, open Super Admin > Catalogue, use the book's menu > **Link to shared library**, search
   the shared library (it starts with the book's own title), pick the work and press **Link this book**.
   The screen shows ISBN matches and refuses a mismatch, and a progress dialog follows the link. (The same
   steps are available as `GET /api/shared-library/works?q=title` and
   `POST /api/books/<bookId>/link-shared-work {"contentItemId": "<work id>"}`.)
   Book Buddy asks DCP to link, checks it can read the passages, switches the book to the shared
   library and removes the book's now-unused passages from its own index. No embedding, no OpenAI
   cost beyond questions and answers.
4. Varta in Book Buddy now answers from the same passages as PDLMS and the DCP tutor.

**Shortcut: create the Book Buddy book from the work.** For a book that exists in DigiClassroom or PDLMS
but not yet in Book Buddy, skip steps 2–3: on Super Admin > Catalogue press **Add from shared library**, pick
the work, type the author (the shared library holds none), check the title and language, and press
**Create and link**. Book Buddy confirms the work with DigiClassroom (it must be public), creates the book in
the global catalogue with the work's ISBN, and queues the link; if the link cannot be queued the new book is
removed again. A work Book Buddy already has a book for cannot be picked twice. The PDF/EPUB and cover are
**not** copied (they live in the other app's storage): upload them to the new book afterwards. The new book
is visible in the catalogue as soon as it is created, like any book made with the wizard.
(`POST /api/shared-library/create-book {"contentItemId", "author", "title"?, "language"?}`.)
Looking up a single work by id uses DigiClassroom's `trio-works?id=`, from the same DigiClassroom branch;
against a DigiClassroom without it, Book Buddy picks the work out of the list instead.

Pressing **Embed** on a book in Book Buddy:
- `INGESTION_MODE=local` (default): always embedded here.
- `INGESTION_MODE=trio`: a global, AI-licensed book is handed to DCP (embedded once for all apps);
  every other book is embedded here.

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
4. **Network.** Book Buddy's API is on its own network and cannot see the shared Qdrant. Do not
   attach it to the shared `coolify` network: that would let it reach every container on the
   server. Create a small network holding only that Qdrant and Book Buddy's API, e.g.
   `docker network create trio-data`, connect `trio-content-qdrant` to it, and declare it for the
   API service in the compose file (`networks: [default, trio-data]`, with `trio-data` marked
   `external: true`). The compose file does not declare it yet, because a missing network stops
   the deploy.

### Book Buddy
5. Apply the database migration (`20261006000000_book_spine_content_item`); deploys run it.
6. Set in Coolify (you enter the secrets). Book Buddy's own Qdrant settings stay as they are.
   ```
   SHARED_QDRANT_URL=http://trio-content-qdrant:6333
   SHARED_QDRANT_API_KEY=<the READ-ONLY key>
   SHARED_QDRANT_COLLECTION=trio_content_v1_openai3072     (default)
   SHARED_EMBEDDING_DIMENSIONS=3072                        (default)
   TRIO_INGEST_URL=https://api.dgcl.vinstitution.com/api/internal/trio-ingest
   TRIO_SERVICE_SECRET=<same value as DigiClassroom's>
   INGESTION_MODE=trio                                     (only if new global books should go to DCP)
   ```
   `OPENAI_EMBED_MODEL` stays `text-embedding-3-large`: asked for 3072 dimensions it is the model the
   shared passages were embedded with; a different model would search the wrong space.
7. Redeploy, run `npm run check:ai` from `backend/` with the same variables (it also checks the
   shared collection and that the key is read-only), then link a book.

Going back for one book: with `INGESTION_MODE=local` (or for a book that is not global and AI-licensed),
re-embed it in Book Buddy from its own chapter markdown and it returns to the own index. For
everything: leave `SHARED_QDRANT_URL` empty; own-index books are untouched either way.

## What this does not cover

- **DigiClassroom's own search does not filter by `visibility` or `grant_org_ids` at query time**
  (the fields are written but nothing reads them). That is why only fully public works are shared
  from Book Buddy. Fixing it in DCP would let restricted books be shared safely later.
- **Removing a shared book** is done only in DigiClassroom. Book Buddy cannot even drop its own record of it; to stop
  showing it, make it unavailable. That rule is enforced in Book Buddy's code. If the three apps share one R2 bucket, also
  give PDLMS and Book Buddy an R2 key that is **Object Read only** on it, so the rule holds at the storage level too and a
  bug or a leaked key in either app still cannot delete a file. Annotations stay in each app's own database and bucket.
- **PDLMS** deletes shared points directly when its own purge URL is unset (its audit finding
  PDLMS-018); that is PDLMS's to fix and applies equally to books Book Buddy has linked.
- Unlinking a book from the shared library has no button: it needs `INGESTION_MODE=local` and a re-embed from the
  book's own chapter markdown, as described above. While `INGESTION_MODE=trio`, re-embedding an eligible book
  sends it to DigiClassroom again.
- The 4 works now in the shared index: titles not confirmed from here.
