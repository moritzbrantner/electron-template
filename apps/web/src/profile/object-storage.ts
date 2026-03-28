import type { ValidatedImageUpload } from '@/src/profile/image-validation';

export type StoredProfileImage = {
  key: string;
  url: string;
};

type S3Module = typeof import('@aws-sdk/client-s3');

let s3ModulePromise: Promise<S3Module> | null = null;

function loadS3Module() {
  if (!s3ModulePromise) {
    s3ModulePromise = import('@aws-sdk/client-s3');
  }

  return s3ModulePromise;
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

async function getClient() {
  const { S3Client } = await loadS3Module();

  return new S3Client({
    region: process.env.PROFILE_IMAGE_STORAGE_REGION ?? 'auto',
    endpoint: process.env.PROFILE_IMAGE_STORAGE_ENDPOINT,
    forcePathStyle: process.env.PROFILE_IMAGE_STORAGE_FORCE_PATH_STYLE === 'true',
    credentials: {
      accessKeyId: requireEnv('PROFILE_IMAGE_STORAGE_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('PROFILE_IMAGE_STORAGE_SECRET_ACCESS_KEY'),
    },
  });
}

function getBucket() {
  return requireEnv('PROFILE_IMAGE_STORAGE_BUCKET');
}

function getPublicBaseUrl() {
  const raw = process.env.PROFILE_IMAGE_PUBLIC_BASE_URL;
  if (!raw) {
    return null;
  }

  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

function extensionForMime(mimeType: string) {
  if (mimeType === 'image/png') {
    return 'png';
  }

  if (mimeType === 'image/jpeg') {
    return 'jpg';
  }

  return 'bin';
}

export function buildProfileImageUrl(keyOrUrl: string | null | undefined) {
  if (!keyOrUrl) {
    return null;
  }

  if (keyOrUrl.startsWith('http://') || keyOrUrl.startsWith('https://')) {
    return keyOrUrl;
  }

  const baseUrl = getPublicBaseUrl();
  return baseUrl ? `${baseUrl}/${keyOrUrl}` : keyOrUrl;
}

export async function uploadProfileImage(userId: string, image: ValidatedImageUpload): Promise<StoredProfileImage> {
  const { PutObjectCommand } = await loadS3Module();
  const key = `profile-images/${userId}/${Date.now()}-${crypto.randomUUID()}.${extensionForMime(image.mimeType)}`;
  const client = await getClient();

  await client.send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: image.bytes,
      ContentType: image.mimeType,
      CacheControl: 'public, max-age=31536000, immutable',
      Metadata: {
        userId,
        width: String(image.width),
        height: String(image.height),
      },
    }),
  );

  return {
    key,
    url: buildProfileImageUrl(key) ?? key,
  };
}

export async function deleteProfileImage(keyOrUrl: string | null | undefined) {
  if (!keyOrUrl) {
    return;
  }

  const { DeleteObjectCommand } = await loadS3Module();
  const baseUrl = getPublicBaseUrl();
  const key = baseUrl ? keyOrUrl.replace(`${baseUrl}/`, '') : keyOrUrl;
  const client = await getClient();

  await client.send(
    new DeleteObjectCommand({
      Bucket: getBucket(),
      Key: key,
    }),
  );
}
