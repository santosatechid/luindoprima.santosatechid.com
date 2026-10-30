/**
 * Template WhatsApp dengan variasi otomatis.
 *
 * Setiap notifikasi punya beberapa susunan kalimat. Satu varian dipilih acak
 * per pengiriman supaya pesan berulang tidak identik dan lebih kecil peluang
 * dianggap spam oleh WhatsApp.
 */

export type NotificationKind =
  | "requestSubmitted"
  | "requestAdminApproved"
  | "requestDirectorApproved"
  | "requestRejected"
  | "deliveryIssued"
  | "deliveryConfirmed"
  | "turnoverSubmitted"
  | "turnoverVerified";

type Vars = Record<string, string | number | undefined>;

type Row = [label: string, key: string];

const build = (vars: Vars, rows: Row[]) =>
  rows
    .filter(([, key]) => vars[key] !== undefined && vars[key] !== "")
    .map(([label, key]) =>
      String(vars[key]).startsWith("\n")
        ? `${label}:${vars[key]}`
        : `${label}: ${vars[key]}`,
    )
    .join("\n");

type ItemLine = {
  item: { name: string; unit: string };
  qty?: number;
  brought?: number;
};

export const formatItems = (rows: ItemLine[]) =>
  rows.length === 0
    ? ""
    : `\n${rows
        .map(
          (row) =>
            `  • ${row.item.name} — ${row.qty ?? row.brought ?? 0} ${row.item.unit}`,
        )
        .join("\n")}`;

