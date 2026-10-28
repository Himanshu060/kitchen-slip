import { z } from "zod";
import { generateJson } from "./gemini";
import type { ExtractedSlip } from "./types";

export { SAMPLE_SPOKEN } from "./sample-spoken";

const SpokenSchema = z.object({
  lines: z.array(
    z.object({
      name: z.string(),
      qty: z.number().nullable(),
      unit: z.string().nullable(),
    }),
  ),
});

const WORD_QTY: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  twelve: 12,
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function stripFiller(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.]/g, "")
    .replace(
      /^(please\s+)?(create|make|place|add)?\s*(an?\s+)?order\s+(for|of)\s+/i,
      "",
    )
    .replace(/^(i\s+(want|need|would like)\s+)/i, "")
    .replace(/\s+please$/i, "")
    .trim();
}

function parseLocally(text: string): ExtractedSlip {
  const cleaned = stripFiller(text);
  const parts = cleaned
    .split(/\s+and\s+|,\s*/)
    .map((part) => part.trim())
    .filter(Boolean);

  const lines = parts.map((part) => {
    const match = part.match(
      /^(?:(\d+(?:\.\d+)?)|([a-z]+))\s+(?:x\s+)?(.+)$/i,
    );
    if (!match) {
      return { name: part, qty: 1, unit: "pcs", price: null, amount: null };
    }

    const digit = match[1] ? Number(match[1]) : null;
    const word = match[2] ? WORD_QTY[match[2].toLowerCase()] : undefined;
    const qty = digit ?? word ?? 1;
    const name = (match[3] || part).trim();
    return { name, qty, unit: "pcs", price: null, amount: null };
  });

  return {
    vendorName: null,
    slipNo: null,
    slipDate: today(),
    lines,
    total: null,
    spokenText: text.trim(),
  };
}

async function parseWithGemini(text: string): Promise<ExtractedSlip> {
  if (!process.env.GEMINI_API_KEY) return parseLocally(text);

  const raw = await generateJson({
    parts: [
      {
        text: `This is a spoken kitchen order. Extract only the dishes and quantities.
Return JSON { "lines": [{ "name", "qty", "unit" }] }.
Use English letters. If quantity is missing, use 1. Unit is usually pcs.
Do not invent dishes that were not said.

Spoken: ${text}`,
      },
    ],
  });
  const parsed = SpokenSchema.parse(JSON.parse(raw));
  return {
    vendorName: null,
    slipNo: null,
    slipDate: today(),
    lines: parsed.lines.map((line) => ({
      name: line.name,
      qty: line.qty ?? 1,
      unit: line.unit || "pcs",
      price: null,
      amount: null,
    })),
    total: null,
    spokenText: text.trim(),
  };
}

export async function readSpokenOrder(text: string): Promise<ExtractedSlip> {
  const spoken = text.trim();
  if (!spoken) throw new Error("Say or type what to put on the order.");

  const local = parseLocally(spoken);
  if (local.lines.length > 0) return local;

  try {
    const fromModel = await parseWithGemini(spoken);
    if (fromModel.lines.length > 0) return fromModel;
  } catch {
    // Local already missed. A model miss still ends below.
  }

  throw new Error("Could not hear any dishes in that sentence.");
}
