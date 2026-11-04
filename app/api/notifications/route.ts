import { NextResponse } from "next/server";

import { guard } from "@/lib/authGuard";
import { prisma } from "@/services/prisma";

/** Log pengiriman WhatsApp. Hanya Admin yang boleh melihat nomor & isi pesan. */
export async function GET() {
  const g = await guard(["ADMIN"]);
  if (g.error) return g.error;

  const rows = await prisma.notification.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return NextResponse.json(rows);
}
