import { type NextRequest, NextResponse } from "next/server";

import { bad, guard } from "@/lib/authGuard";
import { notifyRoles, notifyUser } from "@/services/notifications";
import { handlePrismaError } from "@/services/errorHandler";
import { prisma } from "@/services/prisma";
import {
  formatItems,
  renderNotification,
} from "@/services/whatsapp/templates";

const include = {
  deliveryNote: {
    include: {
      request: {
        select: {
          id: true,
          number: true,
          poNo: true,
          site: true,
          leaderId: true,
          customer: {
            select: { id: true, code: true, name: true, company: true },
          },
          leader: { select: { name: true } },
        },
      },
      items: { include: { item: true } },
    },
  },
  submittedBy: { select: { name: true } },
  verifiedBy: { select: { name: true } },
  items: {
    include: {
      item: { include: { supplier: { select: { name: true } } } },
    },
  },
} as const;

export async function GET() {
  const g = await guard();
  if (g.error) return g.error;

  const rows = await prisma.turnover.findMany({
    where:
      g.user.role === "LEADER"
        ? { deliveryNote: { request: { leaderId: g.user.id } } }
        : undefined,
    include,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const g = await guard(["LEADER"]);
  if (g.error) return g.error;

  try {
    const body = await request.json();
    const rows: {
      itemId: string;
      brought: number;
      used: number;
      returned: number;
      damaged: number;
    }[] = body.items ?? [];

    if (!body.deliveryNoteId || rows.length === 0) {
      return bad("Surat jalan dan rincian pemakaian wajib diisi.");
    }

    const note = await prisma.deliveryNote.findUnique({
      where: { id: body.deliveryNoteId },
      include: { items: true, request: true, turnover: true },
    });
    if (!note) return bad("Surat jalan tidak ditemukan.", 404);
    if (note.request.leaderId !== g.user.id) {
      return bad("Anda bukan Leader untuk surat jalan ini.", 403);
    }
    if (note.status !== "CONFIRMED") {
      return bad("Turnover hanya dapat diisi setelah barang keluar dikonfirmasi.");
    }
    if (note.turnover) return bad("Turnover untuk surat jalan ini sudah ada.");

    for (const row of rows) {
      const source = note.items.find((item) => item.itemId === row.itemId);
      if (!source) return bad("Item tidak ada pada surat jalan.");
      const total =
        Number(row.used) + Number(row.returned) + Number(row.damaged);
      if (total !== Number(row.brought) || Number(row.brought) !== source.qty) {
        return bad(
          "Jumlah terpakai + kembali + rusak harus sama dengan jumlah dibawa.",
        );
      }
    }

    const created = await prisma.turnover.create({
      data: {
        deliveryNoteId: note.id,
        submittedById: g.user.id,
        status: "SUBMITTED",
        submittedAt: new Date(),
        note: body.note || null,
        items: {
          create: rows.map((row) => ({
            itemId: row.itemId,
            brought: Number(row.brought),
            used: Number(row.used),
            returned: Number(row.returned),
            damaged: Number(row.damaged),
          })),
        },
      },
      include,
    });

    await notifyRoles(["ADMIN"], {
      subject: "Turnover menunggu verifikasi",
      message: renderNotification("turnoverSubmitted", {
        number: note.number,
        site: note.request.site,
        leader: g.user.name,
        damaged: `${rows.filter((row) => row.damaged > 0).length} jenis`,
        items: formatItems(created.items),
      }),
      entity: "turnover",
      entityId: created.id,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return handlePrismaError(error);
  }
}

export async function PATCH(request: NextRequest) {
  const g = await guard(["ADMIN"]);
  if (g.error) return g.error;

  try {
    const body = await request.json();
    if (!body.id || body.action !== "verify") {
      return bad("Aksi tidak valid.");
    }

    const turnover = await prisma.turnover.findUnique({
      where: { id: body.id },
      include: {
        items: true,
        deliveryNote: {
          include: { request: { select: { id: true, leaderId: true } } },
        },
      },
    });
    if (!turnover) return bad("Turnover tidak ditemukan.", 404);
    if (turnover.status !== "SUBMITTED") {
      return bad("Turnover ini tidak menunggu verifikasi.");
    }

    const verified = await prisma.$transaction(async (tx) => {
      for (const row of turnover.items) {
        const item = await tx.item.findUnique({ where: { id: row.itemId } });
        if (!item) throw new Error("Item tidak ditemukan.");
        const keluar = row.used + row.damaged;
        if (item.stockOperasional < keluar) {
          throw new Error(`Stok operasional ${item.name} tidak cukup.`);
        }
        await tx.item.update({
          where: { id: row.itemId },
          data: {
            stockOperasional: { decrement: keluar },
            stockGudang: { increment: row.returned },
          },
        });
      }

      await tx.deliveryNote.update({
        where: { id: turnover.deliveryNoteId },
        data: { status: "COMPLETED" },
      });
      await tx.request.update({
        where: { id: turnover.deliveryNote.requestId },
        data: { status: "COMPLETED" },
      });

      const updated = await tx.turnover.update({
        where: { id: turnover.id },
        data: {
          status: "VERIFIED",
          verifiedById: g.user.id,
          verifiedAt: new Date(),
        },
        include,
      });

      await tx.auditLog.create({
        data: {
          actorId: g.user.id,
          action: "VERIFY",
          entity: "turnover",
          entityId: turnover.id,
        },
      });

      return updated;
    });

    await notifyUser(turnover.deliveryNote.request.leaderId, {
      subject: "Turnover diverifikasi",
      message: renderNotification("turnoverVerified", {
        number: verified.deliveryNote.number,
        poNo: verified.deliveryNote.request.poNo,
        site: verified.deliveryNote.request.site,
        items: formatItems(verified.items),
      }),
      entity: "turnover",
      entityId: verified.id,
    });

    return NextResponse.json(verified);
  } catch (error) {
    return handlePrismaError(error);
  }
}
