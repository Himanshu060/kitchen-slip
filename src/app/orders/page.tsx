import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { vendor: true, lines: true },
  });

  return (
    <section className="paper-sheet rounded-[28px] p-8">
      <p className="text-xs uppercase tracking-[0.22em] text-[var(--moss)]">Written orders</p>
      <h2 className="mt-2 font-[family-name:var(--font-display)] text-4xl italic">The ticket rail</h2>

      {orders.length === 0 ? (
        <p className="mt-8 text-[var(--ink)]/65">No orders yet. Confirm a draft slip first.</p>
      ) : (
        <ul className="mt-8 divide-y divide-[var(--rule)]">
          {orders.map((order) => (
            <li key={order.id} className="flex items-center justify-between gap-4 py-4">
              <div>
                <p className="font-[family-name:var(--font-display)] text-2xl italic">{order.vendor.name}</p>
                <p className="text-sm text-[var(--ink)]/55">
                  {order.slipNo || "No slip no"} · {order.lines.length} lines
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl">₹{order.total.toFixed(0)}</p>
                <Link href={`/orders/${order.id}`} className="text-sm text-[var(--rust)]">
                  Open ticket
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
