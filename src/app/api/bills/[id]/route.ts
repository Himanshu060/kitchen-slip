import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { liveTotal } from "@/lib/match";
import type { SlipDraft, SlipLine } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const draft = await prisma.billDraft.findUnique({
    where: { id },
    include: { vendor: true, order: true },
  });
  if (!draft) return NextResponse.json({ error: "Draft not found." }, { status: 404 });
  return NextResponse.json(draft);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const draft = await prisma.billDraft.findUnique({ where: { id } });
  if (!draft) return NextResponse.json({ error: "Draft not found." }, { status: 404 });
  if (draft.status === "confirmed") {
    return NextResponse.json({ error: "This slip is already an order." }, { status: 409 });
  }

  const body = (await request.json()) as Partial<SlipDraft>;
  const current = (draft.draft ?? {}) as SlipDraft;
  const lines = (body.lines ?? current.lines ?? []).map((line: SlipLine) => ({
    ...line,
    amount: Number(line.qty || 0) * Number(line.price || 0),
  }));

  const next: SlipDraft = {
    vendorName: body.vendorName ?? current.vendorName ?? "",
    slipNo: body.slipNo ?? current.slipNo ?? null,
    slipDate: body.slipDate ?? current.slipDate ?? null,
    lines,
    total: liveTotal(lines),
  };

  const updated = await prisma.billDraft.update({
    where: { id },
    data: { draft: next as object, status: "draft" },
    include: { vendor: true, order: true },
  });

  return NextResponse.json(updated);
}
