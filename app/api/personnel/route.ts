import { type NextRequest, NextResponse } from "next/server";

import { bad, guard } from "@/lib/authGuard";
import { handlePrismaError } from "@/services/errorHandler";
import { prisma } from "@/services/prisma";

const select = {
  id: true,
  name: true,
  position: true,
  isActive: true,
  createdAt: true,
} as const;

export async function GET() {
  const g = await guard();
  if (g.error) return g.error;

  const rows = await prisma.personnel.findMany({
    select,
    orderBy: [{ name: "asc" }],
  });
  return NextResponse.json(rows);
}

function personnelData(body: Record<string, unknown>) {
  return {
    name: String(body.name ?? "").trim(),
    position: String(body.position ?? "").trim(),
    // undefined = jangan ubah status aktif/nonaktif.
    isActive:
      body.isActive === undefined ? undefined : Boolean(body.isActive),
  };
}

export async function POST(request: NextRequest) {
  const g = await guard(["ADMIN"]);
  if (g.error) return g.error;

  try {
    const data = personnelData(await request.json());
    if (!data.name) return bad("Nama personel wajib diisi.");
    if (!data.position) return bad("Jabatan personel wajib diisi.");

    const created = await prisma.personnel.create({ data, select });

    await prisma.auditLog.create({
      data: {
        actorId: g.user.id,
        action: "CREATE",
        entity: "personnel",
        entityId: created.id,
        meta: JSON.stringify({ name: created.name }),
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
    if (!body.id) return bad("ID personel wajib diisi.");

    const data = personnelData(body);
    if (!data.name) return bad("Nama personel wajib diisi.");
    if (!data.position) return bad("Jabatan personel wajib diisi.");

    const updated = await prisma.personnel.update({
      where: { id: String(body.id) },
      data,
      select,
    });

    await prisma.auditLog.create({
      data: {
        actorId: g.user.id,
        action: "UPDATE",
        entity: "personnel",
        entityId: updated.id,
        meta: JSON.stringify({ name: updated.name }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handlePrismaError(error);
  }
}

/// Nonaktifkan, bukan hapus: request lama tetap menunjuk nama yang sama.
export async function DELETE(request: NextRequest) {
  const g = await guard(["ADMIN"]);
  if (g.error) return g.error;

  try {
    const { id } = await request.json();
    if (!id) return bad("ID personel wajib diisi.");

    const updated = await prisma.personnel.update({
      where: { id },
      data: { isActive: false },
      select,
    });
    return NextResponse.json(updated);
  } catch (error) {
    return handlePrismaError(error);
  }
}
