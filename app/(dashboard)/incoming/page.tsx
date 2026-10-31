"use client";

import { Building2, FileText, Inbox, Plus, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shell/page-header";
import { DateRangePicker } from "@/components/common/date-range-picker";
import { EmptyState, StatCard } from "@/components/shell/stat-card";
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
import { useCreateIncoming, useIncoming } from "@/hooks/inventory/useIncoming";
import { useItems, useSuppliers } from "@/hooks/inventory/useItems";
import { formatDate, inRange, todayInput } from "@/lib/format";

export default function IncomingPage() {
  const { data: rows = [] } = useIncoming();
  const { data: items = [] } = useItems();
  const { data: suppliers = [] } = useSuppliers();
  const createIncoming = useCreateIncoming();

  const [receivedAt, setReceivedAt] = useState(todayInput());
  const [supplierId, setSupplierId] = useState("");
  const [itemId, setItemId] = useState("");
  const [qty, setQty] = useState("1");
  const [documentNo, setDocumentNo] = useState("");
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const selectedItem = items.find((item) => item.id === itemId);
  const now = new Date();
  const thisMonth = rows.filter((row) => {
    const date = new Date(row.receivedAt);
    return (
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  });
  const itemIn = thisMonth.reduce(
    (sum, row) => sum + row.items.reduce((s, item) => s + item.qty, 0),
    0,
  );

  const query = search.trim().toLowerCase();
  const filtered = rows.filter((row) => {
    const matchesSearch =
      !query ||
      row.number.toLowerCase().includes(query) ||
      (row.documentNo ?? "").toLowerCase().includes(query) ||
      row.supplier.name.toLowerCase().includes(query) ||
      row.createdBy.name.toLowerCase().includes(query) ||
      row.items.some((rowItem) =>
        rowItem.item.name.toLowerCase().includes(query),
      );
    return (
      matchesSearch &&
      (supplierFilter === "ALL" || row.supplierId === supplierFilter) &&
      inRange(row.receivedAt, dateFrom, dateTo)
    );
  });

  async function submit() {
    if (!supplierId || !itemId || Number(qty) <= 0) {
      toast.error("Supplier, item, dan jumlah wajib diisi.");
      return;
    }
    await createIncoming.mutateAsync({
      supplierId,
      receivedAt,
      documentNo: documentNo || undefined,
      note: note || undefined,
      items: [{ itemId, qty: Number(qty) }],
    });
    toast.success("Barang masuk disimpan. Stok gudang bertambah.");
    setSupplierId("");
    setItemId("");
    setQty("1");
    setDocumentNo("");
    setNote("");
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Barang Masuk"
        description="Catat penerimaan consumable dari supplier. Stok gudang bertambah setelah disimpan."
        actions={
          <Button size="sm" onClick={submit} disabled={createIncoming.isPending}>
            <Plus />
            {createIncoming.isPending ? "Menyimpan…" : "Catat Barang Masuk"}
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Penerimaan Bulan Ini"
          value={`${thisMonth.length} dokumen`}
          icon={FileText}
        />
        <StatCard label="Item Masuk" value={`${itemIn} unit`} icon={Inbox} />
        <StatCard
          label="Supplier Aktif"
          value={`${suppliers.filter((supplier) => supplier.isActive).length} supplier`}
          icon={Building2}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="bg-card border-border flex flex-col gap-3 rounded-xl border p-4">
          <div>
            <p className="text-[13.5px] font-semibold">Riwayat Barang Masuk</p>
            <p className="text-muted-foreground text-[11.5px]">
              Transaksi penerimaan terbaru
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <div className="border-border flex min-w-[200px] flex-1 items-center gap-2 rounded-lg border px-3">
              <Search className="text-muted-foreground size-3.5" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nomor, dokumen, supplier, item, atau admin…"
                className="h-9 border-0 bg-transparent px-0 text-xs shadow-none focus-visible:ring-0"
              />
            </div>
            <SearchableSelect
              value={supplierFilter}
              onValueChange={setSupplierFilter}
              searchPlaceholder="Cari supplier…"
              options={[
                { value: "ALL", label: "Semua supplier" },
                ...suppliers.map((supplier) => ({
                  value: supplier.id,
                  label: supplier.name,
                })),
              ]}
              className="h-9 w-full text-xs sm:w-[180px]"
            />
            <DateRangePicker
              from={dateFrom}
              to={dateTo}
              onChange={({ from, to }) => {
                setDateFrom(from);
                setDateTo(to);
              }}
              className="w-full sm:w-[250px]"
            />
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              title="Belum ada penerimaan"
              description="Catat barang masuk melalui form di samping."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nomor</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Jumlah</TableHead>
                  <TableHead>Admin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <p className="text-xs font-medium">{row.number}</p>
                      <p className="text-muted-foreground text-[10.5px]">
                        {row.documentNo ?? "—"}
                      </p>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {formatDate(row.receivedAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {row.supplier.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {row.items
                        .map((item) => `${item.item.name} (${item.qty})`)
                        .join(", ")}
                    </TableCell>
                    <TableCell className="text-xs">
                      {row.items.reduce((sum, item) => sum + item.qty, 0)} unit
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {row.createdBy.name}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="bg-card border-border flex h-fit flex-col gap-3 rounded-xl border p-4">
          <p className="text-[13.5px] font-semibold">Catat Barang Masuk</p>

          <div className="grid gap-1.5">
            <Label className="text-[11.5px]">Tanggal terima</Label>
            <Input
              type="date"
              value={receivedAt}
              onChange={(event) => setReceivedAt(event.target.value)}
            />
          </div>

          <div className="grid gap-1.5">
            <Label className="text-[11.5px]">Supplier</Label>
            <SearchableSelect
              value={supplierId}
              onValueChange={setSupplierId}
              placeholder="Pilih supplier"
              searchPlaceholder="Cari supplier…"
              options={suppliers.map((supplier) => ({
                value: supplier.id,
                label: supplier.name,
              }))}
              className="w-full"
            />
          </div>

          <div className="grid gap-1.5">
            <Label className="text-[11.5px]">Item consumable</Label>
            <SearchableSelect
              value={itemId}
              onValueChange={setItemId}
              placeholder="Pilih item"
              searchPlaceholder="Cari nama atau kode item…"
              options={items.map((item) => ({
                value: item.id,
                label: item.name,
                hint: `${item.code} · stok ${item.stockGudang} ${item.unit}`,
              }))}
              className="w-full"
            />
          </div>

          <div className="grid gap-1.5">
            <Label className="text-[11.5px]">Jumlah diterima</Label>
            <Input
              type="number"
              min={1}
              value={qty}
              className="input-number px-3"
              onChange={(event) => setQty(event.target.value)}
            />
            <p className="text-muted-foreground text-[10.5px]">
              Satuan: {selectedItem?.unit ?? "—"} · stok saat ini{" "}
              {selectedItem?.stockGudang ?? 0}
            </p>
          </div>

          <div className="grid gap-1.5">
            <Label className="text-[11.5px]">Nomor PO supplier</Label>
            <Input
              value={documentNo}
              placeholder="DO/SNT/2026/1024"
              onChange={(event) => setDocumentNo(event.target.value)}
            />
          </div>

          <div className="grid gap-1.5">
            <Label className="text-[11.5px]">Catatan</Label>
            <Textarea
              rows={2}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>

          <Button onClick={submit} disabled={createIncoming.isPending}>
            {createIncoming.isPending ? "Menyimpan…" : "Simpan Barang Masuk"}
          </Button>
          <p className="text-muted-foreground text-[10.5px]">
            Setelah disimpan, stok gudang bertambah dan transaksi tercatat di
            riwayat.
          </p>
        </div>
      </div>
    </div>
  );
}
