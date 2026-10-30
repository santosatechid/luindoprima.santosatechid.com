import { type NextRequest, NextResponse } from "next/server";

import { bad, guard } from "@/lib/authGuard";
import { handlePrismaError } from "@/services/errorHandler";
import { prisma } from "@/services/prisma";

const select = {
  id: true,
  code: true,
  name: true,
  company: true,
  contact: true,
  phone: true,
  email: true,
  address: true,
  note: true,
  isActive: true,
  createdAt: true,
  _count: { select: { requests: true } },
} as const;

export async function GET() {
  const g = await guard();
  if (g.error) return g.error;

  const rows = await prisma.customer.findMany({
    select,
    orderBy: { name: "asc" },
  });
  return NextResponse.json(rows);
}

function customerData(body: Record<string, unknown>) {
  return {
    name: String(body.name).trim(),
    company: body.company ? String(body.company).trim() : null,
    contact: body.contact ? String(body.contact).trim() : null,
    phone: body.phone ? String(body.phone).trim() : null,
    email: body.email ? String(body.email).trim().toLowerCase() : null,
    address: body.address ? String(body.address).trim() : null,
    note: body.note ? String(body.note).trim() : null,
    isActive: body.isActive === undefined ? true : Boolean(body.isActive),
  };
}

async function nextCode() {
  const count = await prisma.customer.count();
  return `CUST-${String(count + 1).padStart(4, "0")}`;
}

export async function POST(request: NextRequest) {
  const g = await guard(["ADMIN"]);
  if (g.error) return g.error;

  try {
    const body = await request.json();
    if (!body.name || !String(body.name).trim()) {
      return bad("Nama pelanggan wajib diisi.");
    }

    let code = await nextCode();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const exists = await prisma.customer.findUnique({ where: { code } });
      if (!exists) break;
      code = await nextCode();
    }

    const created = await prisma.customer.create({
      data: { ...customerData(body), code },
      select,
    });

    await prisma.auditLog.create({
      data: {
        actorId: g.user.id,
        action: "CREATE",
        entity: "customer",
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
    if (!body.id) return bad("ID pelanggan wajib diisi.");
    if (!body.name || !String(body.name).trim()) {
      return bad("Nama pelanggan wajib diisi.");
    }

    const updated = await prisma.customer.update({
      where: { id: body.id },
      data: customerData(body),
      select,
    });

    await prisma.auditLog.create({
      data: {
        actorId: g.user.id,
        action: "UPDATE",
        entity: "customer",
        entityId: updated.id,
        meta: JSON.stringify({ code: updated.code }),
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
    if (!id) return bad("ID pelanggan wajib diisi.");
    const updated = await prisma.customer.update({
      where: { id },
      data: { isActive: false },
      select,
    });
    return NextResponse.json(updated);
  } catch (error) {
    return handlePrismaError(error);
  }
}
