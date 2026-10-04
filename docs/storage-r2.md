# File storage on Cloudflare R2

Production keeps every uploaded file in **two Cloudflare R2 buckets**. There is no storage container
on the server. Local development still uses MinIO from `docker-compose.yml`, with one shared bucket.

## How it fits together

| Bucket | Holds | Who can read it |
|---|---|---|
| `bookbuddy` (private) | Book files (PDF, EPUB), audiobook audio, personal uploads, join-request proofs | Only the app, through short-lived signed links (5 to 15 minutes), and only after the API has checked the person may read the book. **No public domain, ever.** |
| `bookbuddy-public` (public) | Covers, free samples, branding logos | Anyone with the link, from `https://media.bookbuddy.vinstitution.com` |

Which bucket an object goes to is decided by its key alone (`global/books/<id>/covers/…`,
`…/sample/…` and `global/branding/…` are public; everything else is private), so a book file can
never end up in the public bucket and no dashboard rule has to keep it hidden.

Two hosts are involved:

- `S3_ENDPOINT` = `https://<account-id>.r2.cloudflarestorage.com` is the private S3 API. The app
  uses it with its keys, and signed upload and download links point here. Nothing is readable from it
  without a signature.
- `MEDIA_URL` = `https://media.bookbuddy.vinstitution.com` is the custom domain of the **public**
  bucket only, used for covers, samples and branding.

## One-time setup

You do these steps; they need your Cloudflare and Coolify accounts. Keep every secret in Coolify
only: never in git, chat or a ticket.

### 1. Create the two buckets
Cloudflare dashboard, R2, **Create bucket**:
- `bookbuddy`: private (already created).
- `bookbuddy-public`: public. Pick the same location as the first.

Cloudflare shows each bucket's S3 address as `https://<account-id>.r2.cloudflarestorage.com/<bucket>`.
The app needs only the part **before** the bucket name as its endpoint; bucket names are separate
settings.

### 2. Create the app's API token
R2, **Manage API tokens**, **Create API token**:
- Permission: **Object Read & Write**
- Scope: **both buckets** (`bookbuddy` and `bookbuddy-public`)

Save the **Access Key ID** and the **Secret Access Key**. The token cannot change bucket settings or
delete a bucket, which is why the app no longer tries to create buckets on start.

### 3. Connect the public domain to the PUBLIC bucket only
`bookbuddy-public`, **Settings**, **Custom Domains**, **Connect domain**:
`media.bookbuddy.vinstitution.com`. `vinstitution.com` is already on Cloudflare, so the DNS record
and certificate are created for you.

- Do **not** connect any domain to `bookbuddy` (the private bucket).
- Do **not** enable the `r2.dev` public URL on either bucket.
- Do **not** create an A record pointing `media.` at the server.

No Cloudflare firewall rule is needed: the private bucket has no public route at all.

### 4. Allow browser uploads (CORS) on both buckets
The browser uploads straight to the buckets (books and audio to the private one, covers to the public
one) and the reader streams with range requests. Print the policy:

```bash
cd backend && APP_ORIGIN=https://bookbuddy.vinstitution.com node scripts/setup-r2-cors.js --print
```

Paste the JSON into **each** bucket: **Settings**, **CORS Policy**. (`node scripts/setup-r2-cors.js`
without `--print` can apply it to both for you, but only with a token allowed to edit bucket settings.)

### 5. Set the variables in Coolify
Application, **Environment Variables**:

| Variable | Value |
|---|---|
| `S3_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` (no bucket name on the end) |
| `S3_ACCESS_KEY_ID` | the token's Access Key ID |
| `S3_SECRET_ACCESS_KEY` | the token's secret |
| `S3_BUCKET_NAME` | `bookbuddy` (the default, so you can leave it unset) |
| `S3_PUBLIC_BUCKET_NAME` | `bookbuddy-public` (the default, so you can leave it unset) |
| `MEDIA_URL` | leave at `https://media.bookbuddy.vinstitution.com`. It must **not** end in a bucket name. |

If one of the first three is missing or wrong the app still starts, but uploads and downloads answer
"File storage is not configured" and the API log names the setting. After saving, **redeploy** and
check the API log for a line starting `[entrypoint] storage: external r2 store at https://…`: it must
show your real endpoint. If `S3_PUBLIC_BUCKET_NAME` is ever unset or equal to `S3_BUCKET_NAME`, the log
warns that public and private files share one bucket.

Coolify keeps stored values over the compose file's defaults, so if a variable already exists with
placeholder text in it, **replace the value**. If you previously saved an old `MEDIA_URL`, check it
matches the table.

### 6. Check it before deploying
From your machine, with the same values (put them in an untracked file such as `backend/.env.r2`):

```bash
cd backend
node -r dotenv/config scripts/check-storage.js dotenv_config_path=.env.r2
```

It writes a few tiny objects, then deletes them, and reports PASS or FAIL for: separate buckets,
writing to both with the app's token, a signed download, browser-style uploads (including CORS) to
both buckets, a public cover path on the media domain, and that a private file is **not** served on it.
Fix anything that fails before deploying. Run it again after any storage change.

### 7. Deploy
Push to `main`. After the deploy, in the app as super-admin: upload a cover, a PDF, an EPUB and an
audiobook MP3, open each in the reader or player, and upload a branding logo.

## Files already uploaded
Uploads made while everything lived in the single `bookbuddy` bucket have their covers, samples and
logos in the wrong bucket now: the app looks for them in `bookbuddy-public`. Either re-upload them,
or copy them across (nothing else needs moving):

```bash
rclone copy r2:bookbuddy/global/branding r2:bookbuddy-public/global/branding
rclone copy r2:bookbuddy r2:bookbuddy-public --include "global/books/*/covers/**" --include "global/books/*/sample/**"
```

Then delete the copies from `bookbuddy` so nothing public-looking stays in the private bucket.
Before this change the media domain had no DNS record, so very little can have been stored.

If anything was uploaded to the old MinIO, copy it with `rclone copy minio:book-buddy-media r2:bookbuddy`
(and the public parts to `bookbuddy-public` as above) **before** removing the volume. Only after
everything checks out: remove the `minio` container and the `minio-data` volume on the server to
reclaim the disk.

## Good to know
- A single signed upload request is limited to about 5 GB on R2. Audiobook MP3s are far below that.
- R2 does not charge for egress; storage is billed by the GB-month. Check Cloudflare's current
  pricing for the numbers.
- Replacing a file does not delete the old object by itself; the catalogue's delete and purge
  actions remove the objects they know about, from whichever bucket holds them.
- Local development is unchanged: `docker-compose.yml` runs MinIO and `backend/.env` points at it,
  with one shared bucket (leave `S3_PUBLIC_BUCKET_NAME` unset).
