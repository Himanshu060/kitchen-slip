import { prisma } from "./prisma";
import { cleanName, nameScore } from "./similarity";
import type { ExtractedSlip, KitchenItemRow, SlipDraft, SlipLine } from "./types";

const PREFILL_ABOVE = 50;

export async function attachKitchenItems(
  vendorId: string,
  extracted: ExtractedSlip,
): Promise<SlipDraft> {
  const items = await prisma.kitchenItem.findMany();
  const nicknames = await prisma.vendorNickname.findMany({
    where: { vendorId },
  });

  const nicknameByRaw = new Map(
    nicknames.map((row) => [cleanName(row.rawName), row.kitchenItemId]),
  );

  const lines: SlipLine[] = extracted.lines.map((line) => {
    const qty = Number(line.qty ?? 0);
    const price = Number(line.price ?? 0);
    const amount = Number(line.amount ?? qty * price);
    const nameOnSlip = (line.name || "").trim();
    const knownId = nicknameByRaw.get(cleanName(nameOnSlip));

    if (knownId) {
      const known = items.find((item) => item.id === knownId);
      const nextPrice = price || known?.typicalPrice || 0;
      return {
        nameOnSlip,
        kitchenItemId: known?.id ?? null,
        kitchenItemName: known?.name ?? null,
        qty,
        unit: line.unit || known?.unit || "kg",
        price: nextPrice,
        amount: qty * nextPrice,
      };
    }

    const best = pickBest(nameOnSlip, items);
    const prefill = best && best.score > PREFILL_ABOVE;
    const nextPrice = price || (prefill ? best.item.typicalPrice : 0);

    return {
      nameOnSlip,
      kitchenItemId: prefill ? best.item.id : null,
      kitchenItemName: prefill ? best.item.name : null,
      qty,
      unit: line.unit || (prefill ? best.item.unit : "kg"),
      price: nextPrice,
      amount: qty * nextPrice,
    };
  });

  const summed = lines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0);

  return {
    vendorName: extracted.vendorName || "",
    slipNo: extracted.slipNo,
    slipDate: extracted.slipDate,
    lines,
    total: Number(extracted.total ?? summed),
    spokenText: extracted.spokenText ?? null,
  };
}

function pickBest(name: string, items: KitchenItemRow[]) {
  let winner: { item: KitchenItemRow; score: number } | null = null;
  for (const item of items) {
    const score = nameScore(name, item.name);
    if (!winner || score > winner.score) winner = { item, score };
  }
  return winner;
}

export function liveTotal(lines: SlipLine[]): number {
  return lines.reduce((sum, line) => {
    const amount = Number(line.qty || 0) * Number(line.price || 0);
    return sum + amount;
  }, 0);
}
