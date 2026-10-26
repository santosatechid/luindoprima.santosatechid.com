import { NextResponse } from "next/server";

import { guard } from "@/lib/authGuard";
import { prisma } from "@/services/prisma";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export async function GET() {
  const g = await guard();
  if (g.error) return g.error;

  const now = new Date();
  const startMonth = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Leader hanya melihat request/surat jalan miliknya sendiri.
  const ownRequest =
    g.user.role === "LEADER" ? { request: { leaderId: g.user.id } } : {};
  const ownTurnover =
    g.user.role === "LEADER"
      ? { deliveryNote: { request: { leaderId: g.user.id } } }
      : {};
  const ownRequestId =
    g.user.role === "LEADER" ? { leaderId: g.user.id } : {};

  const [
    items,
    incoming,
    confirmed,
    turnoverCount,
    pendingAdmin,
    pendingDirector,
    readyToShip,
    onSiteCount,
    completedCount,
  ] = await Promise.all([
      prisma.item.findMany({ orderBy: { code: "asc" } }),
      prisma.incoming.findMany({
        where: { receivedAt: { gte: startMonth } },
        include: { items: true },
      }),
      prisma.deliveryNote.findMany({
        where: { status: "CONFIRMED", ...ownRequest },
        include: {
          request: {
            select: {
              number: true,
              jobNo: true,
              site: true,
              customer: true,
              leader: { select: { name: true } },
            },
          },
          items: { include: { item: true } },
        },
        orderBy: { issuedAt: "desc" },
      }),
      prisma.turnover.count({
        where: { status: "SUBMITTED", ...ownTurnover },
      }),
      prisma.request.count({ where: { status: "PENDING_ADMIN", ...ownRequestId } }),
      prisma.request.count({ where: { status: "PENDING_DIRECTOR", ...ownRequestId } }),
      prisma.request.count({
        where: { status: "APPROVED", delivery: { is: null }, ...ownRequestId },
      }),
      prisma.deliveryNote.count({
        where: { status: { in: ["ISSUED", "CONFIRMED"] }, ...ownRequest },
      }),
      prisma.request.count({ where: { status: "COMPLETED", ...ownRequestId } }),
    ]);

  const chart = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const masuk = incoming
      .filter(
        (row) =>
          `${new Date(row.receivedAt).getFullYear()}-${new Date(row.receivedAt).getMonth()}` ===
          key,
      )
      .reduce((sum, row) => sum + row.items.reduce((s, i) => s + i.qty, 0), 0);
    const keluar = confirmed
      .filter(
        (row) =>
          row.confirmedAt &&
          `${new Date(row.confirmedAt).getFullYear()}-${new Date(row.confirmedAt).getMonth()}` ===
            key,
      )
      .reduce((sum, row) => sum + row.items.reduce((s, i) => s + i.qty, 0), 0);
    return { month: MONTHS[date.getMonth()], masuk, keluar };
  });

  const incomingThisMonth = incoming
    .filter((row) => new Date(row.receivedAt) >= startOfMonth)
    .reduce((sum, row) => sum + row.items.reduce((s, i) => s + i.qty, 0), 0);

  const outgoingThisMonth = confirmed
    .filter((row) => row.confirmedAt && new Date(row.confirmedAt) >= startOfMonth)
    .reduce((sum, row) => sum + row.items.reduce((s, i) => s + i.qty, 0), 0);

  return NextResponse.json({
    itemCount: items.length,
    stockGudang: items.reduce((sum, item) => sum + item.stockGudang, 0),
    stockOperasional: items.reduce(
      (sum, item) => sum + item.stockOperasional,
      0,
    ),
    lowStock: items.filter((item) => item.stockGudang <= item.minStock),
    pendingApprovals: pendingAdmin + pendingDirector,
    pendingDirector,
    pendingTurnover: turnoverCount,
    incomingThisMonth,
    outgoingThisMonth,
    onSite: confirmed.slice(0, 5),
    chart,
    pipeline: {
      pendingAdmin,
      pendingDirector,
      readyToShip,
      onSite: onSiteCount,
      completed: completedCount,
    },
  });
}
