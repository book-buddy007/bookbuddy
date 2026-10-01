/**
 * Creates the media bucket on the S3-compatible store (local MinIO by default)
 * and makes its objects publicly readable, so CDN_BASE_URL links work.
 * Safe to re-run. Reads S3_* from the environment (backend/.env via dotenv if present).
 *
 *   cd backend && node scripts/init-storage.js
 */
try { require('dotenv').config(); } catch { /* optional */ }
const {
  S3Client, HeadBucketCommand, CreateBucketCommand, PutBucketPolicyCommand,
} = require('@aws-sdk/client-s3');

const bucket = process.env.S3_BUCKET_NAME || 'book-buddy-media';
const client = new S3Client({
  region: process.env.S3_REGION || 'us-east-1',
  endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ensureBucket() {
  for (let attempt = 1; ; attempt++) {
    try {
      await client.send(new HeadBucketCommand({ Bucket: bucket }));
      return 'exists';
    } catch (err) {
      const status = err && err.$metadata && err.$metadata.httpStatusCode;
      if (status === 404) {
        await client.send(new CreateBucketCommand({ Bucket: bucket }));
        return 'created';
      }
      if (attempt >= 30) throw err; // storage not reachable after ~60s
      await sleep(2000);
    }
  }
}

async function main() {
  const state = await ensureBucket();
  const policy = {
    Version: '2012-10-17',
    Statement: [{
      Effect: 'Allow',
      Principal: { AWS: ['*'] },
      Action: ['s3:GetObject'],
      Resource: [`arn:aws:s3:::${bucket}/*`],
    }],
  };
  await client.send(new PutBucketPolicyCommand({ Bucket: bucket, Policy: JSON.stringify(policy) }));
  console.log(`bucket ${bucket} ${state}, public read enabled`);
}

main().catch((err) => {
  console.error('storage init failed:', (err && err.message) || err);
  process.exit(1);
});
