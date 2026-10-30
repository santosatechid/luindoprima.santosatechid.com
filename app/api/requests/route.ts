import { type NextRequest, NextResponse } from "next/server";

import { bad, guard } from "@/lib/authGuard";
import { notifyRoles, notifyUser } from "@/services/notifications";
import { handlePrismaError } from "@/services/errorHandler";
import { prisma } from "@/services/prisma";
import {
  adjustReservation,
  InsufficientStockError,
  releaseStock,
} from "@/services/stockReservation";
import {
  formatItems,
  renderNotification,
} from "@/services/whatsapp/templates";

const include = {
  leader: { select: { id: true, name: true } },
  admin: { select: { name: true } },
  director: { select: { name: true } },
  customer: { select: { id: true, code: true, name: true, company: true } },
  items: { include: { item: true } },
  delivery: { select: { id: true, number: true, status: true } },
} as const;

export async function GET() {
  const g = await guard();
  if (g.error) return g.error;

  const rows = await prisma.request.findMany({
    where: g.user.role === "LEADER" ? { leaderId: g.user.id } : undefined,
    include,
    // Antrean kerja: yang paling lama menunggu dikerjakan lebih dulu.
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const g = await guard(["LEADER"]);
  if (g.error) return g.error;

  try {
    const body = await request.json();
    const items: { itemId: string; qty: number }[] = body.items ?? [];

    if (
      !body.poNo ||
      !body.site ||
      !body.neededAt ||
      !body.customerId ||
      items.length === 0
    ) {
      return bad(
        "Nomor PO, pelanggan, site, tanggal dibutuhkan, dan item wajib diisi.",
      );
    }
    if (items.some((row) => !row.itemId || Number(row.qty) <= 0)) {
      return bad("Jumlah setiap item harus lebih dari nol.");
    }

    const customer = await prisma.customer.findFirst({
      where: { id: body.customerId, isActive: true },
      select: { id: true, name: true, company: true },
    });
    if (!customer) return bad("Pelanggan tidak ditemukan atau nonaktif.");

    const needed = new Map<string, number>();
    for (const row of items) {
      needed.set(
        row.itemId,
        (needed.get(row.itemId) ?? 0) + Number(row.qty),
      );
    }

    const stock = await prisma.item.findMany({
      where: { id: { in: [...needed.keys()] } },
      select: {
        id: true,
        name: true,
        unit: true,
        isActive: true,
        stockGudang: true,
        onRequest: true,
      },
    });
    if (stock.length !== needed.size) {
      return bad("Ada item yang tidak ditemukan.");
    }
    for (const item of stock) {
      const qty = needed.get(item.id) ?? 0;
      const available = item.stockGudang - item.onRequest;
      if (!item.isActive) return bad(`${item.name} sedang nonaktif.`);
      if (qty > available) {
        return bad(
          `Stok ${item.name} tidak cukup. Tersedia ${available} ${item.unit}, diminta ${qty} ${item.unit}.`,
          409,
        );
      }
    }

    const year = new Date().getFullYear();
    const count = await prisma.request.count({
      where: { number: { startsWith: `REQ-${year}-` } },
    });

    const created = await prisma.$transaction(async (tx) => {
      const requestRow = await tx.request.create({
        data: {
          number: `REQ-${year}-${String(count + 1).padStart(4, "0")}`,
          poNo: String(body.poNo).trim(),
          site: body.site,
          customerId: customer.id,
          neededAt: new Date(body.neededAt),
          estimatedDoneAt: body.estimatedDoneAt
            ? new Date(body.estimatedDoneAt)
            : null,
          note: body.note || null,
          leaderId: g.user.id,
          items: {
            create: items.map((row) => ({
              itemId: row.itemId,
              qty: Number(row.qty),
            })),
          },
        },
        include,
      });

      await adjustReservation(
        tx,
        [...needed].map(([itemId, qty]) => ({ itemId, qty })),
      );
      return requestRow;
    });

    await prisma.auditLog.create({
      data: {
        actorId: g.user.id,
        action: "CREATE",
        entity: "request",
        entityId: created.id,
        meta: JSON.stringify({ number: created.number }),
      },
    });

    await notifyRoles(["ADMIN"], {
      subject: "Request baru menunggu verifikasi",
      message: renderNotification("requestSubmitted", {
        number: created.number,
        poNo: created.poNo,
        customer: customer.company || customer.name,
        site: created.site,
        leader: g.user.name,
        itemCount: `${created.items.length} jenis`,
        items: formatItems(created.items),
      }),
      entity: "request",
      entityId: created.id,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof InsufficientStockError) return bad(error.message, 409);
    return handlePrismaError(error);
  }
}

export async function PATCH(request: NextRequest) {
  const g = await guard(["ADMIN", "DIREKTUR", "LEADER"]);
  if (g.error) return g.error;

  try {
    const body = await request.json();
    const { id, action, note } = body;
    if (!id) return bad("Request wajib dipilih.");

    const row = await prisma.request.findUnique({
      where: { id },
      include: { items: { include: { item: true } }, customer: true },
    });
    if (!row) return bad("Request tidak ditemukan.", 404);

    const items: { id: string; qty: number }[] = Array.isArray(body.items)
      ? body.items
      : [];
    if (
      items.some(
        (item) =>
          !Number.isInteger(item.qty) ||
          item.qty <= 0 ||
          !row.items.some((current) => current.id === item.id),
      )
    ) {
      return bad("Jumlah setiap item harus bilangan bulat lebih dari nol.");
    }

    const changes = items.flatMap((item) => {
      const current = row.items.find((entry) => entry.id === item.id);
      if (!current) return [];
      return [
        {
          itemId: current.itemId,
          qty: Number(item.qty) - current.qty,
        },
      ];
    });

    if (g.user.role === "LEADER") {
      if (row.leaderId !== g.user.id) {
        return bad("Request ini bukan milik Anda.", 403);
      }
      if (row.status !== "PENDING_ADMIN") {
        return bad("Request sudah diverifikasi Admin dan tidak dapat diubah.");
      }
      if (items.length === 0) return bad("Tidak ada jumlah item yang diubah.");

      const updated = await prisma.$transaction(async (tx) => {
        for (const item of items) {
          await tx.requestItem.update({
            where: { id: item.id },
            data: { qty: item.qty },
          });
        }
        await adjustReservation(tx, changes);
        return tx.request.update({ where: { id }, data: {}, include });
      });

      await prisma.auditLog.create({
        data: {
          actorId: g.user.id,
          action: "UPDATE_ITEMS",
          entity: "request",
          entityId: id,
          meta: JSON.stringify({ number: row.number, items }),
        },
      });

      return NextResponse.json(updated);
    }

    if (!["approve", "reject"].includes(action)) {
      return bad("Aksi tidak valid.");
    }

    if (g.user.role === "ADMIN" && row.status !== "PENDING_ADMIN") {
      return bad("Request ini bukan bagian persetujuan Admin.");
    }
    if (g.user.role === "DIREKTUR" && row.status !== "PENDING_DIRECTOR") {
      return bad("Request ini bukan bagian persetujuan Direktur.");
    }

    const data =
      g.user.role === "ADMIN"
        ? {
            status: action === "approve" ? "PENDING_DIRECTOR" : "REJECTED",
            adminId: g.user.id,
            adminNote: note || null,
            decidedAt: action === "reject" ? new Date() : null,
          }
        : {
            status: action === "approve" ? "APPROVED" : "REJECTED",
            directorId: g.user.id,
            directorNote: note || null,
            decidedAt: new Date(),
          };

    const updated = await prisma.$transaction(async (tx) => {
      for (const item of items) {
        await tx.requestItem.update({
          where: { id: item.id },
          data: { qty: item.qty },
        });
      }
      await adjustReservation(tx, changes);
      if (action === "reject") {
        await releaseStock(
          tx,
          row.items.map((entry) => ({
            itemId: entry.itemId,
            qty: Number(
              items.find((item) => item.id === entry.id)?.qty ?? entry.qty,
            ),
          })),
        );
      }
      return tx.request.update({ where: { id }, data, include });
    });

    if (g.user.role === "DIREKTUR") {
      await prisma.auditLog.create({
        data: {
          actorId: g.user.id,
          action: action.toUpperCase(),
          entity: "request",
          entityId: id,
          meta: JSON.stringify({
            number: row.number,
            ...(items.length ? { items } : {}),
          }),
        },
      });
    }

    const vars = {
      number: row.number,
      poNo: row.poNo,
      customer: row.customer?.company || row.customer?.name || "—",
      site: row.site,
      leader: updated.leader.name,
      items: formatItems(updated.items),
    };

    if (action === "approve" && g.user.role === "ADMIN") {
      await notifyRoles(["DIREKTUR"], {
        subject: "Request menunggu persetujuan Direktur",
        message: renderNotification("requestAdminApproved", vars),
        entity: "request",
        entityId: id,
      });
    } else if (action === "approve" && g.user.role === "DIREKTUR") {
      await notifyRoles(["ADMIN"], {
        subject: "Request disetujui Direktur",
        message: renderNotification("requestDirectorApproved", vars),
        entity: "request",
        entityId: id,
      });
      await notifyUser(row.leaderId, {
        subject: "Request Anda disetujui",
        message: renderNotification("requestDirectorApproved", vars),
        entity: "request",
        entityId: id,
      });
    } else if (action === "reject") {
      await notifyUser(row.leaderId, {
        subject: "Request ditolak",
        message: renderNotification("requestRejected", {
          ...vars,
          by: g.user.role === "ADMIN" ? "Admin" : "Direktur",
          note: note || "—",
        }),
        entity: "request",
        entityId: id,
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof InsufficientStockError) return bad(error.message, 409);
    return handlePrismaError(error);
  }
}