const templates: Record<NotificationKind, ((vars: Vars) => string)[]> = {
  requestSubmitted: [
    (v) =>
      `📋 Request baru menunggu verifikasi Admin.\n\n${build(v, [
        ["No. Request", "number"],
        ["No. PO", "poNo"],
        ["Pelanggan", "customer"],
        ["Site", "site"],
        ["Leader", "leader"],
        ["Barang", "items"],
      ])}\n\nMohon dicek saat sempat. Terima kasih 🙏`,
    (v) =>
      `📝 Ada request baru yang perlu diverifikasi.\n\n${build(v, [
        ["Pelanggan", "customer"],
        ["Site", "site"],
        ["No. PO", "poNo"],
        ["No. Request", "number"],
        ["Barang", "items"],
        ["Leader", "leader"],
      ])}\n\nSilakan review 🔎`,
    (v) =>
      `🗂️ Request baru masuk, menunggu verifikasi Admin.\n\n${build(v, [
        ["No. Request", "number"],
        ["Leader", "leader"],
        ["Pelanggan", "customer"],
        ["Site", "site"],
        ["No. PO", "poNo"],
        ["Barang", "items"],
      ])}`,
  ],
  requestAdminApproved: [
    (v) =>
      `✅ Request sudah diverifikasi Admin, menunggu persetujuan Direktur ⏳\n\n${build(v, [
        ["No. Request", "number"],
        ["No. PO", "poNo"],
        ["Pelanggan", "customer"],
        ["Site", "site"],
        ["Leader", "leader"],
        ["Barang", "items"],
      ])}\n\nMohon arahan.`,
    (v) =>
      `🔎 Menunggu persetujuan Direktur.\n\n${build(v, [
        ["Pelanggan", "customer"],
        ["Site", "site"],
        ["No. PO", "poNo"],
        ["No. Request", "number"],
        ["Leader", "leader"],
        ["Barang", "items"],
      ])}\n\nRequest telah lolos verifikasi Admin ✅`,
    (v) =>
      `⏳ Admin sudah memverifikasi request berikut; tinggal persetujuan Direktur.\n\n${build(v, [
        ["No. Request", "number"],
        ["Leader", "leader"],
        ["Pelanggan", "customer"],
        ["Site", "site"],
        ["No. PO", "poNo"],
        ["Barang", "items"],
      ])}`,
  ],
  requestDirectorApproved: [
    (v) =>
      `🎉 Request disetujui Direktur. Surat jalan siap diterbitkan.\n\n${build(v, [
        ["No. Request", "number"],
        ["No. PO", "poNo"],
        ["Pelanggan", "customer"],
        ["Site", "site"],
        ["Leader", "leader"],
        ["Barang", "items"],
      ])}`,
    (v) =>
      `👍 Persetujuan Direktur sudah diterima. Surat jalan akan diterbitkan Admin.\n\n${build(v, [
        ["Pelanggan", "customer"],
        ["Site", "site"],
        ["No. PO", "poNo"],
        ["No. Request", "number"],
        ["Leader", "leader"],
        ["Barang", "items"],
      ])}`,
    (v) =>
      `✅ Request berikut sudah disetujui Direktur.\n\n${build(v, [
        ["No. Request", "number"],
        ["Leader", "leader"],
        ["Pelanggan", "customer"],
        ["Site", "site"],
        ["No. PO", "poNo"],
        ["Barang", "items"],
      ])}\n\nLangkah berikutnya: terbitkan surat jalan 🧾`,
  ],
  requestRejected: [
    (v) =>
      `❌ Request ditolak ${v.by}.\n\n${build(v, [
        ["No. Request", "number"],
        ["No. PO", "poNo"],
        ["Pelanggan", "customer"],
        ["Site", "site"],
        ["Barang", "items"],
      ])}\nCatatan: ${v.note ?? "—"}`,
    (v) =>
      `🙏 Mohon maaf, request berikut belum bisa disetujui ${v.by}.\n\n${build(v, [
        ["Pelanggan", "customer"],
        ["Site", "site"],
        ["No. PO", "poNo"],
        ["No. Request", "number"],
        ["Barang", "items"],
      ])}\nAlasan: ${v.note ?? "—"}`,
    (v) =>
      `⛔ Request tidak disetujui ${v.by}.\n\n${build(v, [
        ["No. Request", "number"],
        ["Pelanggan", "customer"],
        ["Site", "site"],
        ["No. PO", "poNo"],
        ["Barang", "items"],
      ])}\nCatatan: ${v.note ?? "—"}`,
  ],
  deliveryIssued: [
    (v) =>
      `🚚 Surat jalan sudah diterbitkan.\n\n${build(v, [
        ["No. Surat Jalan", "number"],
        ["No. PO", "poNo"],
        ["Pelanggan", "customer"],
        ["Site", "site"],
      ])}\n\nSilakan ambil barang di gudang; konfirmasi Admin akan mengubah stok 📦`,
    (v) =>
      `📦 Surat jalan siap. Barang bisa diambil di gudang.\n\n${build(v, [
        ["Pelanggan", "customer"],
        ["Site", "site"],
        ["No. PO", "poNo"],
        ["No. Surat Jalan", "number"],
      ])}\n\nStok berubah setelah Admin mengonfirmasi ✅`,
    (v) =>
      `🧾 Surat jalan Anda terbit.\n\n${build(v, [
        ["No. Surat Jalan", "number"],
        ["Site", "site"],
        ["Pelanggan", "customer"],
        ["No. PO", "poNo"],
      ])}\n\nMohon ambil barang, lalu tunggu konfirmasi Admin 🚚`,
  ],
  deliveryConfirmed: [
    (v) =>
      `📤 Barang sudah dikonfirmasi keluar gudang.\n\n${build(v, [
        ["No. Surat Jalan", "number"],
        ["No. PO", "poNo"],
        ["Site", "site"],
      ])}\n\nSegera isi laporan turnover setelah pekerjaan selesai 🔄`,
    (v) =>
      `✅ Barang keluar gudang telah dikonfirmasi.\n\n${build(v, [
        ["Site", "site"],
        ["No. PO", "poNo"],
        ["No. Surat Jalan", "number"],
      ])}\n\nJangan lupa laporan turnover setelah pekerjaan selesai 📝`,
    (v) =>
      `📦 Konfirmasi keluar gudang selesai.\n\n${build(v, [
        ["No. Surat Jalan", "number"],
        ["Site", "site"],
        ["No. PO", "poNo"],
      ])}\n\nIsi turnover begitu pekerjaan di site selesai ⏳`,
  ],
  turnoverSubmitted: [
    (v) =>
      `🔄 Laporan turnover baru menunggu verifikasi Admin.\n\n${build(v, [
        ["No. Surat Jalan", "number"],
        ["Site", "site"],
        ["Leader", "leader"],
        ["Item rusak", "damaged"],
        ["Barang", "items"],
      ])}\n\nMohon periksa sebelum stok disesuaikan 📊`,
    (v) =>
      `📊 Turnover masuk dan perlu diverifikasi.\n\n${build(v, [
        ["Leader", "leader"],
        ["Site", "site"],
        ["No. Surat Jalan", "number"],
        ["Item rusak", "damaged"],
        ["Barang", "items"],
      ])}\n\nSilakan cek rincian pemakaian 🔎`,
    (v) =>
      `📝 Laporan turnover baru diterima.\n\n${build(v, [
        ["No. Surat Jalan", "number"],
        ["Leader", "leader"],
        ["Site", "site"],
        ["Item rusak", "damaged"],
        ["Barang", "items"],
      ])}\n\nVerifikasi akan menyesuaikan stok gudang dan operasional ✅`,
  ],
  turnoverVerified: [
    (v) =>
      `✅ Laporan turnover Anda sudah diverifikasi Admin.\n\n${build(v, [
        ["No. Surat Jalan", "number"],
        ["No. PO", "poNo"],
        ["Site", "site"],
        ["Barang", "items"],
      ])}\n\nStok gudang dan operasional telah disesuaikan 📦`,
    (v) =>
      `🙌 Turnover diverifikasi. Terima kasih sudah melapor.\n\n${build(v, [
        ["Site", "site"],
        ["No. PO", "poNo"],
        ["No. Surat Jalan", "number"],
        ["Barang", "items"],
      ])}\n\nStok sudah diperbarui ✅`,
    (v) =>
      `📦 Verifikasi turnover selesai.\n\n${build(v, [
        ["No. Surat Jalan", "number"],
        ["Site", "site"],
        ["No. PO", "poNo"],
        ["Barang", "items"],
      ])}\n\nStok gudang dan operasional sudah disesuaikan ✅`,
  ],
};

export function renderNotification(kind: NotificationKind, vars: Vars) {
  const variants = templates[kind];
  return variants[Math.floor(Math.random() * variants.length)](vars);
}
