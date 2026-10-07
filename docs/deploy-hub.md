# Deploy checklist: Book Buddy reading PDLMS books through the library hub

Do the steps in order. Each says who does it, how to check it worked, and how to undo it. Background and
the design are in `docs/shared-spine.md` ("PDLMS as the library hub") and PDLMS `docs/library-hub.md`.

**State on 7 Oct 2026.** The Book Buddy side is merged to `main` (step 0) and **inert**: with `HUB_URL`
empty it behaves exactly as before. The PDLMS side exists only on local branches and has to be deployed
by whoever holds PDLMS's credentials (steps 1 to 3). Nothing reaches users until step 7.

| # | Step | Who | Where | Undo |
|---|---|---|---|---|
| 0 | Book Buddy code (hub client, streaming, unlink) | done by the merge to `main` | Book Buddy | revert the merge |
| 1 | PDLMS code: security, engine, hub | PDLMS owner | PDLMS `main` | redeploy the previous commit |
| 2 | PDLMS embeds the books it will share | PDLMS admin | PDLMS | `INGESTION_MODE=trio` |
| 3 | Make Book Buddy's secret, turn the hub on | PDLMS owner | PDLMS env | empty `HUB_CLIENTS` |
| 4 | Share chosen books with `bookbuddy` | PDLMS super-admin | PDLMS | empty the book's list |
| 5 | Read-only key and network to PDLMS's Qdrant | server owner | server | detach the network |
| 6 | Check existing DigiClassroom links | Book Buddy owner | Book Buddy DB (read) | n/a |
| 7 | Set the Book Buddy variables and redeploy | Book Buddy owner | Coolify | empty `HUB_URL` |
| 8 | Verify end to end | anyone | both | n/a |

---

## 0. Book Buddy code (already done by the merge)

