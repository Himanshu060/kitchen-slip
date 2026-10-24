import { mkdir, writeFile, readFile } from "fs/promises";
import path from "path";

const uploadRoot = path.join(process.cwd(), "uploads");

export async function saveUpload(id: string, file: File): Promise<{ filePath: string; mimeType: string; fileName: string }> {
  await mkdir(uploadRoot, { recursive: true });
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const filePath = path.join(uploadRoot, `${id}-${safeName}`);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);
  return { filePath, mimeType: file.type || "application/octet-stream", fileName: file.name };
}

export async function readUpload(filePath: string) {
  return readFile(filePath);
}
