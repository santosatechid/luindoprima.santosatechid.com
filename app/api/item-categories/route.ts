import { type NextRequest, NextResponse } from "next/server";

import { bad, guard } from "@/lib/authGuard";
import { handlePrismaError } from "@/services/errorHandler";
import { prisma } from "@/services/prisma";

const select = {
  id: true,
  code: true,
  name: true,
  lastNumber: true,
  isActive: true,
  _count: { select: { items: true } },
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

    const created = await prisma.itemCategory.create({
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
