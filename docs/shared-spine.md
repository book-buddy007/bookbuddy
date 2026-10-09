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

## PDLMS as the library hub (replaces DigiClassroom as the owner)

PDLMS can lend its global books to Book Buddy through its hub API (PDLMS `docs/library-hub.md`):
catalogue, files and manifests. The **passages are still DigiClassroom's**: PDLMS stays in `trio` mode,
DigiClassroom embeds each book once and writes it to the shared collection `trio_content_v1_openai3072`,
and Book Buddy reads it from there exactly as it does for a book linked the older way. Book Buddy
uploads nothing and embeds nothing for those books. It is **off until `HUB_URL` and `HUB_SECRET` are
set**; while they are empty everything above (DigiClassroom's `trio-works` / `trio-link`) is
unchanged. The choice is made per call from the configuration.

**Two ids per hub book.** `Book.hubWorkId` is PDLMS's id for the work (its files, its link record,
unlinking). `Book.spineContentItemId` is the `content_item_id` the passages carry in Qdrant, which is
DigiClassroom's and is a *different* UUID. The hub reports the second in the work's `index`
(`{collection, contentItemId}`); the link job refuses, without recording anything, if `index` is missing
or names a collection other than `SHARED_QDRANT_COLLECTION`. Every Qdrant read filters on
`spineContentItemId`; every call to the hub uses `hubWorkId`. Never send one where the other belongs.

What changes when it is on:

| | DigiClassroom (above) | PDLMS hub |
|---|---|---|
| Browse and link | `trio-works`, `trio-link`, one secret shared by all apps | `/api/hub/works`, `/works/:id`, `/works/:id/link`, one secret for Book Buddy only |
| Passages | shared Qdrant `trio_content_v1_openai3072` | the same collection; the id to read them by comes from the hub's `index` |
| PDF / EPUB | upload them to the Book Buddy book afterwards | **streamed from PDLMS on every read, never copied** |
| Audiobook | upload the tracks afterwards | chapters, sections and tracks are mirrored when the book is linked (rows marked `hubChapterId` / `hubSectionId` / `hubFileId`, empty `fileUrl`); each play asks the hub for a fresh link |
| Cover | upload afterwards | copied once into Book Buddy's own public bucket (a small display image; never replaces a cover you set) |
| Who may see a book | public in the shared index | only books PDLMS super-admin listed for `bookbuddy` (`hubAllowedApps`), global, not binned |

**Reading a hub book.** Linking leaves a marker on the book (a PDF/EPUB `BookFormat` row with no file
URL and `metadata.hub`), so the catalogue shows the format and its size. When someone opens the book,
Book Buddy first applies its own rules (tier, institution, borrowing), then asks the hub for a fresh
five-minute link and returns it in the usual shape (DRM-wrapped if the book is protected). Nothing is
stored. If the hub cannot answer, the read fails with the hub's reason: there is no other copy. A file
Book Buddy holds itself always wins over the hub's. Hub books cannot be binned, purged or have files
deleted from Book Buddy (the same rule as any shared-library book): only PDLMS removes them.

**Taking a book off the library (unlink).** Super-admin, Catalogue > the book's menu > **Unlink from shared
library** (offered only when the library is PDLMS's hub; DigiClassroom has no unlink). Pick one outcome:

- **Retire it** unlinks and moves the book to the Bin in one step, so a half-retired book is never left behind.
  It can be restored from the Bin, but it is no longer linked.
- **Keep it here** unlinks and keeps the book: its details and cover stay, but it has no files or index until
  you upload and embed them yourself. If it has no readable file of its own, borrowing is paused
  (`available=false`; note that `available` only stops borrowing, it does not hide a book).

It runs as a background job (`unlink-work`, `POST /api/books/:id/unlink-shared-work {"outcome": "retire"|"keep"}`),
and the dialog follows it. In order: (1) tell the hub, which removes only Book Buddy's own link record at PDLMS
(never the work, its files or its embeddings); (2) in one transaction, clear the book's link and "ready" state and
delete only the hub marker rows and the hub's audio (and, for Retire, bin the book); (3) forget cached state; (4) write an audit row.
The hub goes first because it can be repeated safely and the local step is the one that is hard to take back, so
every step can be run again: if the job fails, the book is left exactly as it was (still linked) with the reason
shown, and "Try again" finishes it. A hub that refuses (a record linked to a different work) stops the job without
retrying. Only one job runs per book at a time (not while it is being linked or embedded).

Kept on purpose: the book's own files and its copied cover, readers' annotations, progress and chat history, and
the citation map (so old chat citations still jump to the right page). Readers lose the streamed PDF/EPUB and Varta
can no longer answer from the book. A book can be linked again afterwards.

Not covered yet: **audio transcripts and word alignment** for hub books (the hub does not hold them), "also used by" in the catalogue, noticing that
PDLMS has stopped sharing a book (reads fail with the hub's reason until an admin unlinks it), and a hub search
endpoint (passages are read straight from Qdrant, which with a read-only key can see the whole collection).

### Turning it on

The step-by-step checklist, with checks and undo for each step, is [`docs/deploy-hub.md`](deploy-hub.md). In short:

1. PDLMS: push its `feat/hub-index-from-dcp` (no migration; the hub itself, with migration
   `20261007120000_add_library_hub`, is already live and off), make Book Buddy's secret
   (`node backend/scripts/hub-client-secret.js bookbuddy` in PDLMS), set the printed **HASH** as
   `HUB_CLIENTS={"bookbuddy":"<hash>"}` on the PDLMS API, and give Book Buddy the **SECRET**. PDLMS stays in
   `trio` mode; do not set `INGESTION_MODE=local`. Then, per book, tick **Share with Book Buddy** in PDLMS
   (also needs licence `AI_PERMITTED`, embedding `READY`, a citation map).
2. Qdrant: Book Buddy reads the same shared Qdrant it would for a DigiClassroom-linked book. Give its API a
   path to it as in "Switch-over" above (steps 3 and 4): a small `trio-data` network now, a read-only key
   later. Do not attach Book Buddy to the whole `coolify` network.
3. Book Buddy, set in Coolify (you enter the secrets):
   ```
   HUB_URL=https://api.pdlms.vinstitution.com
   HUB_SECRET=<the SECRET from step 1>
   HUB_APP_ID=bookbuddy
   SHARED_QDRANT_URL=http://trio-content-qdrant:6333     SHARED_QDRANT_API_KEY=<read-only key, once there is one>
   SHARED_QDRANT_COLLECTION=trio_content_v1_openai3072   SHARED_EMBEDDING_DIMENSIONS=3072     (the defaults)
   OPENAI_API_KEY=<a key>                                 (Varta cannot answer without it)
   MEDIA_PROXY_ALLOWED_HOSTS=media.bookbuddy.live,<PDLMS's storage host>
   ```
   The last one is needed because the PDF reader fetches signed links through `/api/proxy-media`, which
   refuses hosts it does not know; the host to add is the one in a link the hub returns.
4. Redeploy, run `npm run check:ai` from `backend/` (it also checks the hub accepts this app and that the
   shared Qdrant is reachable; without a read-only key it reports that one gap), then link a book as in
   "Using it day to day".

The shared collection is the same one DigiClassroom-linked books already read, so books linked the older way
keep working. They stay DigiClassroom-linked: no hub files, and no Unlink from the hub (their `hubWorkId` is
empty). To move one over, take it back to Book Buddy's own index ("Going back for one book" above) and link it
again, from the screen, to its PDLMS work.

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
