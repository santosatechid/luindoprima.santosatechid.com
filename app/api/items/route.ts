import { type NextRequest, NextResponse } from "next/server";

import { bad, guard } from "@/lib/authGuard";
import type { Prisma } from "@/prisma/generated/client";
import { handlePrismaError } from "@/services/errorHandler";
import { prisma } from "@/services/prisma";

const include = {
  supplier: { select: { id: true, name: true } },
  category: { select: { id: true, code: true, name: true } },
} as const;

export async function GET() {
  const g = await guard();
  if (g.error) return g.error;

  const items = await prisma.item.findMany({
    include,
    orderBy: { code: "asc" },
  });
  return NextResponse.json(items);
}

type ItemFields = {
  categoryId: string;
  name: string;
  brand: string | null;
  size: string | null;
  unit: string;
  minStock: number;
  supplierId: string | null;
};

/**
 * Kode item mengikuti kode kategori + nomor urut: FLM-001.
 * `lastNumber` di-increment di baris kategori supaya aman saat dua admin
 * menambah item bersamaan (baris terkunci sampai transaksi selesai).
 */
async function createWithAutoCode(
  tx: Prisma.TransactionClient,
  data: ItemFields & { stockGudang: number },
) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const { categoryId, ...fields } = data;
    const category = await tx.itemCategory.update({
      where: { id: categoryId },
      data: { lastNumber: { increment: 1 } },
    });
    const code = `${category.code}-${String(category.lastNumber).padStart(3, "0")}`;
    const taken = await tx.item.findUnique({
      where: { code },
      select: { id: true },
    });
    if (!taken) {
      return tx.item.create({
        data: { ...fields, categoryId, code },
        include,
      });
    }
  }
  throw new Error("Gagal membuat kode item unik.");
}

export async function POST(request: NextRequest) {
  const g = await guard(["ADMIN"]);
  if (g.error) return g.error;

  try {
    const body = await request.json();
    if (!body.name || !body.categoryId || !body.unit) {
      return bad("Nama, kategori, dan satuan wajib diisi.");
    }

    const item = await prisma.$transaction((tx) =>
      createWithAutoCode(tx, {
        categoryId: body.categoryId,
        name: body.name,
        brand: body.brand || null,
        size: body.size || null,
        unit: body.unit,
        stockGudang: Number(body.stockGudang ?? 0),
        minStock: Number(body.minStock ?? 0),
        supplierId: body.supplierId || null,
      }),
    );

    await prisma.auditLog.create({
      data: {
        actorId: g.user.id,
        action: "CREATE",
        entity: "item",
        entityId: item.id,
        meta: JSON.stringify({ code: item.code }),
      },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return handlePrismaError(error);
  }
}

/** Edit item: kode tetap, stok gudang tidak diubah dari sini (lewat barang masuk). */
export async function PUT(request: NextRequest) {
  const g = await guard(["ADMIN"]);
  if (g.error) return g.error;

  try {
    const body = await request.json();
    if (!body.id) return bad("ID item wajib diisi.");
    if (!body.name || !body.categoryId || !body.unit) {
      return bad("Nama, kategori, dan satuan wajib diisi.");
    }

    const item = await prisma.item.update({
      where: { id: body.id },
      data: {
        name: body.name,
        categoryId: body.categoryId,
        brand: body.brand ?? null,
        size: body.size ?? null,
        unit: body.unit,
        minStock: body.minStock === undefined ? undefined : Number(body.minStock),
        supplierId: body.supplierId ?? null,
      },
      include,
    });

    await prisma.auditLog.create({
      data: {
        actorId: g.user.id,
        action: "UPDATE",
        entity: "item",
        entityId: item.id,
        meta: JSON.stringify({ code: item.code }),
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    return handlePrismaError(error);
  }
}

export async function DELETE(request: NextRequest) {
  const g = await guard(["ADMIN"]);
  if (g.error) return g.error;

  try {
    const { id } = await request.json();
    if (!id) return bad("ID item wajib diisi.");
    const item = await prisma.item.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json(item);
  } catch (error) {
    return handlePrismaError(error);
  }
}
