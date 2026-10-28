"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { KitchenItemRow, SlipDraft, SlipLine } from "@/lib/types";

type DraftRecord = {
  id: string;
  status: string;
  error?: string | null;
  filePath?: string;
  mimeType?: string;
  vendor: { id: string; name: string };
  draft: SlipDraft | null;
  order?: { id: string } | null;
};

const emptyLine = (): SlipLine => ({
  nameOnSlip: "",
  kitchenItemId: null,
  kitchenItemName: null,
  qty: 1,
  unit: "kg",
  price: 0,
  amount: 0,
});

export function DraftDesk({ id }: { id: string }) {
  const router = useRouter();
  const [record, setRecord] = useState<DraftRecord | null>(null);
  const [items, setItems] = useState<KitchenItemRow[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/items")
      .then((res) => res.json())
      .then(setItems)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/bills/${id}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.error) setError(data.error);
        else setRecord(data);
      } catch {
        if (!cancelled) setError("Could not open this draft.");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (record?.status !== "reading") return;
    let cancelled = false;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/bills/${id}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.error) setError(data.error);
        else setRecord(data);
      } catch {
        // Keep polling until the read finishes or the page leaves.
      }
    }, 1000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [id, record?.status]);

  const slip = record?.draft;
  const total = useMemo(
    () => (slip?.lines ?? []).reduce((sum, line) => sum + Number(line.qty || 0) * Number(line.price || 0), 0),
    [slip],
  );

  function changeLine(index: number, patch: Partial<SlipLine>) {
    if (!record?.draft) return;
    const lines = record.draft.lines.map((line, i) => {
      if (i !== index) return line;
      const next = { ...line, ...patch };
      if (patch.kitchenItemId) {
        const item = items.find((row) => row.id === patch.kitchenItemId);
        next.kitchenItemName = item?.name ?? null;
        if (item && !patch.unit) next.unit = item.unit;
      }
      if (patch.kitchenItemId === "") {
        next.kitchenItemId = null;
        next.kitchenItemName = null;
      }
      next.amount = Number(next.qty || 0) * Number(next.price || 0);
      return next;
    });
    setRecord({ ...record, draft: { ...record.draft, lines, total: lines.reduce((s, l) => s + l.amount, 0) } });
  }

  function changeHeader(patch: Partial<SlipDraft>) {
    if (!record?.draft) return;
    setRecord({ ...record, draft: { ...record.draft, ...patch } });
  }

  function removeLine(index: number) {
    if (!record?.draft) return;
    const lines = record.draft.lines.filter((_, i) => i !== index);
    setRecord({ ...record, draft: { ...record.draft, lines } });
  }

  function addLine() {
    if (!record?.draft) return;
    setRecord({ ...record, draft: { ...record.draft, lines: [...record.draft.lines, emptyLine()] } });
  }

  async function saveAndConfirm() {
    if (!record?.draft) return;
    setBusy(true);
    setError("");
    try {
      const saved = await fetch(`/api/bills/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record.draft),
      });
      const savedJson = await saved.json();
      if (!saved.ok) throw new Error(savedJson.error || "Could not save the draft.");

      const confirmed = await fetch(`/api/bills/${id}/confirm`, { method: "POST" });
      const order = await confirmed.json();
      if (!confirmed.ok) throw new Error(order.error || "Could not write the order.");
      router.push(`/orders/${order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Confirm failed.");
      setBusy(false);
    }
  }

  if (error && !record) {
    return <p className="paper-sheet rounded-[28px] p-8 text-[var(--rust)]">{error}</p>;
  }

  if (!record) {
    return <p className="paper-sheet rounded-[28px] p-8">Opening the draft…</p>;
  }

  if (record.status === "failed") {
    return (
      <div className="paper-sheet rounded-[28px] p-8">
        <p className="font-[family-name:var(--font-display)] text-3xl">Could not read this slip</p>
        <p className="mt-3 text-[var(--rust)]">{record.error}</p>
      </div>
    );
  }

  if (record.status === "reading" || !slip) {
    return (
      <div className="paper-sheet rounded-[28px] p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--moss)]">Reading</p>
        <p className="mt-2 font-[family-name:var(--font-display)] text-3xl">Copying the slip onto paper…</p>
        <p className="mt-3 text-[var(--ink)]/65">
          Names and quantities will land here in a few seconds. You can keep this page open.
        </p>
      </div>
    );
  }

  const hasFile = Boolean(record.filePath);
  const spokenText = slip.spokenText;

  return (
    <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      <aside className="paper-sheet min-h-[420px] overflow-hidden rounded-[28px]">
        {hasFile && record.mimeType?.startsWith("image/") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/bills/${id}/file`} alt="Uploaded slip" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full min-h-[420px] flex-col justify-between p-8">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--moss)]">Source</p>
            <p className="font-[family-name:var(--font-display)] text-3xl italic">
              {spokenText ? "Spoken at the counter" : hasFile ? "PDF slip on file" : "Sample produce slip"}
            </p>
            <p className="text-sm text-[var(--ink)]/60">
              {spokenText ? (
                <>“{spokenText}”</>
              ) : (
                <>From {record.vendor.name}. The draft on the right is what we will write as an order.</>
              )}
            </p>
          </div>
        )}
      </aside>

      <div className="paper-sheet receipt-rule rounded-[28px] p-6 md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--moss)]">Check this draft</p>
            <input
              value={slip.vendorName}
              onChange={(event) => changeHeader({ vendorName: event.target.value })}
              className="mt-1 w-full bg-transparent font-[family-name:var(--font-display)] text-3xl italic outline-none"
            />
          </div>
          <div className="stamp px-3 py-1 text-[10px] text-[var(--moss)]">DRAFT</div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <label>
            <span className="text-xs uppercase tracking-[0.16em] text-[var(--ink)]/45">Slip no</span>
            <input
              value={slip.slipNo ?? ""}
              onChange={(event) => changeHeader({ slipNo: event.target.value })}
              className="mt-1 w-full border-b border-[var(--rule)] bg-transparent py-1 outline-none"
            />
          </label>
          <label>
            <span className="text-xs uppercase tracking-[0.16em] text-[var(--ink)]/45">Date</span>
            <input
              value={slip.slipDate ?? ""}
              onChange={(event) => changeHeader({ slipDate: event.target.value })}
              className="mt-1 w-full border-b border-[var(--rule)] bg-transparent py-1 outline-none"
            />
          </label>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.14em] text-[var(--ink)]/45">
              <tr>
                <th className="pb-2">On the slip</th>
                <th className="pb-2">Kitchen item</th>
                <th className="pb-2">Qty</th>
                <th className="pb-2">Unit</th>
                <th className="pb-2">Price</th>
                <th className="pb-2">Amount</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {slip.lines.map((line, index) => (
                <tr key={`${line.nameOnSlip}-${index}`} className="align-top">
                  <td className="pr-2 pb-3">
                    <input
                      value={line.nameOnSlip}
                      onChange={(event) => changeLine(index, { nameOnSlip: event.target.value })}
                      className="w-full border-b border-[var(--rule)] bg-transparent py-1 outline-none"
                    />
                  </td>
                  <td className="pr-2 pb-3">
                    <select
                      value={line.kitchenItemId ?? ""}
                      onChange={(event) => changeLine(index, { kitchenItemId: event.target.value })}
                      className="w-full border-b border-[var(--rule)] bg-transparent py-1 outline-none"
                    >
                      <option value="">Pick an item</option>
                      {items.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="pr-2 pb-3">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={line.qty}
                      onChange={(event) => changeLine(index, { qty: Number(event.target.value) })}
                      className="w-20 border-b border-[var(--rule)] bg-transparent py-1 outline-none"
                    />
                  </td>
                  <td className="pr-2 pb-3">
                    <input
                      value={line.unit}
                      onChange={(event) => changeLine(index, { unit: event.target.value })}
                      className="w-16 border-b border-[var(--rule)] bg-transparent py-1 outline-none"
                    />
                  </td>
                  <td className="pr-2 pb-3">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={line.price}
                      onChange={(event) => changeLine(index, { price: Number(event.target.value) })}
                      className="w-20 border-b border-[var(--rule)] bg-transparent py-1 outline-none"
                    />
                  </td>
                  <td className="pr-2 pb-3 pt-1">₹{(Number(line.qty || 0) * Number(line.price || 0)).toFixed(0)}</td>
                  <td className="pb-3">
                    <button type="button" onClick={() => removeLine(index)} className="text-[var(--rust)]">
                      Cross out
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button type="button" onClick={addLine} className="mt-2 text-sm text-[var(--moss)]">
          + Add a missed line
        </button>

        <div className="mt-8 flex items-end justify-between gap-4 border-t border-dashed border-[var(--rule)] pt-4">
          <p className="text-sm text-[var(--ink)]/55">
            Amounts update as you type. Confirm is the only write that creates an order.
          </p>
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink)]/45">Total</p>
            <p className="font-[family-name:var(--font-display)] text-4xl">₹{total.toFixed(0)}</p>
          </div>
        </div>

        {error ? <p className="mt-4 text-sm text-[var(--rust)]">{error}</p> : null}

        <button
          type="button"
          disabled={busy}
          onClick={saveAndConfirm}
          className="mt-6 rounded-full bg-[var(--rust)] px-6 py-3 text-white disabled:opacity-60"
        >
          {busy ? "Writing the order…" : "Confirm and write order"}
        </button>
      </div>
    </section>
  );
}
