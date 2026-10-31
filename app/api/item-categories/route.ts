import { type NextRequest, NextResponse } from "next/server";

import { bad, guard } from "@/lib/authGuard";
import { Prisma } from "@/prisma/generated/client";
import { handlePrismaError } from "@/services/errorHandler";
import { prisma } from "@/services/prisma";

const select = {
  id: true,
  code: true,
  name: true,
  lastNumber: true,
  isActive: true,
  _count: { select: { items: { where: { deletedAt: null } } } },
} as const;

/** Kode kategori dipakai sebagai prefix kode item: hanya huruf/angka. */
function normalizeCode(value: unknown) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export async function GET() {
  const g = await guard();
  if (g.error) return g.error;

  const rows = await prisma.itemCategory.findMany({
    where: { deletedAt: null },
    select,
    orderBy: { name: "asc" },
  });
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const g = await guard(["ADMIN"]);
  if (g.error) return g.error;

  try {
    const body = await request.json();
    const code = normalizeCode(body.code);
    const name = String(body.name ?? "").trim();
    if (!code || !name) return bad("Kode dan nama kategori wajib diisi.");

    const existing = await prisma.itemCategory.findUnique({ where: { code } });
    const created = existing?.deletedAt
      ? await prisma.itemCategory.update({
          where: { id: existing.id },
          data: { name, isActive: true, deletedAt: null },
          select,
        })
      : await prisma.itemCategory.create({
          data: { code, name },
          select,
        });

    await prisma.auditLog.create({
      data: {
        actorId: g.user.id,
        action: "CREATE",
        entity: "item_category",
        entityId: created.id,
        meta: JSON.stringify({ code: created.code, name: created.name }),
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return handlePrismaError(error);
  }
}

export async function PUT(request: NextRequest) {
  const g = await guard(["ADMIN"]);
  if (g.error) return g.error;

  try {
    const body = await request.json();
    if (!body.id) return bad("ID kategori wajib diisi.");
    const code = normalizeCode(body.code);
    const name = String(body.name ?? "").trim();
    if (!code || !name) return bad("Kode dan nama kategori wajib diisi.");

    const updated = await prisma.itemCategory.update({
      where: { id: body.id },
      data: { code, name },
      select,
    });

    await prisma.auditLog.create({
      data: {
        actorId: g.user.id,
        action: "UPDATE",
        entity: "item_category",
        entityId: updated.id,
        meta: JSON.stringify({ code: updated.code, name: updated.name }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handlePrismaError(error);
  }
}

export async function DELETE(request: NextRequest) {
  const g = await guard(["ADMIN"]);
  if (g.error) return g.error;

  try {
    const { id } = await request.json();
    if (!id) return bad("ID kategori wajib diisi.");

    const deleted = await prisma.$transaction(async (tx) => {
      const row = await tx.itemCategory.update({
        where: { id, deletedAt: null },
        data: { isActive: false, deletedAt: new Date() },
        select,
      });

      const used = await tx.item.count({
        where: { categoryId: id, deletedAt: null },
      });
      if (used > 0) {
        throw new Error(
          `Kategori masih dipakai ${used} item. Pindahkan item ke kategori lain dulu.`,
        );
      }

      return row;
    });

    await prisma.auditLog.create({
      data: {
        actorId: g.user.id,
        action: "DELETE",
        entity: "item_category",
        entityId: deleted.id,
        meta: JSON.stringify({ code: deleted.code, name: deleted.name }),
      },
    });

    return NextResponse.json(deleted);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("Kategori masih dipakai")
    ) {
      return bad(error.message);
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return bad("Kategori tidak ditemukan atau sudah dihapus.");
    }
    return handlePrismaError(error);
  }
}
