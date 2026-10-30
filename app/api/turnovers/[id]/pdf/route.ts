import { guard } from "@/lib/authGuard";
import { buildDamageReportPdf } from "@/lib/pdf/documents";
import { prisma } from "@/services/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const g = await guard();
  if (g.error) return g.error;

  const { id } = await params;
  const turnover = await prisma.turnover.findUnique({
    where: { id },
    include: {
      submittedBy: { select: { name: true } },
      verifiedBy: { select: { name: true } },
      items: { include: { item: true } },
      deliveryNote: {
        include: {
          request: {
            select: {
              id: true,
              number: true,
              poNo: true,
              site: true,
              leaderId: true,
              customer: { select: { name: true, company: true } },
              leader: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!turnover) {
    return Response.json({ message: "Turnover tidak ditemukan." }, { status: 404 });
  }
  if (
    g.user.role === "LEADER" &&
    turnover.deliveryNote.request.leaderId !== g.user.id
  ) {
    return Response.json({ message: "Anda tidak memiliki akses." }, { status: 403 });
  }

  const bytes = await buildDamageReportPdf(turnover);
  return new Response(bytes.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="BA-Rusak-${turnover.deliveryNote.number}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
