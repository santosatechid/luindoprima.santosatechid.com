import { guard } from "@/lib/authGuard";
import { buildTaskLetterPdf } from "@/lib/pdf/task-letter";
import { prisma } from "@/services/prisma";
import type { RequestPersonnel } from "@/types/inventory";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const g = await guard();
  if (g.error) return g.error;

  const { id } = await params;
  const row = await prisma.request.findUnique({
    where: { id },
    include: {
      customer: { select: { name: true, company: true } },
      leader: { select: { name: true } },
      admin: { select: { name: true } },
      items: { include: { item: true } },
    },
  });

  if (!row) {
    return Response.json(
      { message: "Request tidak ditemukan." },
      { status: 404 },
    );
  }
  if (g.user.role === "LEADER" && row.leaderId !== g.user.id) {
    return Response.json(
      { message: "Anda tidak memiliki akses." },
      { status: 403 },
    );
  }

  const bytes = await buildTaskLetterPdf({
    ...row,
    personnel: Array.isArray(row.personnel)
      ? (row.personnel as unknown as RequestPersonnel[])
      : null,
  });

  return new Response(bytes.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Surat-Tugas-${row.number}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
