"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { shrinkFile } from "@/lib/resize";
import type { VendorRow } from "@/lib/types";

export function NewSlipDesk() {
  const router = useRouter();
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [vendorId, setVendorId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/vendors")
      .then((res) => res.json())
      .then((rows: VendorRow[]) => {
        setVendors(rows);
        const preferred = rows.find((row) => row.name === "Green Valley Produce") ?? rows[0];
        if (preferred) setVendorId(preferred.id);
      })
      .catch(() => setError("Could not load vendors. Did you run the database seed?"));
  }, []);

  async function submit(useSample: boolean) {
    setError("");
    if (!vendorId) {
      setError("Choose who this slip is from.");
      return;
    }

    setBusy(true);
    try {
      const body = new FormData();
      body.set("vendorId", vendorId);
      if (useSample) {
        body.set("sample", "1");
      } else {
        if (!file) {
          setError("Drop a photo or PDF first.");
          setBusy(false);
          return;
        }
        body.set("file", await shrinkFile(file));
      }

      const res = await fetch("/api/bills", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not read the slip.");
      router.push(`/bills/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="paper-sheet rounded-[28px] p-8">
        <p className="text-sm uppercase tracking-[0.22em] text-[var(--moss)]">This morning’s delivery</p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-4xl leading-tight">
          Lay the paper slip on the desk.
        </h2>
        <p className="mt-3 max-w-md text-[var(--ink)]/70">
          KitchenSlip copies the names, quantities, and prices into a draft you can fix.
          Confirming it writes a kitchen order.
        </p>

        <div className="mt-8 space-y-5">
          <label className="block">
            <span className="text-xs uppercase tracking-[0.18em] text-[var(--moss)]">Vendor</span>
            <select
              value={vendorId}
              onChange={(event) => setVendorId(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-[var(--rule)] bg-white px-4 py-3 text-[var(--ink)] outline-none"
            >
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block cursor-pointer rounded-2xl border border-dashed border-[var(--rust)]/50 bg-[var(--rust)]/5 px-5 py-10 text-center">
            <input
              type="file"
              accept="image/*,.pdf,application/pdf"
              className="hidden"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <p className="font-[family-name:var(--font-display)] text-2xl italic">Photo or PDF</p>
            <p className="mt-2 text-sm text-[var(--ink)]/60">
              {file ? file.name : "Tap here or drop the slip on this tile"}
            </p>
          </label>

          {error ? <p className="text-sm text-[var(--rust)]">{error}</p> : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => submit(false)}
              className="rounded-full bg-[var(--moss)] px-6 py-3 text-white disabled:opacity-60"
            >
              {busy ? "Reading the slip…" : "Read this slip"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => submit(true)}
              className="rounded-full border border-[var(--moss)] px-6 py-3 text-[var(--moss)] disabled:opacity-60"
            >
              Try the sample produce slip
            </button>
          </div>
        </div>
      </div>

      <aside className="paper-sheet relative overflow-hidden rounded-[28px] p-8">
        <div className="stamp absolute top-8 right-8 px-3 py-1 text-xs text-[var(--rust)]">OPEN</div>
        <p className="font-[family-name:var(--font-display)] text-2xl italic">How the desk works</p>
        <ol className="mt-6 space-y-4 text-[var(--ink)]/80">
          <li>1. Choose the vendor who sent the goods.</li>
          <li>2. KitchenSlip fills a paper draft from the photo.</li>
          <li>3. Cross out a line, fix a quantity, or pick the kitchen item.</li>
          <li>4. Confirm. That is the moment an order is written.</li>
        </ol>
        <p className="mt-8 text-sm text-[var(--ink)]/55">
          A short name such as “Tmt” stays blank until you pick Tomato. Next time
          that vendor uses it, KitchenSlip remembers.
        </p>
      </aside>
    </section>
  );
}
