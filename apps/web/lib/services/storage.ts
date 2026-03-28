export type UploadObjectInput = {
  key: string;
  body: Uint8Array;
  contentType: string;
};

export async function uploadObject(input: UploadObjectInput): Promise<{ url: string }> {
  // Replace with your storage adapter (S3, Cloudflare R2, GCS, etc.).
  return {
    url: `https://storage.example.com/${encodeURIComponent(input.key)}`,
  };
}
