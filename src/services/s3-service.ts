// ============================================================
// AWS S3 Document Storage Service
// Handles presigned URL generation for upload/download
// ============================================================

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const BUCKET = process.env.AWS_S3_BUCKET || "govcon-operator-documents";
const REGION = process.env.AWS_S3_REGION || process.env.AWS_REGION || "us-east-1";

function getS3Client(): S3Client {
  return new S3Client({
    region: REGION,
    ...(process.env.AWS_ACCESS_KEY_ID && {
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    }),
  });
}

/**
 * Generate a presigned URL for uploading a file to S3
 */
export async function getUploadPresignedUrl(params: {
  key: string;
  contentType: string;
  contentLength?: number;
  expiresIn?: number;
}): Promise<{ uploadUrl: string; key: string }> {
  const s3 = getS3Client();

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: params.key,
    ContentType: params.contentType,
    ...(params.contentLength && { ContentLength: params.contentLength }),
  });

  const uploadUrl = await getSignedUrl(s3, command, {
    expiresIn: params.expiresIn || 3600, // 1 hour default
  });

  return { uploadUrl, key: params.key };
}

/**
 * Generate a presigned URL for downloading a file from S3
 */
export async function getDownloadPresignedUrl(params: {
  key: string;
  expiresIn?: number;
  filename?: string;
}): Promise<string> {
  const s3 = getS3Client();

  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: params.key,
    ...(params.filename && {
      ResponseContentDisposition: `attachment; filename="${params.filename}"`,
    }),
  });

  return getSignedUrl(s3, command, {
    expiresIn: params.expiresIn || 3600,
  });
}

/**
 * Delete a file from S3
 */
export async function deleteS3Object(key: string): Promise<void> {
  const s3 = getS3Client();

  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  await s3.send(command);
}

/**
 * Check if a file exists in S3
 */
export async function objectExists(key: string): Promise<boolean> {
  const s3 = getS3Client();

  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET,
      Key: key,
    });
    await s3.send(command);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a unique S3 key for a document
 */
export function generateDocumentKey(params: {
  organizationId: string;
  documentType: string;
  filename: string;
}): string {
  const timestamp = Date.now();
  const sanitizedFilename = params.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `orgs/${params.organizationId}/${params.documentType}/${timestamp}-${sanitizedFilename}`;
}

/**
 * Get the public URL for an S3 object (if bucket is public, otherwise use presigned)
 */
export function getS3ObjectUrl(key: string): string {
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}