Pushing `main` deploys through Coolify. This release adds no migration and changes no behaviour while
`HUB_URL` is empty. It does add, for super-admins: "Add from shared library" and "Link to shared library"
(use the library you already have), and "Unlink from shared library" (shown only when the library is PDLMS's hub).

- Check: Coolify shows the new deployment healthy; the API answers `GET /health` with `{"status":"ok"}`; the
  catalogue loads.
- Check: the API log has no `HubClient` or `SharedLibrary` errors at start.
- `MEDIA_PROXY_ALLOWED_HOSTS` is now an overridable variable whose default is the old value, so nothing changes
  until step 7.

## 1. PDLMS code (PDLMS owner; needs PDLMS credentials)

PDLMS's `main` auto-deploys and the push needs `ALLOW_MAIN_PUSH=1`. The hub branch is stacked on two others,
so it is three fast-forwards. Push them **one at a time**, confirming each deploy is healthy before the next.

| Push to `main` | Commit | What it changes |
|---|---|---|
| security round 2 | `9ee3ca4` | Public registration **closed** unless `PUBLIC_SIGNUP_ENABLED=true` (mobile sign-up too); staff roles refused at sign-up; binned books hidden from AI features; librarian cannot grant admin; shared-index purge fails closed (`ALLOW_CROSS_APP_QDRANT_DELETE`); erasure covers all AI data; retention cron (login attempts 90 days, audit log 365). |
| embedding engine | `de2fd7e` | `INGESTION_MODE=local` available (default stays `trio`). Only global, AI-licensed books are indexed in **both** modes: an institution's book is no longer made public in DigiClassroom. |
| library hub | `07fc06d` | `/api/hub/*`, `Book.hubAllowedApps`, `HubAppLink` (migration `20261007120000_add_library_hub`, additive). With `HUB_CLIENTS` empty every hub call answers 503. |

- Confirm the PDLMS deploy applies migrations (look for `prisma migrate deploy` in the API container log). If it does
  not, apply `20261007120000_add_library_hub` before using the hub.
- Decide beforehand: do you want `PUBLIC_SIGNUP_ENABLED=true`? Without it, mobile sign-up stops working.
- Check after each push: API healthy, an existing user can sign in, and for the hub push `GET /api/hub/works`
  answers **503** (not 404, not 200): that means the code is there and the hub is off.
- Undo: redeploy the previous commit. The migration only adds a column and a table, so it can stay.

## 2. PDLMS embeds the books it will share

A hub book is only usable for Varta if its passages are in `pdlms_content_v1`. Today PDLMS hands chapters to
DigiClassroom, so they are **not** there yet. Follow PDLMS `docs/own-embedding-engine.md` "Cut-over":

1. API worker: `QDRANT_ALLOW_COLLECTION_CREATE=true`, `INGESTION_MODE=local`, redeploy; the log shows
   `pdlms_content_v1` created (3072d dense + keyword).
2. Re-embed each book to be shared from its markdown ("Trigger AI Embed"). Check Varta on one first.
3. Leave DigiClassroom's collection alone: its tutor keeps reading the old one until you decide otherwise.

- Check: each book's embedding status is READY and it is global with licence `AI_PERMITTED`.
- Undo: `INGESTION_MODE=trio`. Books already embedded stay in `pdlms_content_v1`.

## 3. Make Book Buddy's secret and turn the hub on (PDLMS owner)

On any machine with the PDLMS repo:

```bash
node backend/scripts/hub-client-secret.js bookbuddy
```

It prints a **SECRET** (shown once; give it to Book Buddy, never commit it) and a **HASH**. On the PDLMS API set:

```
HUB_CLIENTS={"bookbuddy":"<the HASH>"}
```

Redeploy. One secret per app: another app gets its own pair, added to the same JSON object.

- Check: `GET https://<pdlms-api>/api/hub/works` with no headers now answers **401** (it was 503).
- Optional tuning: `HUB_RATE_LIMIT_PER_MINUTE` (default 120 per app), `HUB_AUTH_FAILURES_PER_MINUTE` (10 per IP).
- Undo: empty `HUB_CLIENTS` (every call 503 again).

## 4. Share chosen books with Book Buddy (PDLMS super-admin)

Nothing is shared by default. Per book:

```
PUT /api/super-admin/catalog/books/<bookId>/hub-sharing    {"apps": ["bookbuddy"]}
GET /api/super-admin/catalog/books/<bookId>/hub-sharing    -> apps, servable, linkedBy
```

Refused for an institution's book or one in the Bin. Each change is audit-logged (who, from, to). There is no
screen for this yet. (Writing `hubAllowedApps` directly in the database also works, but PDLMS's rule is to confirm
with the owner before any write there; use the endpoint.)

- Check: `GET .../hub-sharing` shows `servable: true`.
- Undo: `{"apps": []}`. Switching off is always allowed.

## 5. Read-only key and network to PDLMS's Qdrant (server owner)

Book Buddy reads passages straight from Qdrant, so it needs a way in that cannot write. This is the same work as
`docs/shared-spine.md` "Switch-over" steps 3 and 4, for the Qdrant that holds `pdlms_content_v1`:

1. Give that Qdrant a full key and a **separate read-only key** (`QDRANT__SERVICE__API_KEY` and
   `QDRANT__SERVICE__READ_ONLY_API_KEY`). Set the full key as `QDRANT_API_KEY` for PDLMS (and DigiClassroom, which
   reads the same server) **first**, then enable the keys on Qdrant, so nothing is cut off.
2. Create a small dedicated network holding only that Qdrant and Book Buddy's API (for example
   `docker network create trio-data`), connect the Qdrant to it, and declare it for Book Buddy's API in the compose
   file (`networks: [default, trio-data]`, `trio-data` as `external: true`). The compose file does **not** declare it
   yet, because a missing network stops the deploy. **Do not** attach Book Buddy to the whole `coolify` network.

- Check: from Book Buddy's API container the Qdrant answers on its internal address; the read-only key can read and
  is refused a write (`npm run check:ai` proves both, in step 8).
- Undo: detach the network; remove the keys only after every app has been given the full key.

## 6. Check existing DigiClassroom links (Book Buddy owner)

**The switch in step 7 is for the whole deployment, not per book.** Book Buddy has one `SHARED_QDRANT_*`, so any
book already linked through DigiClassroom would lose its passages (its work id is DigiClassroom's, not PDLMS's).
Look first (read-only):

