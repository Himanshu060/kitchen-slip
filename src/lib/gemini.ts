import { GoogleGenAI } from "@google/genai";

/** Fast extractors first. Only fall through if that id is missing for the key. */
const MODELS = ["gemini-3.1-flash-lite", "gemini-flash-lite-latest", "gemini-3-flash-preview"];

function isMissingModel(error: unknown): boolean {
  const text = error instanceof Error ? error.message : String(error);
  return text.includes("NOT_FOUND") || text.includes("not found") || text.includes("no longer available");
}

export async function generateJson(args: {
  parts: Array<Record<string, unknown>>;
}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Add GEMINI_API_KEY to .env, or use the sample buttons on the desk.");
  }

  const ai = new GoogleGenAI({ apiKey });
  let lastError: unknown;

  for (const model of MODELS) {
    try {
      return await callModel(ai, model, args.parts, true);
    } catch (error) {
      lastError = error;
      if (isMissingModel(error)) continue;
      if (isThinkingRejected(error)) {
        try {
          return await callModel(ai, model, args.parts, false);
        } catch (retryError) {
          lastError = retryError;
          if (!isMissingModel(retryError)) break;
        }
        continue;
      }
      break;
    }
  }

  throw new Error(shortGeminiError(lastError));
}

async function callModel(
  ai: GoogleGenAI,
  model: string,
  parts: Array<Record<string, unknown>>,
  disableThinking: boolean,
): Promise<string> {
  const response = await ai.models.generateContent({
    model,
    contents: [{ role: "user", parts }],
    config: {
      temperature: 0,
      responseMimeType: "application/json",
      ...(disableThinking ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
    },
  });
  const text = response.text;
  if (!text) throw new Error("The reader returned an empty page.");
  return text;
}

function isThinkingRejected(error: unknown): boolean {
  const text = error instanceof Error ? error.message : String(error);
  return /thinking/i.test(text) || /invalid.*config/i.test(text);
}

function shortGeminiError(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  if (text.includes("no longer available") || text.includes("NOT_FOUND")) {
    return "Gemini could not find a working model for this key. Check GEMINI_API_KEY and try again.";
  }
  if (text.includes("API key")) {
    return "The Gemini API key was rejected. Create a new key in Google AI Studio and put it in .env.";
  }
  return "Gemini could not read this file. Try a clearer photo or PDF.";
}
