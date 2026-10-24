import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { vendor: true, lines: { include: { kitchenItem: true } } },
  });
  if (!order) notFound();

  return (
    <section className="mx-auto max-w-2xl">
      <div className="paper-sheet relative rounded-[28px] p-8">
        <div className="stamp absolute top-8 right-8 px-3 py-1 text-xs text-[var(--moss)]">ORDERED</div>
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--moss)]">Kitchen order</p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-4xl italic">{order.vendor.name}</h2>
        <p className="mt-2 text-sm text-[var(--ink)]/55">
          {order.slipNo || "No slip no"} · {order.slipDate || "No date"}
        </p>

        <ul className="mt-8 space-y-3">
          {order.lines.map((line) => (
            <li key={line.id} className="flex items-baseline justify-between gap-4 border-b border-dashed border-[var(--rule)] pb-2">
              <div>
                <p className="font-medium">{line.kitchenItem?.name || line.nameOnSlip}</p>
                <p className="text-xs text-[var(--ink)]/50">
                  on slip: {line.nameOnSlip} · {line.qty} {line.unit} @ ₹{line.price}
                </p>
              </div>
              <p>₹{line.amount.toFixed(0)}</p>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex items-end justify-between">
          <Link href="/" className="text-sm text-[var(--rust)]">
            Read another slip
          </Link>
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink)]/45">Total</p>
            <p className="font-[family-name:var(--font-display)] text-4xl">₹{order.total.toFixed(0)}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
