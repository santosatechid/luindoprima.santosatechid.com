"use client";

import { Plus, Send, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useCustomers } from "@/hooks/inventory/useCustomers";
import { useItems } from "@/hooks/inventory/useItems";
import { useCreateRequest } from "@/hooks/inventory/useRequests";
import { formatDate, todayInput } from "@/lib/format";

type Row = { itemId: string; qty: string };

export default function NewRequestPage() {
  const router = useRouter();
  const { data: items = [] } = useItems();
  const { data: customers = [] } = useCustomers();
  const createRequest = useCreateRequest();

  const [poNo, setPoNo] = useState("");
  const [site, setSite] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [neededAt, setNeededAt] = useState(todayInput());
  const [estimatedDoneAt, setEstimatedDoneAt] = useState("");
  const [note, setNote] = useState("");
  const [rows, setRows] = useState<Row[]>([{ itemId: "", qty: "1" }]);
  const [picker, setPicker] = useState("");

  const chosen = rows.filter((row) => row.itemId);

  function addRow() {
    if (!picker) return;
    if (rows.some((row) => row.itemId === picker)) {
      toast.error("Item sudah ada di daftar.");
      return;
    }
    setRows((current) => [
      ...current.filter((row) => row.itemId),
      { itemId: picker, qty: "1" },
    ]);
    setPicker("");
  }

  async function submit() {
    if (!poNo || !site || !neededAt || !customerId || chosen.length === 0) {
      toast.error(
        "Nomor PO, pelanggan, site, tanggal, dan minimal satu item wajib diisi.",
      );
      return;
    }
    if (chosen.some((row) => Number(row.qty) <= 0)) {
      toast.error("Jumlah item harus lebih dari nol.");
      return;
    }
    for (const row of chosen) {
      const item = items.find((entry) => entry.id === row.itemId);
      if (!item) continue;
      const available = item.stockGudang - item.onRequest;
      if (Number(row.qty) > available) {
        toast.error(
          `Stok ${item.name} tidak cukup. Tersedia ${available} ${item.unit}.`,
        );
        return;
      }
    }

    await createRequest.mutateAsync({
      poNo,
      site,
      customerId,
      neededAt,
      estimatedDoneAt: estimatedDoneAt || undefined,
      note: note || undefined,
      items: chosen.map((row) => ({
        itemId: row.itemId,
        qty: Number(row.qty),
      })),
    });

    toast.success("Request dikirim ke Admin.");
    router.push("/requests");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Buat Permintaan Baru"
        description="Isi data pekerjaan dan pilih item. Permintaan dikirim ke Admin untuk dicek stoknya."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/requests")}
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={submit}
              disabled={createRequest.isPending}
            >
              <Send />
              {createRequest.isPending ? "Mengirim…" : "Kirim Permintaan"}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-4">
          <div className="bg-card border-border flex flex-col gap-4 rounded-xl border p-4">
            <div>
              <p className="text-[13.5px] font-semibold">Informasi Pekerjaan</p>
              <p className="text-muted-foreground text-[11.5px]">
                Data ini dipakai untuk surat jalan dan laporan bulanan.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label className="text-[11.5px]">Nomor PO pelanggan</Label>
                <Input
                  value={poNo}
                  placeholder="PO/2026/0431"
                  onChange={(event) => setPoNo(event.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[11.5px]">Site / lokasi</Label>
                <Input
                  value={site}
                  placeholder="Suralaya, Cilegon"
                  onChange={(event) => setSite(event.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[11.5px]">Pelanggan</Label>
                <SearchableSelect
                  value={customerId}
                  onValueChange={setCustomerId}
                  placeholder="Pilih pelanggan"
                  searchPlaceholder="Cari nama pelanggan…"
                  options={customers
                    .filter((customer) => customer.isActive)
                    .map((customer) => ({
                      value: customer.id,
                      label: customer.name,
                      hint: customer.company ?? undefined,
                    }))}
                  className="w-full"
                />
                {customers.length === 0 ? (
                  <p className="text-muted-foreground text-[10.5px]">
                    Belum ada pelanggan. Minta Admin menambah data pelanggan.
                  </p>
                ) : null}
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[11.5px]">Tanggal dibutuhkan</Label>
                <Input
                  type="date"
                  value={neededAt}
                  onChange={(event) => setNeededAt(event.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[11.5px]">
                  Perkiraan selesai inspeksi
                </Label>
                <Input
                  type="date"
                  value={estimatedDoneAt}
                  onChange={(event) => setEstimatedDoneAt(event.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label className="text-[11.5px]">Catatan untuk Admin</Label>
              <Textarea
                rows={2}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Contoh: untuk radiografi weld joint pipa header unit 3."
              />
            </div>
          </div>

          <div className="bg-card border-border flex flex-col gap-3 rounded-xl border p-4">
            <div>
              <p className="text-[13.5px] font-semibold">Item yang Diminta</p>
              <p className="text-muted-foreground text-[11.5px]">
                {chosen.length} item dipilih · tersedia = stok gudang − yang
                sedang diminta.
              </p>
            </div>

            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="w-20">Stok</TableHead>
                    <TableHead className="w-24">Di request</TableHead>
                    <TableHead className="w-24">Tersedia</TableHead>
                    <TableHead className="w-28">Jumlah</TableHead>
                    <TableHead className="w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chosen.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-muted-foreground py-6 text-center text-xs"
                      >
                        Belum ada item dipilih.
                      </TableCell>
                    </TableRow>
                  ) : (
                    chosen.map((row) => {
                      const item = items.find((entry) => entry.id === row.itemId);
                      if (!item) return null;
                      return (
                        <TableRow key={row.itemId}>
                          <TableCell>
                            <p className="text-xs font-medium">{item.name}</p>
                            <p className="text-muted-foreground text-[10.5px]">
                              {item.code} · {item.brand ?? "—"}
                            </p>
                          </TableCell>
                          <TableCell className="text-xs">
                            {item.stockGudang} {item.unit}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {item.onRequest} {item.unit}
                          </TableCell>
                          <TableCell className="text-xs font-medium">
                            {item.stockGudang - item.onRequest} {item.unit}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={1}
                              max={item.stockGudang - item.onRequest}
                              value={row.qty}
                              onChange={(event) =>
                                setRows((current) =>
                                  current.map((entry) =>
                                    entry.itemId === row.itemId
                                      ? { ...entry, qty: event.target.value }
                                      : entry,
                                  ),
                                )
                              }
                              className="input-number h-8 w-24 px-2"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() =>
                                setRows((current) =>
                                  current.filter(
                                    (entry) => entry.itemId !== row.itemId,
                                  ),
                                )
                              }
                            >
                              <Trash2 />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <SearchableSelect
                value={picker}
                onValueChange={setPicker}
                placeholder="Pilih item untuk ditambahkan…"
                searchPlaceholder="Cari nama atau kode item…"
                options={items.map((item) => ({
                  value: item.id,
                  label: item.name,
                  hint: `${item.code} · stok ${item.stockGudang} ${item.unit}`,
                }))}
                className="w-full sm:flex-1"
              />
              <Button variant="outline" onClick={addRow}>
                <Plus />
                Tambah
              </Button>
            </div>

            <p className="text-muted-foreground text-[10.5px]">
              Jumlah tidak boleh melebihi stok gudang. Bila kebutuhan mendesak,
              tambahkan catatan.
            </p>
          </div>
        </div>

        <div className="flex h-fit flex-col gap-4">
          <div className="bg-card border-border flex flex-col gap-3 rounded-xl border p-4">
            <p className="text-[13.5px] font-semibold">Ringkasan Permintaan</p>
            {[
              ["Nomor PO", poNo || "—"],
              ["Site", site || "—"],
              [
                "Pelanggan",
                customers.find((customer) => customer.id === customerId)?.name ??
                  "—",
              ],
              ["Jumlah item", `${chosen.length} item`],
              [
                "Total unit",
                `${chosen.reduce((sum, row) => sum + Number(row.qty || 0), 0)} unit`,
              ],
              ["Dibutuhkan", formatDate(neededAt)],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-start justify-between gap-3 text-[11.5px]"
              >
                <span className="text-muted-foreground">{label}</span>
                <span className="text-right font-medium">{value}</span>
              </div>
            ))}
            <div className="bg-border h-px" />
            <div className="flex items-center justify-between text-[11.5px]">
              <span className="text-muted-foreground">
                Status setelah dikirim
              </span>
              <span className="bg-warning-surface text-warning rounded-full px-2.5 py-0.5 text-[11px] font-medium">
                Menunggu Admin
              </span>
            </div>
          </div>

          <div className="bg-card border-border flex flex-col gap-3 rounded-xl border p-4">
            <p className="text-[13.5px] font-semibold">Alur Persetujuan</p>
            {[
              ["1", "Admin memeriksa stok", "Menunggu Admin"],
              ["2", "Direktur menyetujui", "Menunggu Direktur"],
              ["3", "Admin menerbitkan surat jalan", "Surat Jalan"],
            ].map(([number, title, sub]) => (
              <div
                key={number}
                className="bg-muted flex items-center gap-2.5 rounded-lg px-3 py-2"
              >
                <span className="bg-background border-border flex size-5 items-center justify-center rounded-full border text-[10px] font-semibold">
                  {number}
                </span>
                <div>
                  <p className="text-[11.5px] font-medium">{title}</p>
                  <p className="text-muted-foreground text-[10px]">{sub}</p>
                </div>
              </div>
            ))}
          </div>

          <Button onClick={submit} disabled={createRequest.isPending}>
            <Send />
            {createRequest.isPending ? "Mengirim…" : "Kirim Permintaan"}
          </Button>
        </div>
      </div>
    </div>
  );
}
