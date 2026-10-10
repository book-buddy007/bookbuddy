# Deploy checklist: Book Buddy reading PDLMS books through the library hub

Do the steps in order. Each says who does it, how to check it worked, and how to undo it. Background and
the design are in `docs/shared-spine.md` ("PDLMS as the library hub") and PDLMS `docs/library-hub.md`.

**The design.** One library, uploaded and embedded once.

- **Embeddings** come from DigiClassroom. PDLMS stays in `trio` mode, so DigiClassroom embeds a book and writes its
  passages into the shared collection `trio_content_v1_openai3072`. Nobody re-embeds anything for the hub.
- **Files** (PDF, EPUB, MP3) stay in PDLMS and are streamed from it on every read, never copied. Only the cover is
  copied, once.
- **Book Buddy** reads passages straight from that Qdrant (read-only use) and keeps its own users, tiers,
  annotations and chat.
- **Two ids.** A book is known by PDLMS's id (`Book.hubWorkId`: files, the link record, unlinking) and by the id its
  passages carry in Qdrant (`Book.spineContentItemId`: DigiClassroom's `content_item_id`). They are different
  UUIDs. PDLMS tells Book Buddy the second one in the work's `index`; Book Buddy never guesses it.

**State on 10 Oct 2026.**

| | |
|---|---|
| PDLMS `main` | `9e1898b`, live: security round 2, hub API (off), "Share with Book Buddy" toggle |
| PDLMS `feat/hub-index-from-dcp` | `74afe4e`, **not pushed**: makes the hub work with DigiClassroom as the embedder (step 1) |
| Book Buddy `main` | `8b4aa1f`, live: hub client, streaming, unlink, create-from-shared-work. Hub **off** (no `HUB_*` variables) |
| Book Buddy `feat/hub-index-from-dcp` | this change: `hubWorkId`, link on the embedder's id, audio. Adds migration `20261010000000_book_hub_work_id` |

Nothing reaches users until step 7.

| # | Step | Who | Where | Undo |
|---|---|---|---|---|
| 0 | Book Buddy code and migration | whoever merges to `main` | Book Buddy | revert the merge (the migration is additive and can stay) |
| 1 | PDLMS: push `feat/hub-index-from-dcp` | PDLMS owner | PDLMS `main` | redeploy `9e1898b` |
| 2 | Check the books to be shared are embedded | PDLMS admin | PDLMS | n/a |
| 3 | Make Book Buddy's secret, turn the hub on | PDLMS owner | PDLMS env | empty `HUB_CLIENTS` |
| 4 | Share chosen books with `bookbuddy` | PDLMS super-admin | PDLMS | untick the book |
| 5 | Give Book Buddy a way to read Qdrant | server owner | server | detach the network |
| 6 | Check existing links | Book Buddy owner | Book Buddy DB (read) | n/a |
| 7 | Set the Book Buddy variables and redeploy | Book Buddy owner | Coolify | empty `HUB_URL` |
| 8 | Verify end to end | anyone | both | n/a |

---

## 0. Book Buddy code (merge to `main`)

Pushing `main` deploys through Coolify. Migration `20261010000000_book_hub_work_id` is additive: it adds
`Book.hubWorkId`, and `hubChapterId` / `hubSectionId` / `hubFileId` on the audiobook tables. It also back-fills
`hubWorkId` for any book already linked through the hub (from the work id on its streamed-file marker). Behaviour is
unchanged while `HUB_URL` is empty. Deploys run `prisma migrate deploy`.

- Check: Coolify shows the deployment healthy; `GET /health` answers `{"status":"ok"}`; the catalogue loads; the API
  log shows `migrate deploy` applying the migration.

## 1. PDLMS: push `feat/hub-index-from-dcp` (PDLMS owner)

The hub already on PDLMS `main` only understood PDLMS embedding with its own engine, so in `trio` mode it would report
every book as not searchable. This commit changes that:

- A book is `searchable` when it is `AI_PERMITTED`, `READY`, embedded into the current collection, and has a citation
  map. The old "must be `INGESTION_MODE=local`" rule is gone.
- `HubIndexService` finds DigiClassroom's `content_item_id` for the book (one mapped point is read back from Qdrant)
  and the work's `index` reports it.

Pushing to PDLMS `main` is a production deploy and needs `ALLOW_MAIN_PUSH=1`. There is no migration.

- Check: API healthy, an existing user can sign in, and `GET /api/hub/works` still answers **503** (code present, hub off).
- Undo: redeploy `9e1898b`.

## 2. Check the books to be shared are embedded (PDLMS admin)

Nothing to embed or re-embed for the hub. Each book to share needs: licence `AI_PERMITTED`, embedding status `READY`,
global (not an institution's book), not in the Bin. The "Share with Book Buddy" toggle (Library > book > Sharing)
warns about whichever condition is missing. Do **not** set `INGESTION_MODE=local` on PDLMS.

- Check: the toggle shows no readiness warning.

## 3. Make Book Buddy's secret and turn the hub on (PDLMS owner)

```bash
node backend/scripts/hub-client-secret.js bookbuddy
```

It prints a **SECRET** (shown once; give it to Book Buddy, never commit it) and a **HASH**. On the PDLMS API set:

```
HUB_CLIENTS={"bookbuddy":"<the HASH>"}
```

Redeploy. One secret per app: another app gets its own pair, added to the same JSON object.

- Check: `GET https://<pdlms-api>/api/hub/works` with no headers answers **401** (it was 503).
- Optional tuning: `HUB_RATE_LIMIT_PER_MINUTE` (default 120 per app), `HUB_AUTH_FAILURES_PER_MINUTE` (10 per IP).
- Undo: empty `HUB_CLIENTS`.

## 4. Share chosen books with Book Buddy (PDLMS super-admin)

Nothing is shared by default. Per book, in PDLMS: Library > the book > Sharing > **Share with Book Buddy**. (The API
behind it: `PUT /api/super-admin/catalog/books/<id>/hub-sharing {"apps":["bookbuddy"]}`.) Each change is audit-logged.

- Check: `GET .../hub-sharing` shows `servable: true`.
- Undo: untick it. Switching off is always allowed.

## 5. Give Book Buddy a way to read Qdrant (server owner)

Book Buddy reads passages straight from the Qdrant DigiClassroom writes (`trio-content-qdrant`, on the `coolify`
network, no API key today). Book Buddy's API is on its own network and cannot see it, and must **not** be attached to
the whole `coolify` network (that would reach every container on the server).

**Option A (do now; no downtime, no key).**

1. `docker network create trio-data`
2. Attach the running Qdrant to it: `docker network connect trio-data <trio-content-qdrant container>` (live, no restart).
3. Declare it for Book Buddy's API in its compose file: `networks: [default, trio-data]`, with `trio-data` as
   `external: true`. Do this only after step 1, because a missing network stops the deploy.

Only Qdrant and Book Buddy's API are on `trio-data`. Book Buddy never writes to this index, but nothing at the
Qdrant itself stops it, because there is no key yet.

**Option B (later).** Give Qdrant a full key and a separate read-only key (`QDRANT__SERVICE__API_KEY`,
`QDRANT__SERVICE__READ_ONLY_API_KEY`). This **restarts Qdrant**, and PDLMS and DigiClassroom need the full key set as
`QDRANT_API_KEY` first or they are cut off. Then give Book Buddy the read-only key as `SHARED_QDRANT_API_KEY`.

- Check: from Book Buddy's API container, `http://trio-content-qdrant:6333/collections` answers.
- Undo: detach the network (`docker network disconnect trio-data ...`).

## 6. Check existing links (Book Buddy owner)

Look first (read-only):

```sql
SELECT id, title, "spineContentItemId", "hubWorkId" FROM "Book"
WHERE ("spineContentItemId" IS NOT NULL OR "hubWorkId" IS NOT NULL) AND "deletedAt" IS NULL;
```

- No rows (expected): go to step 7.
- A row with `hubWorkId` empty was linked through DigiClassroom's older endpoints. It reads the same collection, so
  its passages keep working once the shared index is reachable, but it has no hub files and cannot be unlinked from
  the hub. It also blocks "Add from shared library" for the same work (one book per work). Leave it, or take it back
  to Book Buddy's own index (`docs/shared-spine.md`, "Going back for one book") and link it again to its PDLMS work.

## 7. Set the Book Buddy variables and redeploy (Book Buddy owner, in Coolify)

You enter the secrets; they are never put in the repository.

```
HUB_URL=https://api.pdlms.vinstitution.com           (https only)
HUB_SECRET=<the SECRET from step 3>
HUB_APP_ID=bookbuddy
SHARED_QDRANT_URL=http://trio-content-qdrant:6333
SHARED_QDRANT_COLLECTION=trio_content_v1_openai3072   (the default)
SHARED_EMBEDDING_DIMENSIONS=3072                      (the default)
OPENAI_API_KEY=<a key>                                (see below)
MEDIA_PROXY_ALLOWED_HOSTS=media.bookbuddy.live,<host of PDLMS's S3_ENDPOINT>
```

- `OPENAI_API_KEY`: Varta embeds each question to search the shared passages and answers with a chat model, so it
  cannot answer without one. `OPENAI_EMBED_MODEL` stays `text-embedding-3-large`, which at 3072 dimensions is the
  model the shared passages were embedded with; a different model would search the wrong space.
- **Using an OpenRouter key** (`sk-or-...`) instead of an OpenAI one: also set `OPENAI_BASE_URL=https://openrouter.ai/api/v1`.
  Without it the key is sent to OpenAI and rejected (401), so Varta cannot answer. The default models
  (`text-embedding-3-large` at 3072 dimensions, `gpt-4o-mini`) work through OpenRouter unchanged, and the embeddings are
  the same OpenAI vectors the shared passages were made with. Changing a Coolify variable needs **Deploy**, not Restart.
- `MEDIA_PROXY_ALLOWED_HOSTS` needs the **host of the signed links the hub returns** (PDLMS's storage endpoint, not
  its website). The PDF reader fetches through `/api/proxy-media`, which refuses unknown hosts, so without it
  reading a hub PDF fails with 403. (The audio player uses the link directly and does not go through the proxy.)
- `SHARED_QDRANT_API_KEY`: empty under Option A; the read-only key under Option B.
- **The collection is checked.** If PDLMS reports a work's passages in a different collection from
  `SHARED_QDRANT_COLLECTION`, linking is refused with both names in the message and nothing is recorded.

- Check: after redeploy, from `backend/` with the same variables: `npm run check:ai`. It must report the hub accepted
  this app and the shared collection (3072d). **Under Option A it also reports one `FAIL`**: "SHARED_QDRANT_API_KEY is
  not set". That is the missing read-only key, accepted for now; it clears with Option B.
- Undo: empty `HUB_URL` and `HUB_SECRET`. Book Buddy goes back to DigiClassroom's endpoints; hub-linked books keep
  their data, but their streamed files and audio stop working until it is set again.

## 8. Verify end to end

1. Super-admin, Catalogue: **Add from shared library**. The list shows only works shared with `bookbuddy` that are
   searchable. Pick one, enter the author, create. The progress dialog ends READY.
2. In the database, the new book has `hubWorkId` (PDLMS's id) and `spineContentItemId` (DigiClassroom's id), and they
   **differ**. If they are equal, something is wrong.
3. Open the book as a reader: the PDF/EPUB opens (streamed; a new 5-minute link each time) and a Varta question cites
   the right page. The cover is present.
4. If the work has audio: the book lists an audiobook; play a section in both voices. In the browser's network tab
   the audio comes from PDLMS's storage host. Leave a section playing past five minutes and seek: it must continue
   (the player asks for a new link before the old one lapses).
5. PDLMS side: `hub-sharing` for that book lists the Book Buddy record under `linkedBy`; the audit log has
   `HUB_LINK_CREATED` and `HUB_FILE_LINK` rows for `bookbuddy`, none containing a secret or a signed link.
6. Try **Unlink from shared library** on a test book ("Keep it here"): the dialog ends in "Taken off the shared
   library"; PDLMS shows `HUB_LINK_REMOVED` and the book is still shared and unchanged there. Its streamed files and
   hub audio are gone from Book Buddy; the citation map and cover stay.
7. Watch the Book Buddy API log for a few minutes: no repeated `Library hub request ... failed`.

## What can go wrong

| Symptom | Likely cause |
|---|---|
| "The library hub rejected this app's credentials" | `HUB_APP_ID` / `HUB_SECRET` do not match the hash in PDLMS `HUB_CLIENTS` |
| "The library hub is not enabled on the PDLMS server" | `HUB_CLIENTS` empty on PDLMS (step 3) |
| Works list is empty | nothing shared yet (step 4), or the works are not searchable (step 2; the toggle says why) |
| Link refused: "passages are in the collection X, but Book Buddy reads Y" | `SHARED_QDRANT_COLLECTION` differs from where DigiClassroom wrote the book (step 7) |
| Link refused: "cannot say where that work's passages are" | PDLMS could not find the book's passages in Qdrant (book has no citation map, or Qdrant unreachable from PDLMS): re-embed it on PDLMS |
| Link job fails: "no public passages could be read" | `SHARED_QDRANT_URL` wrong or the network missing (step 5) |
| A hub PDF opens blank or gives 403 | PDLMS storage host missing from `MEDIA_PROXY_ALLOWED_HOSTS` |
| Hub audio will not play | open `GET /api/audiobooks/sections/<id>/presign?gender=MALE` in the network tab: it carries the hub's reason (not shared, copy-protected, hub unreachable). If it returns a link, the browser could not load it from PDLMS's storage: check that bucket |
| Varta cannot answer | `OPENAI_API_KEY` missing (step 7) |
| A hub book has no cover (or an old one) | the cover is copied once, when the book is linked, so a storage problem at that moment (for example a wrong R2 secret) leaves it empty. Catalogue → the book's menu → **Refresh from library** copies it again, and brings the PDF/EPUB and audio entries up to date. A cover someone uploaded is never replaced; one copied from the library is |
| Read fails with the hub's reason | PDLMS un-shared, binned or deleted the book: unlink it in Book Buddy (Retire or Keep) |
| "linked through DigiClassroom, not PDLMS's hub" on Unlink | the book was linked the older way (step 6) |
| `HUB_URL must be https` | plain http is accepted only for localhost |

## Not covered yet

- **Audio transcripts and word alignment** for hub audio (the hub does not hold them). Hub tracks play, but
  the transcript panel and read-along are empty. Audio is mirrored when a book is linked; to pick up tracks PDLMS adds
  later, link it again (safe to repeat; listeners' progress and bookmarks keep their place).
- **Audio link lifetime.** Hub links last 5 minutes, against 15 for Book Buddy's own audio. The presign response
  carries `expiresAt`, and the web player's link cache drops a link 30 seconds before it ends and asks for a new one
  (including the prefetch of the next section). A link that lapses during a single long, unbroken stretch of
  buffering is recovered by the player's existing Retry. The mobile app does not play audiobooks yet.
- An admin screen for `hubAllowedApps` beyond the per-book toggle, "also used by" in the catalogue, noticing that
  PDLMS stopped sharing a book, and a hub search endpoint (reading Qdrant directly means a read-only key can see the
  whole collection).
