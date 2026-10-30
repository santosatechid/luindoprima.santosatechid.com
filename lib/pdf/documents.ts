import { createLetter, pdfDate } from "@/lib/pdf/letter";

type DeliveryNoteDocument = {
  number: string;
  issuedAt: Date;
  status: string;
  vehicle: string | null;
  createdBy: { name: string };
  request: {
    number: string;
    poNo: string;
    site: string;
    customer: { name: string; company: string | null; address: string | null } | null;
    leader: { name: string };
  };
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

type DamageDocument = {
  id: string;
  submittedAt: Date | null;
  verifiedAt: Date | null;
  note: string | null;
  submittedBy: { name: string };
  verifiedBy: { name: string } | null;
  deliveryNote: {
    number: string;
    request: {
      number: string;
      poNo: string;
      site: string;
      customer: { name: string; company: string | null } | null;
      leader: { name: string };
    };
  };
  items: {
    brought: number;
    used: number;
    returned: number;
    damaged: number;
    item: { code: string; name: string; size: string | null; unit: string };
  }[];
};

const STATUS_LABEL: Record<string, string> = {
  ISSUED: "Diterbitkan",
  CONFIRMED: "Barang dibawa",
  COMPLETED: "Selesai",
};

export async function buildDeliveryNotePdf(note: DeliveryNoteDocument) {
  const doc = await createLetter();
  const customer = note.request.customer;

  doc.title("SURAT JALAN", note.number);
  doc.stamp("Status dokumen", STATUS_LABEL[note.status] ?? note.status);
  doc.meta([
    ["Nomor surat jalan", note.number],
    ["Tanggal terbit", pdfDate(note.issuedAt)],
    ["Nomor PO", note.request.poNo],
    ["Nomor request", note.request.number],
    ["Pelanggan", customer?.company || customer?.name || "—"],
    ["Site / lokasi", note.request.site],
    ["Leader", note.request.leader.name],
    ["Kendaraan", note.vehicle || "Dibawa Leader"],
  ]);

  if (customer?.address) {
    doc.sectionLabel("ALAMAT PELANGGAN");
    doc.paragraph(customer.address);
  }

  doc.sectionLabel("RINCIAN BARANG");
  doc.table(
    [
      { label: "No", width: 26, align: "center" },
      { label: "Kode", width: 62 },
      { label: "Nama barang", width: 196 },
      { label: "Ukuran", width: 86 },
      { label: "Jumlah", width: 56, align: "right" },
      { label: "Satuan", width: 58 },
    ],
    note.items.map((row, index) => [
      String(index + 1),
      row.item.code,
      row.item.name,
      row.item.size ?? "—",
      String(row.qty),
      row.item.unit,
    ]),
  );

  doc.paragraph(
    "Barang tersebut di atas diserahkan dalam kondisi baik dan lengkap. Jumlah telah diperiksa bersama oleh pihak pengirim dan penerima.",
  );

  doc.signatures([
    { role: "Hormat kami, Admin Gudang", name: note.createdBy.name },
    { role: "Dibawa oleh, Leader", name: note.request.leader.name },
    { role: "Diterima oleh, Pelanggan", name: "" },
  ]);

  return doc.finish(note.issuedAt);
}

export async function buildDamageReportPdf(turnover: DamageDocument) {
  const doc = await createLetter();
  const damaged = turnover.items.filter((row) => row.damaged > 0);
  const customer = turnover.deliveryNote.request.customer;

  doc.title("BERITA ACARA BARANG RUSAK", `Turnover ${turnover.deliveryNote.number}`);
  doc.meta([
    ["Nomor surat jalan", turnover.deliveryNote.number],
    ["Nomor PO", turnover.deliveryNote.request.poNo],
    ["Pelanggan", customer?.company || customer?.name || "—"],
    ["Site / lokasi", turnover.deliveryNote.request.site],
    ["Leader", turnover.deliveryNote.request.leader.name],
    [
      "Tanggal laporan",
      pdfDate(turnover.verifiedAt ?? turnover.submittedAt),
    ],
    ["Diserahkan oleh", turnover.submittedBy.name],
    ["Diverifikasi oleh", turnover.verifiedBy?.name ?? "Menunggu verifikasi"],
  ]);

  doc.sectionLabel("RINCIAN BARANG RUSAK");
  doc.table(
    [
      { label: "No", width: 26, align: "center" },
      { label: "Kode", width: 64 },
      { label: "Nama barang", width: 196 },
      { label: "Ukuran", width: 88 },
      { label: "Rusak", width: 52, align: "right" },
      { label: "Satuan", width: 58 },
      { label: "Dibawa", width: 50, align: "right" },
    ],
    damaged.map((row, index) => [
      String(index + 1),
      row.item.code,
      row.item.name,
      row.item.size ?? "—",
      String(row.damaged),
      row.item.unit,
      String(row.brought),
    ]),
  );

  doc.sectionLabel("KETERANGAN");
  doc.paragraph(
    turnover.note?.trim() ||
      "Barang rusak dicatat berdasarkan laporan turnover Leader dan telah diverifikasi Admin.",
  );

  doc.paragraph(
    `Total barang kembali ke gudang: ${turnover.items.reduce((sum, row) => sum + row.returned, 0)} unit. Total terpakai: ${turnover.items.reduce((sum, row) => sum + row.used, 0)} unit.`,
  );

  doc.signatures([
    { role: "Admin Gudang", name: turnover.verifiedBy?.name ?? "" },
    { role: "Leader Lapangan", name: turnover.submittedBy.name },
  ]);

  return doc.finish(turnover.verifiedAt ?? turnover.submittedAt ?? new Date());
}
