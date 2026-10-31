import { type NextRequest, NextResponse } from "next/server";

import { bad, guard } from "@/lib/authGuard";
import { handlePrismaError } from "@/services/errorHandler";
import { prisma } from "@/services/prisma";

export async function GET() {
  const g = await guard();
  if (g.error) return g.error;

  const suppliers = await prisma.supplier.findMany({
    where: { deletedAt: null },
    include: {
      _count: { select: { items: { where: { deletedAt: null } } } },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(suppliers);
}

export async function POST(request: NextRequest) {
  const g = await guard(["ADMIN"]);
  if (g.error) return g.error;

  try {
    const body = await request.json();
    if (!body.name) return bad("Nama supplier wajib diisi.");
    const supplier = await prisma.supplier.create({
      data: {
        name: body.name,
        contact: body.contact || null,
        phone: body.phone || null,
        email: body.email || null,
        address: body.address || null,
      },
    });
    return NextResponse.json(supplier, { status: 201 });
  } catch (error) {
    return handlePrismaError(error);
  }
}

export async function PUT(request: NextRequest) {
  const g = await guard(["ADMIN"]);
  if (g.error) return g.error;

  try {
    const body = await request.json();
    if (!body.id) return bad("ID supplier wajib diisi.");
    const existing = await prisma.supplier.findFirst({
      where: { id: body.id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) return bad("Supplier tidak ditemukan atau sudah dihapus.");
    const supplier = await prisma.supplier.update({
      where: { id: body.id },
      data: {
        name: body.name,
        contact: body.contact ?? null,
        phone: body.phone ?? null,
        email: body.email ?? null,
        address: body.address ?? null,
        isActive: body.isActive ?? true,
      },
    });
    return NextResponse.json(supplier);
  } catch (error) {
    return handlePrismaError(error);
  }
}

export async function DELETE(request: NextRequest) {
  const g = await guard(["ADMIN"]);
  if (g.error) return g.error;

  try {
    const { id } = await request.json();
    if (!id) return bad("ID supplier wajib diisi.");
    const res = await prisma.supplier.updateMany({
      where: { id, deletedAt: null },
      data: { isActive: false, deletedAt: new Date() },
    });
    if (res.count === 0) {
      return bad("Supplier tidak ditemukan atau sudah dihapus.");
    }
    const supplier = await prisma.supplier.findUniqueOrThrow({
      where: { id },
    });

    await prisma.auditLog.create({
      data: {
        actorId: g.user.id,
        action: "DELETE",
        entity: "supplier",
        entityId: supplier.id,
        meta: JSON.stringify({ name: supplier.name }),
      },
    });

    return NextResponse.json(supplier);
  } catch (error) {
    return handlePrismaError(error);
  }
}
