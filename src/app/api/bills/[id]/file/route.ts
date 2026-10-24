import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readUpload } from "@/lib/files";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const draft = await prisma.billDraft.findUnique({ where: { id } });
  if (!draft || !draft.filePath) {
    return NextResponse.json({ error: "No file on this draft." }, { status: 404 });
  }

  const bytes = await readUpload(draft.filePath);
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": draft.mimeType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${draft.fileName}"`,
    },
  });
}
