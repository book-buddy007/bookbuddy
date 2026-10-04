/**
 * Applies the browser CORS policy to the media bucket (Cloudflare R2 or any S3-compatible store).
 *
 * Browsers upload straight to the bucket with presigned PUT links and the reader streams with
 * Range requests, so the bucket must allow the app's origin. This is a one-time step.
 *
 *   cd backend && node scripts/setup-r2-cors.js --print   # just print the policy (paste it into the dashboard)
 *   cd backend && node scripts/setup-r2-cors.js           # apply it, then read it back
 *
 * Applying needs a token that may edit bucket settings (Cloudflare: "Admin Read & Write"). The app's
 * own runtime token is deliberately limited to objects and will be refused. If you would rather not
 * create an admin token, use --print and paste the JSON into
 * Cloudflare dashboard -> R2 -> your bucket -> Settings -> CORS Policy.
 *
 * The policy goes on BOTH buckets: books and audio upload to the private one, covers, samples and
 * branding to the public one. Reads S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET_NAME,
 * S3_PUBLIC_BUCKET_NAME and the allowed origins from CORS_ORIGINS (comma-separated) or APP_ORIGIN,
 * from the environment or backend/.env.
 */
try { require('dotenv').config(); } catch { /* optional */ }
const { GetBucketCorsCommand, PutBucketCorsCommand, S3Client } = require('@aws-sdk/client-s3');

const printOnly = process.argv.includes('--print');

const origins = (process.env.CORS_ORIGINS || process.env.APP_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);

// Paste the same policy into each bucket's Settings -> CORS Policy.
// PUT for uploads, GET/HEAD for the reader, Range for pdf.js and audio seeking.
const corsRules = [
  {
    AllowedOrigins: origins,
    AllowedMethods: ['GET', 'PUT', 'HEAD'],
    AllowedHeaders: ['content-type', 'range'],
    ExposeHeaders: ['ETag', 'Content-Length', 'Content-Range', 'Accept-Ranges'],
    MaxAgeSeconds: 3600,
  },
];

async function main() {
  if (printOnly) {
    console.log(JSON.stringify(corsRules, null, 2));
    return;
  }

  const missing = ['S3_ENDPOINT', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'S3_BUCKET_NAME'].filter(
    (name) => !process.env[name],
  );
  if (missing.length) {
    console.error(`Missing environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  const buckets = [...new Set([process.env.S3_BUCKET_NAME, process.env.S3_PUBLIC_BUCKET_NAME].filter(Boolean))];
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

  for (const bucket of buckets) {
    console.log(`Applying CORS to "${bucket}" at ${process.env.S3_ENDPOINT} for: ${origins.join(', ')}`);
    await client.send(new PutBucketCorsCommand({ Bucket: bucket, CORSConfiguration: { CORSRules: corsRules } }));

    const readBack = await client.send(new GetBucketCorsCommand({ Bucket: bucket }));
    const applied = (readBack.CORSRules || []).flatMap((r) => r.AllowedOrigins || []);
    const missingOrigins = origins.filter((o) => !applied.includes(o));
    if (missingOrigins.length) {
      throw new Error(`Policy was accepted on "${bucket}" but did not read back with: ${missingOrigins.join(', ')}`);
    }
  }
  console.log(`CORS policy applied and verified on: ${buckets.join(', ')}.`);
}

main().catch((err) => {
  if (/not implemented/i.test(String(err && err.message))) {
    console.error(
      'This store does not support bucket CORS through the API (MinIO is configured with MINIO_API_CORS_ALLOW_ORIGIN instead). ' +
      'Cloudflare R2 supports it; against R2, use --print and paste the policy into the dashboard.',
    );
    process.exit(1);
  }
  const denied = (err && err.$metadata && err.$metadata.httpStatusCode) === 403 || /access ?denied|forbidden/i.test(String(err && err.message));
  console.error(
    denied
      ? 'Refused: this token cannot edit bucket settings. Use an admin token, or run with --print and paste the policy into the Cloudflare dashboard.'
      : `Failed: ${(err && err.message) || err}`,
  );
  process.exit(1);
});
