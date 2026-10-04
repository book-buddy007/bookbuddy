/**
 * Checks that file storage works the way the app needs, end to end, against the real buckets.
 * Run it after setting up Cloudflare R2 (docs/storage-r2.md) and again after any storage change:
 *
 *   cd backend && node scripts/check-storage.js          # production: two buckets, only the public one reachable
 *   cd backend && node scripts/check-storage.js --local  # local MinIO: one shared public bucket, so that check only warns
 *
 * Reads S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET_NAME (private),
 * S3_PUBLIC_BUCKET_NAME (public), CDN_BASE_URL and APP_ORIGIN (or the first of CORS_ORIGINS)
 * from the environment or backend/.env.
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
if (!local && !process.env.S3_PUBLIC_BUCKET_NAME) missing.push('S3_PUBLIC_BUCKET_NAME');
if (missing.length) {
  console.error(`Missing environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const privateBucket = process.env.S3_BUCKET_NAME;
const publicBucket = process.env.S3_PUBLIC_BUCKET_NAME || privateBucket;
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
// Keys shaped like the app's real ones, so the same public/private split applies.
const privateKey = `global/books/healthcheck/formats/pdf/${id}-private.txt`;
const privateUploadKey = `healthcheck/${id}/browser-upload.txt`;
const publicKey = `global/books/healthcheck/covers/front/${id}.txt`;
const publicUploadKey = `global/books/healthcheck/covers/back/${id}-browser-upload.txt`;
const body = `book-buddy storage check ${id}`;

const created = []; // [bucket, key] to clean up
let failed = 0;
const pass = (msg) => console.log(`  PASS  ${msg}`);
const fail = (msg, hint) => { failed += 1; console.log(`  FAIL  ${msg}${hint ? `\n        -> ${hint}` : ''}`); };
const warn = (msg, hint) => console.log(`  WARN  ${msg}${hint ? `\n        -> ${hint}` : ''}`);

async function step(name, fn) {
  try { await fn(); } catch (err) {
    fail(`${name}: ${(err && err.message) || err}`);
  }
}

async function put(bucket, key) {
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: 'text/plain' }));
  created.push([bucket, key]);
}

/** CORS preflight plus a real signed PUT, the way the browser uploads. */
async function browserUpload(label, bucket, key) {
  const url = await getSignedUrl(
    client,
    new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: 'text/plain' }),
    { expiresIn: 60 },
  );
  const pre = await fetch(url, {
    method: 'OPTIONS',
    headers: { Origin: origin, 'Access-Control-Request-Method': 'PUT', 'Access-Control-Request-Headers': 'content-type' },
  });
  const allowed = pre.headers.get('access-control-allow-origin');
  if (!pre.ok || (allowed !== origin && allowed !== '*')) {
    fail(
      `${label}: CORS preflight from ${origin} was refused (status ${pre.status}, allow-origin ${allowed ?? 'none'})`,
      `paste the CORS policy into bucket "${bucket}": node scripts/setup-r2-cors.js --print`,
    );
  } else {
    pass(`${label}: CORS allows uploads from ${origin}`);
  }
  const res = await fetch(url, { method: 'PUT', headers: { 'content-type': 'text/plain' }, body });
  if (!res.ok) fail(`${label}: signed upload returned ${res.status}`);
  else {
    created.push([bucket, key]);
    pass(`${label}: signed upload works`);
  }
}

async function main() {
  console.log(`Private bucket "${privateBucket}", public bucket "${publicBucket}" at ${process.env.S3_ENDPOINT}`);
  console.log(`Public base ${cdn}   App origin ${origin}   Mode ${local ? 'local' : 'production'}\n`);

  if (publicBucket === privateBucket) {
    if (local) warn('one shared bucket (expected for local MinIO)');
    else fail('S3_PUBLIC_BUCKET_NAME equals S3_BUCKET_NAME', 'use a separate public bucket, or the public domain would expose the private files');
  } else {
    pass('public and private files use separate buckets');
  }

  await step('write with the app credentials', async () => {
    await put(privateBucket, privateKey);
    pass(`app credentials can write to the private bucket "${privateBucket}"`);
    if (publicBucket !== privateBucket) {
      await put(publicBucket, publicKey);
      pass(`app credentials can write to the public bucket "${publicBucket}"`);
    }
  });

  await step('signed download of a private file', async () => {
    const url = await getSignedUrl(client, new GetObjectCommand({ Bucket: privateBucket, Key: privateKey }), { expiresIn: 60 });
    const res = await fetch(url);
    if (res.status !== 200) return fail(`signed download returned ${res.status}`, 'check S3_ENDPOINT and that the token can read objects in the private bucket');
    if ((await res.text()) !== body) return fail('signed download returned different content');
    pass('signed download works (how book files, audio, personal uploads and proofs are read)');
  });

  await step('browser upload to the private bucket', () =>
    browserUpload('book upload (private bucket)', privateBucket, privateUploadKey));

  if (publicBucket !== privateBucket) {
    await step('browser upload to the public bucket', () =>
      browserUpload('cover upload (public bucket)', publicBucket, publicUploadKey));
  }

  await step('public files are reachable', async () => {
    if (publicBucket === privateBucket) await put(publicBucket, publicKey);
    const res = await fetch(`${cdn}/${publicKey}`);
    if (res.status === 200 && (await res.text()) === body) {
      pass('covers, samples and branding are reachable on the public domain');
    } else {
      fail(
        `public domain returned ${res.status} for a cover-style path`,
        `connect ${new URL(cdn).host} to the PUBLIC bucket "${publicBucket}" as a custom domain (and not to "${privateBucket}")`,
      );
    }
  });

  await step('private files are not public', async () => {
    const res = await fetch(`${cdn}/${privateKey}`);
    if (res.status === 200) {
      if (local) warn('a private-style object is publicly readable (expected on local MinIO, whose bucket is public)');
      else fail(
        'a private file is readable on the public media domain',
        `the domain must point only at "${publicBucket}"; make sure "${privateBucket}" has no custom domain and no r2.dev URL`,
      );
    } else {
      pass(`private files are not served on the public domain (status ${res.status})`);
    }
  });
}

async function cleanup() {
  for (const [bucket, key] of created) {
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
