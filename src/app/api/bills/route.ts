import { after, NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveUpload } from "@/lib/files";
import { bytesHash } from "@/lib/hash";
import { runReadJob } from "@/lib/read-job";

export const maxDuration = 60;

export async function GET() {
  const drafts = await prisma.billDraft.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { vendor: true, order: true },
  });
  return NextResponse.json(drafts);
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const vendorId = String(form.get("vendorId") || "");
  const useSample = String(form.get("sample") || "") === "1";
  const spoken = String(form.get("spoken") || "") === "1";
  const transcript = String(form.get("transcript") || "").trim();
  const file = form.get("file");

  if (!vendorId) {
    return NextResponse.json({ error: "Pick a vendor first." }, { status: 400 });
  }

  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) {
    return NextResponse.json({ error: "Unknown vendor." }, { status: 404 });
  }

  if (!useSample && !spoken && (!(file instanceof File) || file.size === 0)) {
    return NextResponse.json({ error: "Drop a photo, PDF, or speak an order." }, { status: 400 });
  }

  if (spoken && !transcript) {
    return NextResponse.json({ error: "Say or type the order first." }, { status: 400 });
  }

  const source = spoken ? "spoken" : useSample ? "sample" : "upload";
  const draft = await prisma.billDraft.create({
    data: {
      vendorId,
      status: "reading",
      source,
      transcript: spoken ? transcript : null,
      fileName: spoken ? "spoken.txt" : useSample ? "sample-slip.txt" : (file as File).name,
      mimeType: spoken || useSample ? "text/plain" : (file as File).type || "application/octet-stream",
      filePath: "",
    },
  });

  try {
    if (source === "upload" && file instanceof File) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const saved = await saveUpload(draft.id, file, buffer);
      await prisma.billDraft.update({
        where: { id: draft.id },
        data: {
          filePath: saved.filePath,
          fileName: saved.fileName,
          mimeType: saved.mimeType,
          fileHash: bytesHash(buffer),
        },
      });
    }

    after(() => runReadJob(draft.id));
    return NextResponse.json({ id: draft.id, status: "reading" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save this slip.";
    await prisma.billDraft.update({
      where: { id: draft.id },
      data: { status: "failed", error: message },
    });
    return NextResponse.json({ id: draft.id, error: message }, { status: 422 });
  }
}
