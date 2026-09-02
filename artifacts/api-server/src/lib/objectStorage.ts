import { randomUUID } from "crypto";
import { Readable } from "stream";
import { Storage, type File } from "@google-cloud/storage";

const SIDECAR = "http://127.0.0.1:1106";

export const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${SIDECAR}/token`,
    type: "external_account",
    credential_source: { url: `${SIDECAR}/credential`, format: { type: "json", subject_token_field_name: "access_token" } },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
  }
}

function parsePath(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const [, bucketName, ...objectParts] = normalized.split("/");
  if (!bucketName || objectParts.length === 0) throw new Error("Invalid object path");
  return { bucketName, objectName: objectParts.join("/") };
}

async function signObjectUrl(bucketName: string, objectName: string) {
  const response = await fetch(`${SIDECAR}/object-storage/signed-object-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bucket_name: bucketName,
      object_name: objectName,
      method: "PUT",
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    }),
  });
  if (!response.ok) throw new Error(`Failed to sign object URL (${response.status})`);
  const data = await response.json() as { signed_url: string };
  return data.signed_url;
}

export class ObjectStorageService {
  private privateDir() {
    const value = process.env.PRIVATE_OBJECT_DIR;
    if (!value) throw new Error("PRIVATE_OBJECT_DIR is not configured");
    return value.replace(/\/$/, "");
  }

  async getObjectEntityUploadURL() {
    const fullPath = `${this.privateDir()}/uploads/${randomUUID()}`;
    const { bucketName, objectName } = parsePath(fullPath);
    return signObjectUrl(bucketName, objectName);
  }

  normalizeObjectEntityPath(rawPath: string) {
    if (!rawPath.startsWith("https://storage.googleapis.com/")) return rawPath;
    const pathname = new URL(rawPath).pathname;
    const prefix = this.privateDir();
    return pathname.startsWith(prefix) ? `/objects/${pathname.slice(prefix.length).replace(/^\//, "")}` : pathname;
  }

  async getObjectEntityFile(objectPath: string): Promise<File> {
    if (!objectPath.startsWith("/objects/")) throw new ObjectNotFoundError();
    const { bucketName, objectName } = parsePath(`${this.privateDir()}/${objectPath.slice("/objects/".length)}`);
    const file = objectStorageClient.bucket(bucketName).file(objectName);
    const [exists] = await file.exists();
    if (!exists) throw new ObjectNotFoundError();
    return file;
  }

  async downloadObject(file: File) {
    const [metadata] = await file.getMetadata();
    const stream = Readable.toWeb(file.createReadStream()) as ReadableStream;
    return new Response(stream, {
      headers: {
        "Content-Type": metadata.contentType || "application/octet-stream",
        "Cache-Control": "private, max-age=3600",
        ...(metadata.size ? { "Content-Length": String(metadata.size) } : {}),
      },
    });
  }
}