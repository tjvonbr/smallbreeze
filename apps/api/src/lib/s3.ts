/**
 * S3 service for photo uploads.
 *
 * To enable S3 uploads, set the following environment variables:
 * - AWS_REGION: AWS region (e.g., "us-east-1")
 * - AWS_ACCESS_KEY_ID: AWS access key
 * - AWS_SECRET_ACCESS_KEY: AWS secret key
 * - S3_BUCKET_NAME: S3 bucket name for photo storage
 * - S3_PRESIGNED_URL_EXPIRY: (optional) Presigned URL expiry in seconds (default: 3600)
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

const DEFAULT_EXPIRY_SECONDS = 3600; // 1 hour

let s3Client: S3Client | null = null;

function getS3Client(): S3Client | null {
  if (!isS3Enabled()) {
    return null;
  }

  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }

  return s3Client;
}

/**
 * Check if S3 is configured and available.
 */
export function isS3Enabled(): boolean {
  return !!(
    process.env.AWS_REGION &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.S3_BUCKET_NAME
  );
}

/**
 * Get the S3 bucket name from environment.
 */
export function getBucketName(): string {
  return process.env.S3_BUCKET_NAME || '';
}

/**
 * Validate that a content type is allowed for upload.
 */
export function isAllowedContentType(contentType: string): boolean {
  return ALLOWED_CONTENT_TYPES.includes(contentType);
}

/**
 * Get the list of allowed content types.
 */
export function getAllowedContentTypes(): string[] {
  return [...ALLOWED_CONTENT_TYPES];
}

/**
 * Generate a presigned URL for uploading a file to S3.
 */
export async function generatePresignedUploadUrl(
  key: string,
  contentType: string,
): Promise<{ url: string; expiresIn: number } | null> {
  const client = getS3Client();
  if (!client) {
    return null;
  }

  const expiresIn = parseInt(process.env.S3_PRESIGNED_URL_EXPIRY || '', 10) || DEFAULT_EXPIRY_SECONDS;

  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(client, command, { expiresIn });

  return { url, expiresIn };
}

/**
 * Get the public URL for an S3 object.
 * Note: This assumes the bucket is configured for public read access.
 * For private buckets, use generatePresignedDownloadUrl instead.
 */
export function getPublicUrl(key: string): string {
  const bucket = getBucketName();
  const region = process.env.AWS_REGION;
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

/**
 * Check if an object exists in S3.
 */
export async function objectExists(key: string): Promise<boolean> {
  const client = getS3Client();
  if (!client) {
    return false;
  }

  try {
    await client.send(new HeadObjectCommand({
      Bucket: getBucketName(),
      Key: key,
    }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete an object from S3.
 */
export async function deleteObject(key: string): Promise<boolean> {
  const client = getS3Client();
  if (!client) {
    return false;
  }

  try {
    await client.send(new DeleteObjectCommand({
      Bucket: getBucketName(),
      Key: key,
    }));
    return true;
  } catch (err) {
    console.error('S3 delete error:', err);
    return false;
  }
}

/**
 * Generate an S3 key for a listing photo.
 * Format: photos/{teamId}/{listingId}/{uuid}.{extension}
 */
export function generatePhotoKey(
  teamId: string,
  listingId: string,
  fileId: string,
  contentType: string,
): string {
  const extension = contentType.split('/')[1] || 'jpg';
  return `photos/${teamId}/${listingId}/${fileId}.${extension}`;
}
