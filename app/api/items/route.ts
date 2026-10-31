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
    where: { deletedAt: null },
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
    const bumped = await tx.itemCategory.updateMany({
      where: { id: categoryId, deletedAt: null },
      data: { lastNumber: { increment: 1 } },
    });
    if (bumped.count === 0) {
      throw new Error("Kategori sudah dihapus.");
    }
    const category = await tx.itemCategory.findUniqueOrThrow({
      where: { id: categoryId },
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

    if (body.supplierId) {
      const liveSupplier = await prisma.supplier.count({
        where: { id: body.supplierId, deletedAt: null },
      });
      if (liveSupplier === 0) return bad("Supplier sudah dihapus.");
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
    if (error instanceof Error && error.message === "Kategori sudah dihapus.") {
      return bad("Kategori sudah dihapus.");
    }
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

    const live = await prisma.item.findFirst({
      where: { id: body.id, deletedAt: null },
      select: { id: true },
    });
    if (!live) return bad("Item tidak ditemukan atau sudah dihapus.");

    const liveCategory = await prisma.itemCategory.count({
      where: { id: body.categoryId, deletedAt: null },
    });
    if (liveCategory === 0) return bad("Kategori sudah dihapus.");

    if (body.supplierId) {
      const liveSupplier = await prisma.supplier.count({
        where: { id: body.supplierId, deletedAt: null },
      });
      if (liveSupplier === 0) return bad("Supplier sudah dihapus.");
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

    const res = await prisma.item.updateMany({
      where: {
        id,
        deletedAt: null,
        stockGudang: 0,
        stockOperasional: 0,
        onRequest: 0,
      },
      data: { isActive: false, deletedAt: new Date() },
    });

    if (res.count === 0) {
      const existing = await prisma.item.findUnique({
        where: { id },
        select: { id: true, deletedAt: true },
      });
      if (!existing || existing.deletedAt) {
        return bad("Item tidak ditemukan atau sudah dihapus.");
      }
      return bad("Item masih punya stok atau permintaan berjalan. Kosongkan stok dulu.");
    }

    const item = await prisma.item.findUniqueOrThrow({ where: { id } });

    await prisma.auditLog.create({
      data: {
        actorId: g.user.id,
        action: "DELETE",
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
