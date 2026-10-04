# File storage on Cloudflare R2

Production keeps every uploaded file (PDF, EPUB, audiobook audio, covers, samples, personal
uploads, join-request proofs) in one **Cloudflare R2** bucket. There is no storage container on the
server. Local development still uses MinIO from `docker-compose.yml`.

## How it fits together

| What | Where it goes | How it is read |
|---|---|---|
| Book files (PDF, EPUB), audiobook audio, personal uploads, join-request proofs | `…/formats/…`, `…/audio/…`, `personal/…`, `join-proofs/…`, `uploads/…` | **Private.** Short-lived signed links (5 to 15 minutes), only after the API checks the person may read the book. |
| Covers, free samples, branding logos | `global/books/<id>/covers/…`, `…/sample/…`, `global/branding/<institution>/…` | **Public**, from `https://media.bookbuddy.vinstitution.com`. |

Two hosts are involved, on purpose:

- `S3_ENDPOINT` = `https://<account-id>.r2.cloudflarestorage.com` is the private S3 API. Signed
  upload and download links point here. Nothing is readable from it without a signature.
- `MEDIA_URL` = `https://media.bookbuddy.vinstitution.com` is the bucket's public custom domain,
  used only for covers, samples and branding.

The code assumes object keys sit directly under the public domain (no bucket name in the path),
which is how an R2 custom domain works.

## One-time setup

You do these steps; they need your Cloudflare and Coolify accounts. Keep every secret in Coolify
only: never in git, chat or a ticket.

### 1. Create the bucket
Done: the bucket is named `bookbuddy`, which is the name the production config defaults to.
(Cloudflare shows the S3 API address as `https://<account-id>.r2.cloudflarestorage.com/bookbuddy`.
The app needs only the part **before** `/bookbuddy` as the endpoint: the bucket name is a separate setting.)

### 2. Create the app's API token
R2, **Manage API tokens**, **Create API token**:
- Permission: **Object Read & Write**
- Scope: **only this bucket**

Save the **Access Key ID**, the **Secret Access Key** and your account's S3 endpoint
(`https://<account-id>.r2.cloudflarestorage.com`). The token deliberately cannot change bucket
settings or delete the bucket, which is why the API no longer tries to create the bucket on start.

### 3. Connect the public domain
Bucket, **Settings**, **Custom Domains**, **Connect domain**: `media.bookbuddy.vinstitution.com`.
`vinstitution.com` is already on Cloudflare, so the DNS record and certificate are created for you.

- Do **not** create an A record pointing `media.` at the server.
- Do **not** turn on the `r2.dev` public URL.

### 4. Make only covers, samples and branding public
A custom domain exposes the whole bucket, so add a rule that blocks everything else.
`vinstitution.com`, **Security**, **WAF**, **Custom rules**, **Create rule**:

- Expression (use **Edit expression**):

  ```
  (http.host eq "media.bookbuddy.vinstitution.com"
   and not http.request.uri.path contains "/covers/"
   and not http.request.uri.path contains "/sample/"
   and not http.request.uri.path contains "/branding/")
  ```
- Action: **Block**

Uploaded filenames are sanitised to letters, digits, dot, dash and underscore, so a private file's
name can never contain one of those folder names. Signed links use the `r2.cloudflarestorage.com`
host, so this rule does not affect them. Step 7 verifies it.

### 5. Allow browser uploads (CORS)
The browser uploads straight to the bucket and the reader streams with range requests, so the
bucket must allow your site. Print the policy:

```bash
cd backend && APP_ORIGIN=https://bookbuddy.vinstitution.com node scripts/setup-r2-cors.js --print
```

Paste the JSON into bucket, **Settings**, **CORS Policy**. (`node scripts/setup-r2-cors.js` without
`--print` can apply it for you, but only with a token allowed to edit bucket settings.)

### 6. Set the variables in Coolify
Application, **Environment Variables**:

| Variable | Value |
|---|---|
| `S3_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` (no `/bookbuddy` on the end) |
| `S3_ACCESS_KEY_ID` | the token's Access Key ID |
| `S3_SECRET_ACCESS_KEY` | the token's secret |
| `S3_BUCKET_NAME` | `bookbuddy` (the default, so you can leave it unset) |
| `MEDIA_URL` | leave at `https://media.bookbuddy.vinstitution.com`. It must **not** end in `/book-buddy-media`. |

If one of these is missing or wrong the app still starts, but uploads and downloads answer "File
storage is not configured" and the API log names the setting. After saving, **redeploy** and check
the API log for a line starting `[entrypoint] storage: external r2 store at https://…`: it must show
your real endpoint.

Coolify keeps stored values over the compose file's defaults, so if a variable already exists with
placeholder text in it (an earlier version of this change produced that), **replace the value**.
If you previously saved an old `MEDIA_URL`, open it and check it matches the table.

### 7. Check it before deploying
From your machine, with the same values (put them in an untracked file such as `backend/.env.r2`):

```bash
cd backend
node -r dotenv/config scripts/check-storage.js dotenv_config_path=.env.r2
```

It writes a few tiny objects, then deletes them, and reports PASS or FAIL for: writing with the
app's token, a signed download, a browser-style upload including the CORS check, a public cover
path, and that a private path is **not** public. Fix anything that fails before deploying. Run it
again after any storage change.

### 8. Deploy
Push to `main`. After the deploy, in the app as super-admin: upload a cover, a PDF, an EPUB and an
audiobook MP3, open each in the reader or player, and upload a branding logo.

## Existing files and the old MinIO volume
Before this change the media domain had no DNS record, so uploads could not have worked and there
is probably nothing to move. If you uploaded anything to the old MinIO anyway, copy it **before**
removing the volume:

```bash
rclone copy minio:book-buddy-media r2:bookbuddy --progress
```

Only after everything checks out: remove the `minio` container and the `minio-data` volume on the
server to reclaim the disk. Rolling back is `git revert` of this change plus the old Coolify
variables; the MinIO volume is untouched until you delete it.

## Good to know
- A single signed upload request is limited to about 5 GB on R2. Audiobook MP3s are far below that.
- R2 does not charge for egress; storage is billed by the GB-month. Check Cloudflare's current
  pricing for the numbers.
- Replacing a file does not delete the old object by itself; the catalogue's delete and purge
  actions remove the objects they know about.
- Local development is unchanged: `docker-compose.yml` runs MinIO and `backend/.env` points at it.
