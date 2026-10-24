import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveUpload } from "@/lib/files";
import { readSlip } from "@/lib/extract";
import { attachKitchenItems } from "@/lib/match";

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
  const file = form.get("file");

  if (!vendorId) {
    return NextResponse.json({ error: "Pick a vendor first." }, { status: 400 });
  }

  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) {
    return NextResponse.json({ error: "Unknown vendor." }, { status: 404 });
  }

  if (!useSample && (!(file instanceof File) || file.size === 0)) {
    return NextResponse.json({ error: "Drop a photo or PDF of the slip." }, { status: 400 });
  }

  const draft = await prisma.billDraft.create({
    data: {
      vendorId,
      status: "reading",
      fileName: useSample ? "sample-slip.txt" : (file as File).name,
      mimeType: useSample ? "text/plain" : (file as File).type || "application/octet-stream",
      filePath: "",
    },
  });

  try {
    let buffer = Buffer.from("sample");
    let mimeType = "text/plain";

    if (!useSample && file instanceof File) {
      const saved = await saveUpload(draft.id, file);
      buffer = Buffer.from(await file.arrayBuffer());
      mimeType = saved.mimeType;
      await prisma.billDraft.update({
        where: { id: draft.id },
        data: { filePath: saved.filePath, fileName: saved.fileName, mimeType: saved.mimeType },
      });
    }

    const extracted = await readSlip({ buffer, mimeType, useSample });
    const matched = await attachKitchenItems(vendorId, extracted);

    const updated = await prisma.billDraft.update({
      where: { id: draft.id },
      data: {
        status: "draft",
        extracted: extracted as object,
        draft: matched as object,
      },
      include: { vendor: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not read this slip.";
    await prisma.billDraft.update({
      where: { id: draft.id },
      data: { status: "failed", error: message },
    });
    return NextResponse.json({ id: draft.id, error: message }, { status: 422 });
  }
}
