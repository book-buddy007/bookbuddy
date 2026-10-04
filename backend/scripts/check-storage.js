/**
 * Checks that file storage works the way the app needs, end to end, against the real bucket.
 * Run it after setting up Cloudflare R2 (docs/storage-r2.md) and again after any storage change:
 *
 *   cd backend && node scripts/check-storage.js          # production-style: public paths must be the ONLY public ones
 *   cd backend && node scripts/check-storage.js --local  # local MinIO: its bucket is public by design, so that check only warns
 *
 * Reads S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET_NAME, CDN_BASE_URL and
 * APP_ORIGIN (or the first of CORS_ORIGINS) from the environment or backend/.env.
 * It writes a few tiny objects under healthcheck/ and global/books/healthcheck/ and deletes them.
 * Exit code 0 = everything required passed.
 */
try { require('dotenv').config(); } catch { /* optional */ }
const crypto = require('crypto');
const {
  S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const local = process.argv.includes('--local');
const need = ['S3_ENDPOINT', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'S3_BUCKET_NAME', 'CDN_BASE_URL'];
const missing = need.filter((n) => !process.env[n]);
if (missing.length) {
  console.error(`Missing environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const bucket = process.env.S3_BUCKET_NAME;
const cdn = process.env.CDN_BASE_URL.replace(/\/+$/, '');
const origin = (process.env.APP_ORIGIN || (process.env.CORS_ORIGINS || '').split(',')[0] || 'http://localhost:3000')
  .trim().replace(/\/+$/, '');

// Same client settings as src/aws/s3.service.ts.
const client = new S3Client({
  region: process.env.S3_REGION || 'auto',
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});

const id = crypto.randomUUID();
const privateKey = `healthcheck/${id}/private.txt`;
const publicKey = `global/books/healthcheck/covers/front/${id}.txt`;
const uploadKey = `healthcheck/${id}/browser-upload.txt`;
const body = `book-buddy storage check ${id}`;

let failed = 0;
const pass = (msg) => console.log(`  PASS  ${msg}`);
const fail = (msg, hint) => { failed += 1; console.log(`  FAIL  ${msg}${hint ? `\n        -> ${hint}` : ''}`); };
const warn = (msg, hint) => console.log(`  WARN  ${msg}${hint ? `\n        -> ${hint}` : ''}`);

async function step(name, fn) {
  try { await fn(); } catch (err) {
    fail(`${name}: ${(err && err.message) || err}`);
  }
}

async function main() {
  console.log(`Bucket "${bucket}" at ${process.env.S3_ENDPOINT}`);
  console.log(`Public base ${cdn}   App origin ${origin}   Mode ${local ? 'local' : 'production'}\n`);

  await step('write with the app credentials', async () => {
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: privateKey, Body: body, ContentType: 'text/plain' }));
    pass('app credentials can write objects');
  });

  await step('signed download', async () => {
    const url = await getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: privateKey }), { expiresIn: 60 });
    const res = await fetch(url);
    if (res.status !== 200) return fail(`signed download returned ${res.status}`, 'check S3_ENDPOINT and that the token can read objects');
    if ((await res.text()) !== body) return fail('signed download returned different content');
    pass('signed download works (this is how book files, audio and personal uploads are read)');
  });

  await step('browser upload (CORS + signed PUT)', async () => {
    const url = await getSignedUrl(
      client,
      new PutObjectCommand({ Bucket: bucket, Key: uploadKey, ContentType: 'text/plain' }),
      { expiresIn: 60 },
    );
    const pre = await fetch(url, {
      method: 'OPTIONS',
      headers: { Origin: origin, 'Access-Control-Request-Method': 'PUT', 'Access-Control-Request-Headers': 'content-type' },
    });
    const allowed = pre.headers.get('access-control-allow-origin');
    if (!pre.ok || (allowed !== origin && allowed !== '*')) {
      fail(
        `CORS preflight from ${origin} was refused (status ${pre.status}, allow-origin ${allowed ?? 'none'})`,
        'apply the CORS policy: node scripts/setup-r2-cors.js --print, then paste it into the bucket settings',
      );
    } else {
      pass(`CORS allows uploads from ${origin}`);
    }
    const put = await fetch(url, { method: 'PUT', headers: { 'content-type': 'text/plain' }, body });
    if (!put.ok) fail(`signed upload returned ${put.status}`);
    else pass('signed upload works (this is how the browser uploads PDFs, EPUBs and audio)');
  });

  await step('public paths', async () => {
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: publicKey, Body: body, ContentType: 'text/plain' }));
    const res = await fetch(`${cdn}/${publicKey}`);
    if (res.status === 200 && (await res.text()) === body) {
      pass('covers, samples and branding are reachable on the public domain');
    } else {
      fail(
        `public domain returned ${res.status} for a cover-style path`,
        `connect ${new URL(cdn).host} to the bucket as a custom domain and check the Cloudflare rule allows /covers/, /sample/ and /branding/`,
      );
    }
  });

  await step('private paths stay private', async () => {
    const res = await fetch(`${cdn}/${privateKey}`);
    if (res.status === 200) {
      const hint = 'add the Cloudflare rule from docs/storage-r2.md so only covers, samples and branding are public';
      if (local) warn('a private-style object is publicly readable (expected on local MinIO, whose bucket is public)');
      else fail('a private-style object is publicly readable on the media domain', hint);
    } else {
      pass(`private paths are not served publicly (status ${res.status})`);
    }
  });
}

async function cleanup() {
  for (const key of [privateKey, publicKey, uploadKey]) {
    try { await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })); } catch { /* best effort */ }
  }
}

main()
  .catch((err) => { failed += 1; console.error(err); })
  .finally(async () => {
    await cleanup();
    console.log(failed ? `\n${failed} check(s) failed.` : '\nAll storage checks passed.');
    process.exit(failed ? 1 : 0);
  });
