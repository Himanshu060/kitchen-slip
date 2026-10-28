import { prisma } from "./prisma";
import { readSlip } from "./extract";
import { readSpokenOrder } from "./spoken";
import { attachKitchenItems } from "./match";
import { readUpload } from "./files";
import { withReadSlot } from "./slot";
import type { ExtractedSlip } from "./types";

export async function runReadJob(draftId: string): Promise<void> {
  const started = Date.now();
  const draft = await prisma.billDraft.findUnique({
    where: { id: draftId },
    include: { vendor: true },
  });

  if (!draft || draft.status !== "reading") return;

  try {
    let extracted: ExtractedSlip;
    let cacheHit = false;

    if (draft.source === "spoken") {
      extracted = await readSpokenOrder(draft.transcript || "");
    } else if (draft.source === "sample") {
      extracted = await readSlip({
        buffer: Buffer.from("sample"),
        mimeType: "text/plain",
        useSample: true,
      });
    } else {
      const cached = draft.fileHash
        ? await prisma.billDraft.findFirst({
            where: {
              fileHash: draft.fileHash,
              id: { not: draft.id },
              status: { in: ["draft", "confirmed"] },
            },
            orderBy: { createdAt: "desc" },
            select: { extracted: true },
          })
        : null;

      if (cached?.extracted && hasLines(cached.extracted)) {
        extracted = cached.extracted as ExtractedSlip;
        cacheHit = true;
      } else {
        const buffer = await readUpload(draft.filePath);
        extracted = await withReadSlot(() =>
          readSlip({
            buffer,
            mimeType: draft.mimeType,
            fileName: draft.fileName,
          }),
        );
      }
    }

    if (!extracted.vendorName) extracted.vendorName = draft.vendor.name;

    const matched = await attachKitchenItems(draft.vendorId, extracted);
    if (!matched.vendorName) matched.vendorName = draft.vendor.name;

    await prisma.billDraft.update({
      where: { id: draft.id },
      data: {
        status: "draft",
        extracted: extracted as object,
        draft: matched as object,
        error: null,
      },
    });

    console.log(
      JSON.stringify({
        draftId,
        source: draft.source,
        cacheHit,
        total_ms: Date.now() - started,
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not read this slip.";
    await prisma.billDraft.update({
      where: { id: draft.id },
      data: { status: "failed", error: message },
    });
    console.log(
      JSON.stringify({
        draftId,
        source: draft.source,
        failed: true,
        total_ms: Date.now() - started,
      }),
    );
  }
}

function hasLines(value: unknown): boolean {
  return Boolean(
    value &&
      typeof value === "object" &&
      Array.isArray((value as { lines?: unknown }).lines) &&
      (value as { lines: unknown[] }).lines.length > 0,
  );
}
