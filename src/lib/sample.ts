import type { ExtractedSlip } from "./types";

/** Built-in produce slip so the desk can be tried without a camera or API key. */
export const SAMPLE_SLIP: ExtractedSlip = {
  vendorName: "Green Valley Produce",
  slipNo: "GV-4412",
  slipDate: "2026-10-20",
  lines: [
    { name: "Tmt", qty: 5, unit: "kg", price: 40, amount: 200 },
    { name: "Onion", qty: 10, unit: "kg", price: 25, amount: 250 },
    { name: "Potato", qty: 8, unit: "kg", price: 22, amount: 176 },
  ],
  total: 626,
};
