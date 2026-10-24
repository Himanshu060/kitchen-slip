import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cleanName } from "@/lib/similarity";
import { liveTotal } from "@/lib/match";
import type { SlipDraft } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const draft = await prisma.billDraft.findUnique({
    where: { id },
    include: { order: { include: { lines: true, vendor: true } } },
  });

  if (!draft) return NextResponse.json({ error: "Draft not found." }, { status: 404 });
  if (draft.order) return NextResponse.json(draft.order);

  const slip = (draft.draft ?? {}) as SlipDraft;
  const lines = slip.lines ?? [];
  if (lines.length === 0) {
    return NextResponse.json({ error: "Add at least one line before confirming." }, { status: 400 });
  }

  const total = liveTotal(lines);

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        vendorId: draft.vendorId,
        billDraftId: draft.id,
        slipNo: slip.slipNo,
        slipDate: slip.slipDate,
        total,
        lines: {
          create: lines.map((line) => ({
            kitchenItemId: line.kitchenItemId,
            nameOnSlip: line.nameOnSlip,
            qty: Number(line.qty || 0),
            unit: line.unit || "kg",
            price: Number(line.price || 0),
            amount: Number(line.qty || 0) * Number(line.price || 0),
          })),
        },
      },
      include: { lines: { include: { kitchenItem: true } }, vendor: true },
    });

    await tx.billDraft.update({
      where: { id: draft.id },
      data: { status: "confirmed" },
    });

    for (const line of lines) {
      if (!line.kitchenItemId || !line.nameOnSlip.trim()) continue;
      const rawName = cleanName(line.nameOnSlip);
      await tx.vendorNickname.upsert({
        where: { rawName_vendorId: { rawName, vendorId: draft.vendorId } },
        create: {
          rawName,
          vendorId: draft.vendorId,
          kitchenItemId: line.kitchenItemId,
        },
        update: {
          kitchenItemId: line.kitchenItemId,
          timesUsed: { increment: 1 },
        },
      });
    }

    return created;
  });

  return NextResponse.json(order);
}
