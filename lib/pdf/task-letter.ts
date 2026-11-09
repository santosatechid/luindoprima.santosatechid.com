import { createLetter, pdfDate } from "@/lib/pdf/letter";
import type { RequestPersonnel } from "@/types/inventory";

type TaskLetterDocument = {
  number: string;
  poNo: string;
  site: string;
  createdAt: Date;
  note: string | null;
  personnel: RequestPersonnel[] | null;
  customer: { name: string; company: string | null } | null;
  leader: { name: string };
  admin: { name: string } | null;
  items: {
    qty: number;
    item: {
      code: string;
      name: string;
      size: string | null;
      unit: string;
    };
  }[];
};

/**
 * Nomor surat diturunkan dari nomor request supaya tidak ada urutan terpisah
 * yang bisa bentrok: REQ-2026-0007 → 007/ST-LP/RT/2026.
 */
export function taskLetterNumber(number: string, createdAt: Date) {
  const sequence = number.match(/(\d+)$/)?.[1] ?? "001";
  return `${sequence.padStart(3, "0")}/ST-LP/RT/${new Date(createdAt).getFullYear()}`;
}

export async function buildTaskLetterPdf(request: TaskLetterDocument) {
  const doc = await createLetter();
  const crew = request.personnel ?? [];
  const customer = request.customer;

  doc.band({
    title: "SURAT TUGAS",
    subtitle: "Pekerjaan Radiography Test",
    label: "Nomor surat",
    value: taskLetterNumber(request.number, request.createdAt),
  });

  doc.meta([
    ["Tanggal", pdfDate(request.createdAt)],
    ["Lokasi tujuan", request.site],
    ["Project", customer ? customer.company || customer.name : "—"],
    ["Jumlah personel", `${crew.length} orang`],
    ["Nomor PO", request.poNo],
    ["Referensi request", request.number],
  ]);

  doc.paragraph(
    "Yang bertanda tangan di bawah ini menugaskan personel pada tabel pertama untuk melaksanakan pekerjaan radiography test di lokasi dan project tersebut, dengan peralatan dan bahan pada tabel kedua.",
  );

  doc.sectionLabel("PERSONEL YANG DITUGASKAN");
  doc.table(
    [
      { label: "No", width: 34, align: "center" },
      { label: "Nama", width: 287 },
      { label: "Jabatan", width: 190.28 },
    ],
    crew.map((row, index) => [String(index + 1), row.name, row.position]),
  );

  doc.sectionLabel("PERALATAN & BAHAN");
  doc.table(
    [
      { label: "No", width: 30, align: "center" },
      { label: "Nama Alat", width: 218 },
      { label: "Qty", width: 52, align: "right" },
      { label: "Nomor Serial/Keterangan", width: 146 },
      { label: "Checklist", width: 65.28, align: "center", check: true },
    ],
    request.items.map((row, index) => [
      String(index + 1),
      row.item.name,
      `${row.qty} ${row.item.unit}`,
      [row.item.code, row.item.size].filter(Boolean).join(" · "),
      "1",
    ]),
  );

  doc.sectionLabel("CATATAN KESELAMATAN");
  doc.paragraph(
    "Pekerjaan dilaksanakan sesuai prosedur proteksi radiasi: area dibarikade, lampu rotari dinyalakan, dan TLD badge dipakai seluruh personel selama bekerja.",
  );

  if (request.note?.trim()) {
    doc.sectionLabel("CATATAN PEKERJAAN");
    doc.paragraph(request.note.trim());
  }

  doc.signatures([
    { role: "Penerima Tugas, Leader", name: request.leader.name },
    { role: "Pemberi Tugas, Admin", name: request.admin?.name ?? "" },
  ]);

  return doc.finish(request.createdAt);
}
