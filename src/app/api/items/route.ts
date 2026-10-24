import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const items = await prisma.kitchenItem.findMany({
    where: q ? { name: { contains: q } } : undefined,
    orderBy: { name: "asc" },
    take: 40,
  });
  return NextResponse.json(items);
}
