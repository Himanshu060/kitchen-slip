import { DraftDesk } from "@/components/DraftDesk";

export default async function BillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DraftDesk id={id} />;
}
