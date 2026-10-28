import { mkdir, writeFile, readFile } from "fs/promises";
import path from "path";

function uploadRoot() {
  if (process.env.UPLOAD_DIR) return process.env.UPLOAD_DIR;
  if (process.env.VERCEL) return path.join("/tmp", "uploads");
  return path.join(process.cwd(), "uploads");
}

export async function saveUpload(
  id: string,
  file: File,
  buffer?: Buffer,
): Promise<{ filePath: string; mimeType: string; fileName: string }> {
  const root = uploadRoot();
  await mkdir(root, { recursive: true });
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const filePath = path.join(root, `${id}-${safeName}`);
  const bytes = buffer ?? Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, bytes);
  const mimeType =
    file.type ||
    (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/octet-stream");
  return { filePath, mimeType, fileName: file.name };
}

export async function readUpload(filePath: string) {
  return readFile(filePath);
}
