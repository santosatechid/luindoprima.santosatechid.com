import { NextResponse } from "next/server";

import { guard } from "@/lib/authGuard";
import { prisma } from "@/services/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const g = await guard();
  if (g.error) return g.error;

  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      requests: {
        orderBy: { createdAt: "desc" },
        include: {
          leader: { select: { id: true, name: true } },
          items: { include: { item: true } },
          delivery: {
            select: {
              id: true,
              number: true,
              status: true,
              issuedAt: true,
              items: { include: { item: true } },
              turnover: {
                select: {
                  id: true,
                  status: true,
                  items: { include: { item: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!customer) {
    return NextResponse.json(
      { message: "Pelanggan tidak ditemukan." },
      { status: 404 },
    );
  }

  return NextResponse.json(customer);
}
