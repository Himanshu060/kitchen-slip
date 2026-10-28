import { z } from "zod";
import { SAMPLE_SLIP } from "./sample";
import { generateJson } from "./gemini";
import { prepareForRead } from "./prepare-media";
import type { ExtractedSlip } from "./types";

const LineSchema = z.object({
  name: z.string(),
  qty: z.coerce.number().nullable(),
  unit: z.string().nullable(),
  price: z.coerce.number().nullable(),
  amount: z.coerce.number().nullable(),
});

const ExtractedSchema = z.object({
  vendorName: z.string().nullable(),
  slipNo: z.string().nullable(),
  slipDate: z.string().nullable(),
  lines: z.array(LineSchema),
  total: z.coerce.number().nullable(),
});

function parseJsonLoose(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.search(/[\[{]/);
    const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }
    throw new Error("The reader did not return JSON for this bill.");
  }
}

const READ_PROMPT = `Read this kitchen vendor slip or bill.
Return ONE JSON object, never a JSON array. Shape:
{"vendorName": string|null, "slipNo": string|null, "slipDate": "YYYY-MM-DD"|null, "lines": [{"name": string, "qty": number|null, "unit": string|null, "price": number|null, "amount": number|null}], "total": number|null}
Use the restaurant or seller name as vendorName.
Skip packing-only rows with amount 0 if a food line is present.
Write names in English letters. If a value is unreadable, use null.
Do not invent lines.`;

export function coerceSlip(raw: unknown): ExtractedSlip {
  let value = raw;
  if (typeof value === "string") {
    value = parseJsonLoose(value);
  }
  if (Array.isArray(value)) {
    value = {
      vendorName: null,
      slipNo: null,
      slipDate: null,
      lines: value,
      total: null,
    };
  }
  if (value && typeof value === "object") {
    const row = value as Record<string, unknown>;
    if (!Array.isArray(row.lines) && Array.isArray(row.items)) {
      row.lines = row.items;
    }
  }

  const parsed = ExtractedSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error("Could not read the lines on this bill. Try a clearer photo or PDF.");
  }
  return parsed.data;
}

export async function readSlip(input: {
  buffer: Buffer;
  mimeType: string;
  fileName?: string;
  useSample?: boolean;
}): Promise<ExtractedSlip> {
  if (input.useSample) return SAMPLE_SLIP;

  const prepared = await prepareForRead({
    buffer: input.buffer,
    mimeType: input.mimeType || "application/pdf",
    fileName: input.fileName,
  });

  const text = await generateJson({
    parts: [
      {
        inlineData: {
          mimeType: prepared.mimeType,
          data: prepared.buffer.toString("base64"),
        },
      },
      { text: READ_PROMPT },
    ],
  });

  return coerceSlip(text);
}
