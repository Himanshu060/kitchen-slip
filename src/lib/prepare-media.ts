import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import sharp from "sharp";

const MAX_EDGE = 1280;
const JPEG_QUALITY = 72;

export type PreparedMedia = {
  buffer: Buffer;
  mimeType: string;
};

export async function prepareForRead(input: {
  buffer: Buffer;
  mimeType: string;
  fileName?: string;
}): Promise<PreparedMedia> {
  const mime = (input.mimeType || "").toLowerCase();
  const name = (input.fileName || "").toLowerCase();
  const isPdf = mime.includes("pdf") || name.endsWith(".pdf");
  const isImage =
    mime.startsWith("image/") || /\.(jpe?g|png|webp|gif|heic|bmp)$/i.test(name);

  try {
    if (isPdf) {
      const page = await firstPdfPage(input.buffer);
      return shrinkToJpeg(page);
    }
    if (isImage) {
      return shrinkToJpeg(input.buffer);
    }
  } catch {
    // Keep the original bytes so the reader still gets one shot.
  }

  return {
    buffer: input.buffer,
    mimeType: input.mimeType || "application/octet-stream",
  };
}

function pdfjsFolderPath(folder: string): string {
  const require = createRequire(join(process.cwd(), "package.json"));
  const root = dirname(require.resolve("pdfjs-dist/package.json"));
  return join(root, folder).replaceAll("\\", "/") + "/";
}

async function firstPdfPage(buffer: Buffer): Promise<Buffer> {
  const { pdf } = await import("pdf-to-img");
  const doc = await pdf(buffer, {
    scale: 1.6,
    format: "jpeg",
    docInitParams: {
      standardFontDataUrl: pdfjsFolderPath("standard_fonts"),
      cMapUrl: pdfjsFolderPath("cmaps"),
      cMapPacked: true,
    },
  });
  try {
    return await doc.getPage(1);
  } finally {
    await doc.destroy();
  }
}

async function shrinkToJpeg(buffer: Buffer): Promise<PreparedMedia> {
  const jpeg = await sharp(buffer)
    .rotate()
    .resize({
      width: MAX_EDGE,
      height: MAX_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();

  return { buffer: jpeg, mimeType: "image/jpeg" };
}
