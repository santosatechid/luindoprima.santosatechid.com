"use client";

import {
  AlertTriangle,
  Download,
  Package,
  RefreshCw,
  Search,
  Warehouse,
} from "lucide-react";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/shell/page-header";
import { TableSkeleton } from "@/components/shell/loading-state";
import { EmptyState, StatCard } from "@/components/shell/stat-card";
import { StatusBadge } from "@/components/shell/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDeliveryNotes } from "@/hooks/inventory/useDeliveryNotes";
import { useTurnovers } from "@/hooks/inventory/useTurnovers";
import {
  useItemCategories,
  useItems,
  useSuppliers,
} from "@/hooks/inventory/useItems";
import { downloadCsv } from "@/lib/csv";
import { formatDateTime } from "@/lib/format";
import type { Item } from "@/types/inventory";

function stockStatus(item: Item) {
  if (item.stockGudang === 0) return "EMPTY";
  if (item.stockGudang <= item.minStock) return "LOW";
  return "SAFE";
}

export default function StockPage() {
  const {
    data: items = [],
    isLoading,
    isFetching,
    refetch,
    dataUpdatedAt,
  } = useItems({ staleTime: 30 * 1000 });
  const { data: suppliers = [] } = useSuppliers();
  const { data: categories = [] } = useItemCategories();
  const { data: notes = [] } = useDeliveryNotes();
  const { data: turnovers = [] } = useTurnovers();

  const [tab, setTab] = useState("stock");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [supplierFilter, setSupplierFilter] = useState("ALL");
  const [stockFilter, setStockFilter] = useState("ALL");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.code.toLowerCase().includes(query) ||
        (item.brand ?? "").toLowerCase().includes(query);
      const matchesCategory =
        category === "ALL" || item.categoryId === category;
      const matchesSupplier =
        supplierFilter === "ALL" || item.supplierId === supplierFilter;
      const matchesStock =
        stockFilter === "ALL" ||
        (stockFilter === "SAFE" && item.stockGudang > item.minStock) ||
        (stockFilter === "LOW" &&
          item.stockGudang > 0 &&
          item.stockGudang <= item.minStock) ||
        (stockFilter === "EMPTY" && item.stockGudang === 0);
      return matchesSearch && matchesCategory && matchesSupplier && matchesStock;
    });
  }, [items, search, category, supplierFilter, stockFilter]);

  const totalGudang = items.reduce((sum, item) => sum + item.stockGudang, 0);
  const totalOperasional = items.reduce(
    (sum, item) => sum + item.stockOperasional,
    0,
  );
  const lowStock = items.filter((item) => item.stockGudang <= item.minStock);

  const summaryRows = useMemo(() => {
    type SummaryRow = {
      key: string;
      itemId: string;
      code: string;
      name: string;
      size: string | null;
      unit: string;
      stockGudang: number;
      minStock: number;
      customer: string;
      leaders: Set<string>;
      delivered: number;
      used: number;
      returned: number;
      damaged: number;
    };

    const itemById = new Map(items.map((item) => [item.id, item]));
    const noteById = new Map(notes.map((note) => [note.id, note]));
    const map = new Map<string, SummaryRow>();

    function entryFor(
      itemId: string,
      customerName: string,
      fallback?: {
        code: string;
        name: string;
        size: string | null;
        unit: string;
        stockGudang: number;
        minStock: number;
      },
    ) {
      const key = `${itemId}:${customerName}`;
      const existing = map.get(key);
      if (existing) return existing;
      const item = itemById.get(itemId);
      const row: SummaryRow = {
        key,
        itemId,
        code: item?.code ?? fallback?.code ?? "—",
        name: item?.name ?? fallback?.name ?? "—",
        size: item?.size ?? fallback?.size ?? null,
        unit: item?.unit ?? fallback?.unit ?? "",
        stockGudang: item?.stockGudang ?? fallback?.stockGudang ?? 0,
        minStock: item?.minStock ?? fallback?.minStock ?? 0,
        customer: customerName,
        leaders: new Set<string>(),
        delivered: 0,
        used: 0,
        returned: 0,
        damaged: 0,
      };
      map.set(key, row);
      return row;
    }

    for (const note of notes) {
      if (!["CONFIRMED", "COMPLETED"].includes(note.status)) continue;
      const customerName =
        note.request.customer?.company ||
        note.request.customer?.name ||
        "Tanpa pelanggan";
      for (const row of note.items) {
        const entry = entryFor(row.itemId, customerName, row.item);
        entry.delivered += row.qty;
        entry.leaders.add(note.request.leader.name);
      }
    }

    for (const turnover of turnovers) {
      const note = noteById.get(turnover.deliveryNote.id);
      if (!note) continue;
      const customerName =
        note.request.customer?.company ||
        note.request.customer?.name ||
        "Tanpa pelanggan";
      for (const row of turnover.items) {
        const entry = entryFor(row.itemId, customerName, row.item);
        entry.used += row.used;
        entry.returned += row.returned;
        entry.damaged += row.damaged;
        entry.leaders.add(turnover.submittedBy.name);
      }
    }

    return Array.from(map.values()).sort(
      (a, b) =>
        a.code.localeCompare(b.code) || a.customer.localeCompare(b.customer),
    );
  }, [items, notes, turnovers]);

  const exportSummary = () => {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, "0");
    downloadCsv(
      `ringkasan-barang-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}.csv`,
      [
        ["Tanggal Export", formatDateTime(now)],
        [],
        [
          "Kode",
          "Barang",
          "Ukuran",
          "Satuan",
          "Pelanggan",
          "Leader",
          "Dikirim",
          "Terpakai",
          "Kembali",
          "Rusak",
          "Stok Gudang",
        ],
        ...summaryRows.map((row) => [
          row.code,
          row.name,
          row.size ?? "",
          row.unit,
          row.customer,
          Array.from(row.leaders).join(", "),
          row.delivered,
          row.used,
          row.returned,
          row.damaged,
          row.stockGudang,
        ]),
      ],
    );
  };

  const exportCsv = () => {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, "0");
    downloadCsv(
      `stok-inventory-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.csv`,
      [
        ["Tanggal Export", formatDateTime(now)],
        [],
        [
          "Kode",
          "Nama",
          "Kategori",
          "Merek",
          "Ukuran",
          "Satuan",
          "Stok Gudang",
          "Stok Operasional",
          "Stok Minimum",
          "Status",
          "Supplier",
        ],
        ...filtered.map((item) => [
          item.code,
          item.name,
          item.category?.name ?? "",
          item.brand ?? "",
          item.size ?? "",
          item.unit,
          item.stockGudang,
          item.stockOperasional,
          item.minStock,
          stockStatus(item) === "EMPTY"
            ? "Habis"
            : stockStatus(item) === "LOW"
              ? "Menipis"
              : "Aman",
          item.supplier?.name ?? "",
        ]),
      ],
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Stok Inventory"
        description="Pantau posisi stok gudang dan operasional seluruh item secara terkini."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={isFetching ? "animate-spin" : undefined} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={tab === "summary" ? exportSummary : exportCsv}
              disabled={
                tab === "summary" ? summaryRows.length === 0 : filtered.length === 0
              }
            >
              <Download />
              Ekspor {tab === "summary" ? "Sheet" : "Excel"}
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Item" value={items.length} icon={Package} />
        <StatCard
          label="Stok Gudang"
          value={totalGudang.toLocaleString("id-ID")}
          icon={Warehouse}
        />
        <StatCard
          label="Stok Operasional"
          value={totalOperasional.toLocaleString("id-ID")}
          icon={Warehouse}
        />
        <StatCard
          label="Di Bawah Minimum"
          value={lowStock.length}
          icon={AlertTriangle}
        >
          <span className="text-muted-foreground text-[11px]">
            {lowStock.filter((item) => item.stockGudang === 0).length} item
            habis
          </span>
        </StatCard>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="gap-4">
        <TabsList className="h-auto flex-wrap justify-start gap-5 rounded-none bg-transparent p-0">
          {[
            ["stock", "Posisi Stok", items.length],
            ["summary", "Ringkasan per Barang", summaryRows.length],
          ].map(([value, label, count]) => (
            <TabsTrigger
              key={String(value)}
              value={String(value)}
              className="data-[state=active]:text-foreground text-muted-foreground data-[state=active]:border-foreground rounded-none border-0 border-b-2 border-transparent px-0 pb-2.5 text-[12.5px] data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              {label}
              <span className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10.5px]">
                {count}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="stock" className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <div className="border-border flex min-w-[200px] flex-1 items-center gap-2 rounded-lg border px-3">
          <Search className="text-muted-foreground size-3.5" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nama, kode, atau merek item…"
            className="h-9 border-0 bg-transparent px-0 text-xs shadow-none focus-visible:ring-0"
          />
        </div>
        <SearchableSelect
          value={category}
          onValueChange={setCategory}
          searchPlaceholder="Cari kategori…"
          options={[
            { value: "ALL", label: "Semua kategori" },
            ...categories.map((row) => ({
              value: row.id,
              label: row.name,
              hint: row.code,
            })),
          ]}
          className="h-9 w-full text-xs sm:w-[170px]"
        />
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
          className="h-9 w-full text-xs sm:w-[170px]"
        />
        <SearchableSelect
          value={stockFilter}
          onValueChange={setStockFilter}
          searchPlaceholder="Cari status stok…"
          options={[
            { value: "ALL", label: "Semua stok" },
            { value: "SAFE", label: "Aman" },
            { value: "LOW", label: "Menipis" },
            { value: "EMPTY", label: "Habis" },
          ]}
          className="h-9 w-full text-xs sm:w-[150px]"
        />
      </div>

      <div className="bg-card border-border overflow-x-auto rounded-xl border">
        {isLoading ? (
          <TableSkeleton rows={8} columns={7} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Tidak ada item"
            description="Ubah pencarian atau filter untuk melihat item lain."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60">
                <TableHead className="w-24">Kode</TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="w-28">Kategori</TableHead>
                <TableHead className="w-20">Gudang</TableHead>
                <TableHead className="w-28">Operasional</TableHead>
                <TableHead className="w-20">Minimum</TableHead>
                <TableHead className="w-28">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-xs font-medium">
                    {item.code}
                  </TableCell>
                  <TableCell>
                    <p className="text-xs font-medium">{item.name}</p>
                    <p className="text-muted-foreground text-[10.5px]">
                      {item.brand ?? "—"} ·{" "}
                      {item.supplier?.name ?? "Tanpa supplier"}
                    </p>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {item.category?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs font-medium">
                    {item.stockGudang} {item.unit}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {item.stockOperasional} {item.unit}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {item.minStock}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={stockStatus(item)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-[11.5px]">
        <span>
          Menampilkan {filtered.length} dari {items.length} item.
        </span>
        <span>
          Diperbarui:{" "}
          {dataUpdatedAt ? formatDateTime(new Date(dataUpdatedAt)) : "—"}
        </span>
      </div>
        </TabsContent>

        <TabsContent value="summary" className="flex flex-col gap-3">
          <div className="bg-card border-border overflow-x-auto rounded-xl border">
            {summaryRows.length === 0 ? (
              <EmptyState
                title="Belum ada barang keluar"
                description="Ringkasan terbentuk setelah surat jalan dikonfirmasi Admin."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60">
                    <TableHead>Barang</TableHead>
                    <TableHead className="w-44">Pelanggan</TableHead>
                    <TableHead className="w-40">Leader</TableHead>
                    <TableHead className="w-20 text-right">Dikirim</TableHead>
                    <TableHead className="w-20 text-right">Terpakai</TableHead>
                    <TableHead className="w-20 text-right">Kembali</TableHead>
                    <TableHead className="w-20 text-right">Rusak</TableHead>
                    <TableHead className="w-24 text-right">Stok</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summaryRows.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell>
                        <p className="text-xs font-medium">{row.name}</p>
                        <p className="text-muted-foreground text-[10.5px]">
                          {row.code} · {row.size ?? "—"} · {row.unit}
                        </p>
                      </TableCell>
                      <TableCell className="text-xs">{row.customer}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {Array.from(row.leaders).join(", ")}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums">
                        {row.delivered}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums">
                        {row.used}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums">
                        {row.returned}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums">
                        {row.damaged}
                      </TableCell>
                      <TableCell className="text-right">
                        <StatusBadge
                          status={
                            row.stockGudang === 0
                              ? "EMPTY"
                              : row.stockGudang <= row.minStock
                                ? "LOW"
                                : "SAFE"
                          }
                          label={`${row.stockGudang} ${row.unit}`}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <p className="text-muted-foreground text-[11.5px]">
            Satu baris = satu barang di satu pelanggan. Kolom dikirim, terpakai,
            kembali, dan rusak dihitung dari surat jalan serta turnover.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
