import { buildDeliveryNotePdf } from "@/lib/pdf/documents";
import { guard } from "@/lib/authGuard";
import { prisma } from "@/services/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const g = await guard();
  if (g.error) return g.error;

  const { id } = await params;
  const note = await prisma.deliveryNote.findUnique({
    where: { id },
    include: {
      request: {
        select: {
          id: true,
          number: true,
          poNo: true,
          site: true,
          leaderId: true,
          customer: {
            select: { name: true, company: true, address: true },
          },
          leader: { select: { name: true } },
        },
      },
      createdBy: { select: { name: true } },
      items: { include: { item: true } },
    },
  });

  if (!note) {
    return Response.json({ message: "Surat jalan tidak ditemukan." }, { status: 404 });
  }
  if (g.user.role === "LEADER" && note.request.leaderId !== g.user.id) {
    return Response.json({ message: "Anda tidak memiliki akses." }, { status: 403 });
  }

  const bytes = await buildDeliveryNotePdf(note);
  return new Response(bytes.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${note.number}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