```sql
SELECT id, title FROM "Book" WHERE "spineContentItemId" IS NOT NULL AND "deletedAt" IS NULL;
```

- No rows: go to step 7.
- Rows: take each back to Book Buddy's own index first (`docs/shared-spine.md`, "Going back for one book"), then
  link it again to its PDLMS work after step 7. Or leave `HUB_URL` empty and keep using DigiClassroom.

## 7. Set the Book Buddy variables and redeploy (Book Buddy owner, in Coolify)

You enter the secrets; they are never put in the repository.

```
HUB_URL=https://<pdlms-api-host>                     (https only)
HUB_SECRET=<the SECRET from step 3>
HUB_APP_ID=bookbuddy
SHARED_QDRANT_URL=<PDLMS's Qdrant, internal address>
SHARED_QDRANT_API_KEY=<the READ-ONLY key from step 5>
SHARED_QDRANT_COLLECTION=pdlms_content_v1
SHARED_EMBEDDING_DIMENSIONS=3072
MEDIA_PROXY_ALLOWED_HOSTS=media.bookbuddy.live,<PDLMS's storage host>
```

`OPENAI_EMBED_MODEL` stays `text-embedding-3-large`: asked for 3072 dimensions it is the model PDLMS embeds with.
`MEDIA_PROXY_ALLOWED_HOSTS` needs the **host of the signed links the hub returns** (the storage endpoint, for
example `<account>.r2.cloudflarestorage.com`), not PDLMS's website. Without it, reading a hub book fails with 403.

- Check: after redeploy, from `backend/` with the same variables: `npm run check:ai`. It must report the hub
  accepted this app, the shared collection (3072d), and that the key is read-only.
- Undo: empty `HUB_URL` (and `HUB_SECRET`). Book Buddy goes back to DigiClassroom's endpoints; hub-linked books
  keep their data but their streamed files stop working until it is set again.

## 8. Verify end to end

1. Super-admin, Catalogue: **Add from shared library**. The list shows only works shared with `bookbuddy` that have
   embedded passages. Pick one, enter the author, create. The progress dialog ends READY.
2. Open the new book as a reader: the PDF/EPUB opens (streamed; a new 5-minute link each time) and a Varta question
   cites the right page. The cover is present.
3. PDLMS side: `hub-sharing` for that book lists the Book Buddy record under `linkedBy`; the audit log has
   `HUB_LINK_CREATED` and `HUB_FILE_LINK` rows for `bookbuddy`, none containing a secret or a signed link.
4. Try **Unlink from shared library** on a test book ("Keep it here"): the dialog ends in "Taken off the shared
   library"; PDLMS shows `HUB_LINK_REMOVED` and the book is still shared and unchanged there.
5. Watch the Book Buddy API log for a few minutes: no repeated `Library hub request ... failed`.

## What can go wrong

| Symptom | Likely cause |
|---|---|
| "The library hub rejected this app's credentials" | `HUB_APP_ID` / `HUB_SECRET` do not match the hash in PDLMS `HUB_CLIENTS` |
| "The library hub is not enabled on the PDLMS server" | `HUB_CLIENTS` empty on PDLMS (step 3) |
| Works list is empty | nothing shared yet (step 4), or the works have no embedded passages (step 2) |
| Link job fails: "no public passages could be read" | `SHARED_QDRANT_*` wrong, key or network missing (step 5), or PDLMS has not embedded the book into `pdlms_content_v1` |
| Book opens blank or 403 on read | PDLMS storage host missing from `MEDIA_PROXY_ALLOWED_HOSTS` |
| Read fails with the hub's reason | PDLMS un-shared, binned or deleted the book: unlink it in Book Buddy (Retire or Keep) |
| `HUB_URL must be https` | plain http is accepted only for localhost |

## Not covered yet

Audiobooks (still uploaded to Book Buddy), an admin screen for `hubAllowedApps`, "also used by" in the catalogue,
noticing that PDLMS stopped sharing a book, and a hub search endpoint (reading Qdrant directly means the read-only
key can see the whole collection).
