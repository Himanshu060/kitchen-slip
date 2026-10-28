export type SlipLine = {
  nameOnSlip: string;
  kitchenItemId: string | null;
  kitchenItemName: string | null;
  qty: number;
  unit: string;
  price: number;
  amount: number;
};

export type SlipDraft = {
  vendorName: string;
  slipNo: string | null;
  slipDate: string | null;
  lines: SlipLine[];
  total: number;
  spokenText?: string | null;
};

export type ExtractedSlip = {
  vendorName: string | null;
  slipNo: string | null;
  slipDate: string | null;
  lines: Array<{
    name: string;
    qty: number | null;
    unit: string | null;
    price: number | null;
    amount: number | null;
  }>;
  total: number | null;
  spokenText?: string | null;
};

export type KitchenItemRow = {
  id: string;
  name: string;
  unit: string;
  typicalPrice: number;
};

export type VendorRow = {
  id: string;
  name: string;
};
