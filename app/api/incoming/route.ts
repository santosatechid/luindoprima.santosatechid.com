import { type NextRequest, NextResponse } from "next/server";

import { bad, guard } from "@/lib/authGuard";
import { handlePrismaError } from "@/services/errorHandler";
import { prisma } from "@/services/prisma";

const include = {
  supplier: true,
  createdBy: { select: { name: true } },
  items: { include: { item: true } },
} as const;

export async function GET() {
  const g = await guard();
  if (g.error) return g.error;

  const rows = await prisma.incoming.findMany({
    include,
    orderBy: { receivedAt: "desc" },
  });
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const g = await guard(["ADMIN"]);
  if (g.error) return g.error;

  try {
    const body = await request.json();
    const rows: { itemId: string; qty: number }[] = body.items ?? [];

    if (!body.supplierId || rows.length === 0) {
      return bad("Supplier dan minimal satu item wajib diisi.");
    }
    if (rows.some((row) => !row.itemId || Number(row.qty) <= 0)) {
      return bad("Jumlah setiap item harus lebih dari nol.");
    }

    const year = new Date().getFullYear();
    const count = await prisma.incoming.count({
      where: { number: { startsWith: `BM-${year}-` } },
    });
    const number = `BM-${year}-${String(count + 1).padStart(4, "0")}`;

    const incoming = await prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.findFirst({
        where: { id: body.supplierId, deletedAt: null },
        select: { id: true },
      });
      if (!supplier) throw new Error("Supplier sudah dihapus.");

      const itemIds = [...new Set(rows.map((row) => row.itemId))];
      const liveItems = await tx.item.count({
        where: { id: { in: itemIds }, deletedAt: null },
      });
      if (liveItems !== itemIds.length) {
        throw new Error("Ada item yang sudah dihapus.");
      }

      const created = await tx.incoming.create({
        data: {
          number,
          supplierId: body.supplierId,
          receivedAt: body.receivedAt ? new Date(body.receivedAt) : new Date(),
          documentNo: body.documentNo || null,
          note: body.note || null,
          createdById: g.user.id,
          items: {
            create: rows.map((row) => ({
              itemId: row.itemId,
              qty: Number(row.qty),
            })),
          },
        },
        include,
      });

      for (const row of rows) {
        await tx.item.update({
          where: { id: row.itemId },
          data: { stockGudang: { increment: Number(row.qty) } },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: g.user.id,
          action: "RECEIVE",
          entity: "incoming",
          entityId: created.id,
          meta: JSON.stringify({ number }),
        },
      });

      return created;
    });

    return NextResponse.json(incoming, { status: 201 });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "Supplier sudah dihapus." ||
        error.message === "Ada item yang sudah dihapus.")
    ) {
      return bad(error.message);
    }
    return handlePrismaError(error);
  }
}
