import { type NextRequest, NextResponse } from "next/server";

import { bad, guard } from "@/lib/authGuard";
import { notifyUser } from "@/services/notifications";
import { handlePrismaError } from "@/services/errorHandler";
import { prisma } from "@/services/prisma";
import { releaseStock } from "@/services/stockReservation";
import { renderNotification } from "@/services/whatsapp/templates";

const include = {
  request: {
    select: {
      id: true,
      number: true,
      poNo: true,
      site: true,
      leaderId: true,
      customer: { select: { id: true, code: true, name: true, company: true } },
      leader: { select: { name: true } },
    },
  },
  createdBy: { select: { name: true } },
  items: { include: { item: true } },
  turnover: { select: { id: true, status: true } },
} as const;

export async function GET() {
  const g = await guard();
  if (g.error) return g.error;

  const rows = await prisma.deliveryNote.findMany({
    where:
      g.user.role === "LEADER"
        ? { request: { leaderId: g.user.id } }
        : undefined,
    include,
    orderBy: { issuedAt: "desc" },
  });
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const g = await guard(["ADMIN"]);
  if (g.error) return g.error;

  try {
    const body = await request.json();
    if (!body.requestId) return bad("Request wajib dipilih.");

    const source = await prisma.request.findUnique({
      where: { id: body.requestId },
      include: {
        items: true,
        delivery: true,
        customer: true,
        leader: { select: { name: true } },
      },
    });
    if (!source) return bad("Request tidak ditemukan.", 404);
    if (source.status !== "APPROVED") {
      return bad("Surat jalan hanya dapat diterbitkan untuk request yang disetujui.");
    }
    if (source.delivery) return bad("Request ini sudah memiliki surat jalan.");
    if (source.items.length === 0) return bad("Request tidak memiliki item.");

    const year = new Date().getFullYear();
    const count = await prisma.deliveryNote.count({
      where: { number: { startsWith: `SJ-${year}-` } },
    });

    const created = await prisma.deliveryNote.create({
      data: {
        number: `SJ-${year}-${String(count + 1).padStart(4, "0")}`,
        requestId: source.id,
        vehicle: body.vehicle || null,
        createdById: g.user.id,
        items: {
          create: source.items.map((row) => ({
            itemId: row.itemId,
            qty: row.qty,
          })),
        },
      },
      include,
    });

    await prisma.auditLog.create({
      data: {
        actorId: g.user.id,
        action: "ISSUE",
        entity: "delivery_note",
        entityId: created.id,
        meta: JSON.stringify({ number: created.number }),
      },
    });

    await notifyUser(source.leaderId, {
      subject: "Surat jalan diterbitkan",
      message: renderNotification("deliveryIssued", {
        number: created.number,
        poNo: source.poNo,
        customer: source.customer?.company || source.customer?.name || "—",
        site: source.site,
      }),
      entity: "delivery_note",
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
    if (!body.id || body.action !== "confirm") {
      return bad("Aksi tidak valid.");
    }

    const note = await prisma.deliveryNote.findUnique({
      where: { id: body.id },
      include: { items: true, request: { select: { leaderId: true } } },
    });
    if (!note) return bad("Surat jalan tidak ditemukan.", 404);
    if (note.status !== "ISSUED") {
      return bad("Surat jalan ini sudah dikonfirmasi.");
    }

    const confirmed = await prisma.$transaction(async (tx) => {
      for (const row of note.items) {
        const item = await tx.item.findUnique({ where: { id: row.itemId } });
        if (!item || item.stockGudang < row.qty) {
          throw new Error(
            `Stok gudang tidak cukup untuk ${item?.name ?? "item"}.`,
          );
        }
        await tx.item.update({
          where: { id: row.itemId },
          data: {
            stockGudang: { decrement: row.qty },
            stockOperasional: { increment: row.qty },
          },
        });
      }

      await releaseStock(
        tx,
        note.items.map((row) => ({ itemId: row.itemId, qty: row.qty })),
      );

      const updated = await tx.deliveryNote.update({
        where: { id: note.id },
        data: { status: "CONFIRMED", confirmedAt: new Date() },
        include,
      });

      await tx.auditLog.create({
        data: {
          actorId: g.user.id,
          action: "CONFIRM",
          entity: "delivery_note",
          entityId: note.id,
          meta: JSON.stringify({ number: note.number }),
        },
      });

      return updated;
    });

    await notifyUser(note.request.leaderId, {
      subject: "Barang keluar gudang",
      message: renderNotification("deliveryConfirmed", {
        number: confirmed.number,
        poNo: confirmed.request.poNo,
        site: confirmed.request.site,
      }),
      entity: "delivery_note",
      entityId: confirmed.id,
    });

    return NextResponse.json(confirmed);
  } catch (error) {
    return handlePrismaError(error);
  }
}
