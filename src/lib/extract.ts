import { z } from "zod";
import { GoogleGenAI } from "@google/genai";
import { SAMPLE_SLIP } from "./sample";
import type { ExtractedSlip } from "./types";

const ExtractedSchema = z.object({
  vendorName: z.string().nullable(),
  slipNo: z.string().nullable(),
  slipDate: z.string().nullable(),
  lines: z.array(
    z.object({
      name: z.string(),
      qty: z.number().nullable(),
      unit: z.string().nullable(),
      price: z.number().nullable(),
      amount: z.number().nullable(),
    }),
  ),
  total: z.number().nullable(),
});

const READ_PROMPT = `Read this kitchen vendor slip or bill.
Return JSON with vendorName, slipNo, slipDate (YYYY-MM-DD if you can), lines, and total.
Each line needs name, qty, unit, price, amount.
Write names in English letters if they are in another script.
If a value is unreadable, use null.
Do not invent lines that are not on the page.`;

function totalsLookOff(slip: ExtractedSlip): string | null {
  const lineSum = slip.lines.reduce((sum, line) => {
    const amount = Number(line.amount ?? (Number(line.qty || 0) * Number(line.price || 0)));
    return sum + amount;
  }, 0);
  if (slip.total == null) return null;
  if (Math.abs(lineSum - slip.total) > 2) {
    return `Line amounts add to ${lineSum} but the printed total is ${slip.total}. Read the slip again.`;
  }
  return null;
}

export async function readSlip(input: {
  buffer: Buffer;
  mimeType: string;
  useSample?: boolean;
}): Promise<ExtractedSlip> {
  if (input.useSample) return SAMPLE_SLIP;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Add GEMINI_API_KEY to .env, or use the sample slip on the home desk.");
  }

  const first = await callModel(apiKey, input.buffer, input.mimeType, READ_PROMPT);
  const hint = totalsLookOff(first);
  if (!hint) return first;

  return callModel(apiKey, input.buffer, input.mimeType, `${READ_PROMPT}\n\n${hint}`);
}

async function callModel(
  apiKey: string,
  buffer: Buffer,
  mimeType: string,
  prompt: string,
): Promise<ExtractedSlip> {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType, data: buffer.toString("base64") } },
          { text: prompt },
        ],
      },
    ],
    config: {
      temperature: 0,
      responseMimeType: "application/json",
    },
  });

  const text = response.text;
  if (!text) throw new Error("The reader returned an empty page.");
  return ExtractedSchema.parse(JSON.parse(text));
}
