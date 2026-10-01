import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const client = new S3Client({
  region: process.env.S3_REGION ?? 'auto',
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: process.env.STORAGE_PROVIDER === 'minio',
});

async function applyCorPolicy() {
  console.log('Applying CORS policy to', process.env.S3_BUCKET_NAME, 'at', process.env.S3_ENDPOINT);
  await client.send(
    new PutBucketCorsCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ['content-type'],
            AllowedMethods: ['GET', 'PUT', 'HEAD'],
            AllowedOrigins: [
              process.env.APP_ORIGIN ?? 'http://localhost:3000',
              'http://localhost:3001',
              'https://bookbuddy.thevinstitution.com', // fallback domains just in case
            ],
            ExposeHeaders: ['ETag'],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    }),
  );
  console.log('✅ R2 CORS policy applied successfully');
}

applyCorPolicy().catch(console.error);
