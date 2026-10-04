# Moving the app to bookbuddy.live

| What | Old | New |
|---|---|---|
| Web app | `https://bookbuddy.vinstitution.com` | `https://bookbuddy.live` |
| API | `https://api.bookbuddy.vinstitution.com` | `https://api.bookbuddy.live` |
| Public media (covers, samples, logos) | `https://media.bookbuddy.vinstitution.com` | `https://media.bookbuddy.live`, the custom domain of the R2 bucket `bookbuddymedia` |

The code, the compose defaults, the sign-in trusted origins and the mobile app's default API address
already point at the new addresses. Everything below is what only you can do, in order. Keep the old
domains configured until step 8.

Order matters in one place: **do steps 1 to 5 first, then redeploy once (step 6)**. The web app
bakes its addresses into the build, so a deploy before the DNS and Coolify values are ready would
publish a site that points at addresses that do not exist yet.

## 1. DNS, in the `bookbuddy.live` zone on Cloudflare

| Type | Name | Value | Cloud |
|---|---|---|---|
| A | `@` (bookbuddy.live) | `168.220.248.127` | **DNS only (grey)** |
| A | `api` | `168.220.248.127` | **DNS only (grey)** |

`168.220.248.127` is the address both current hostnames resolve to.

**Keep both records DNS-only, not proxied (orange).** The API's rate limiting and the certificates
assume visitors reach your server directly. Behind the Cloudflare proxy every visitor would appear
to come from Cloudflare, so the per-visitor limits on sign-in and password reset would become
shared by everyone (see `backend/src/common/client-ip.ts`).

Do **not** create a `media` record by hand: connecting the R2 bucket (step 5) creates it.

## 2. Coolify domains
In the application's configuration, add (keep the old ones for now):
- web service: `https://bookbuddy.live:3000`
- api service: `https://api.bookbuddy.live:3333`

The Let's Encrypt certificates are issued automatically once the DNS records resolve.

## 3. Coolify environment variables
Coolify keeps the values it stored from earlier deploys and they win over the compose file's
defaults, so **open each of these and replace the value**:

| Variable | New value |
|---|---|
| `APP_URL` | `https://bookbuddy.live` |
| `API_URL` | `https://api.bookbuddy.live` |
| `MEDIA_URL` | `https://media.bookbuddy.live` |
| `MEDIA_HOST` | `media.bookbuddy.live` (if it exists) |
| `S3_PUBLIC_BUCKET_NAME` | `bookbuddymedia` (if it exists) |

Leave `EMAIL_FROM` alone. The sender address is on `vinstitution.com`, which is already verified with
Resend, and it does not have to match the app's address. If you later want mail to come from
`bookbuddy.live`, verify that domain in Resend first.

## 4. Google sign-in
Google Cloud Console, **APIs & Services**, **Credentials**, your OAuth client:
- **Authorized JavaScript origins:** add `https://bookbuddy.live`
- **Authorized redirect URIs:** add `https://bookbuddy.live/api/auth/callback/google`

Keep the old entries until step 8. Without this, Google sign-in on the new address fails with
"redirect_uri_mismatch".

## 5. Cloudflare R2
Follow `docs/storage-r2.md`: connect `media.bookbuddy.live` to the public bucket `bookbuddymedia`, and
paste the CORS policy into both buckets using `APP_ORIGIN=https://bookbuddy.live`. The
`bookbuddy.live` zone must be in the same Cloudflare account as the buckets.

## 6. Redeploy
Redeploy from Coolify. Then check the API log: the line
`[entrypoint] storage: external r2 store at https://…` must show your R2 endpoint.

## 7. Check it
- `https://bookbuddy.live` loads with a valid certificate, and `https://api.bookbuddy.live/health` answers.
- Sign in with email and with Google.
- Forgot password: the link in the email starts with `https://bookbuddy.live`.
- As super-admin: upload a cover (it shows up), a PDF and an audiobook, and open them.
- Run `node scripts/check-storage.js` (step 6 of `docs/storage-r2.md`).

## 8. Retire the old domain
- Everyone has to **sign in again**: sign-in cookies belong to one domain and do not carry over.
- Links already emailed (password reset, email verification) point at the old address and will stop
  working once it is gone; they expire quickly anyway.
- After the redeploy the old web address is not usable for signing in: the site calls the new API and
  the API only accepts the new site's address. Send the old address to the new one with a redirect
  in Coolify, or remove it from the web and api domains.
- Then remove the old entries from the Google OAuth client.

## Rolling back
Put the old values back in step 3 and redeploy. The old domains stay configured until you remove them
in step 8, so nothing has to be rebuilt by hand.

## Mobile app
The Expo app's default API address is now `https://api.bookbuddy.live`. The app has no published
build yet, so there is nothing to migrate. Builds already installed elsewhere would keep using the old
API address, which is why the old API domain should stay up until you know none are in use.
