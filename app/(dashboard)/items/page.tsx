"use client";

import {
  AlertTriangle,
  Download,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/shell/stat-card";
import { StatusBadge } from "@/components/shell/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateItem,
  useCreateSupplier,
  useItems,
  useSuppliers,
  useUpdateItem,
} from "@/hooks/inventory/useItems";
import { useTurnovers } from "@/hooks/inventory/useTurnovers";
import { TableSkeleton } from "@/components/shell/loading-state";
import { formatDate } from "@/lib/format";

const EMPTY_ITEM = {
  code: "",
  name: "",
  category: "Film",
  brand: "",
  size: "",
  unit: "box",
  stockGudang: "0",
  minStock: "0",
  supplierId: "",
};

const EMPTY_SUPPLIER = {
  name: "",
  contact: "",
  phone: "",
  email: "",
  address: "",
};

export default function ItemsPage() {
  const { data: items = [], isLoading } = useItems();
  const { data: suppliers = [] } = useSuppliers();
  const { data: turnovers = [], isLoading: turnoversLoading } = useTurnovers();
  const createItem = useCreateItem();
  const createSupplier = useCreateSupplier();
  const updateItem = useUpdateItem();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [supplierFilter, setSupplierFilter] = useState("ALL");
  const [stockFilter, setStockFilter] = useState("ALL");
  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierStatus, setSupplierStatus] = useState("ALL");
  const [itemForm, setItemForm] = useState(EMPTY_ITEM);
  const [supplierForm, setSupplierForm] = useState(EMPTY_SUPPLIER);
  const [itemOpen, setItemOpen] = useState(false);
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [minStock, setMinStock] = useState<Record<string, string>>({});

  const categories = useMemo(
    () => Array.from(new Set(items.map((item) => item.category))).sort(),
    [items],
  );

  const filtered = items.filter((item) => {
    const query = search.toLowerCase();
    const matchesSearch =
      item.name.toLowerCase().includes(query) ||
      item.code.toLowerCase().includes(query) ||
      (item.brand ?? "").toLowerCase().includes(query) ||
      (item.supplier?.name ?? "").toLowerCase().includes(query);
    const matchesSupplier =
      supplierFilter === "ALL" || item.supplierId === supplierFilter;
    const matchesStock =
      stockFilter === "ALL" ||
      (stockFilter === "EMPTY" && item.stockGudang === 0) ||
      (stockFilter === "LOW" &&
        item.stockGudang > 0 &&
        item.stockGudang <= item.minStock) ||
      (stockFilter === "SAFE" && item.stockGudang > item.minStock);
    return (
      matchesSearch &&
      matchesSupplier &&
      matchesStock &&
      (category === "ALL" || item.category === category)
    );
  });

  const supplierQuery = supplierSearch.trim().toLowerCase();
  const filteredSuppliers = suppliers.filter(
    (supplier) =>
      (!supplierQuery ||
        supplier.name.toLowerCase().includes(supplierQuery) ||
        (supplier.contact ?? "").toLowerCase().includes(supplierQuery) ||
        (supplier.phone ?? "").toLowerCase().includes(supplierQuery) ||
        (supplier.email ?? "").toLowerCase().includes(supplierQuery)) &&
      (supplierStatus === "ALL" ||
        (supplierStatus === "ACTIVE" ? supplier.isActive : !supplier.isActive)),
  );

  const lowStock = items.filter((item) => item.stockGudang <= item.minStock);
  const damagedRows = turnovers.filter((row) =>
    row.items.some((item) => item.damaged > 0),
  );

  const submitItem = async () => {
    if (!itemForm.code || !itemForm.name || !itemForm.unit) {
      toast.error("Kode, nama, dan satuan wajib diisi.");
      return;
    }
    await createItem.mutateAsync({
      ...itemForm,
      stockGudang: Number(itemForm.stockGudang),
      minStock: Number(itemForm.minStock),
      supplierId: itemForm.supplierId || null,
    });
    toast.success("Item ditambahkan.");
    setItemForm(EMPTY_ITEM);
    setItemOpen(false);
  };

  const submitSupplier = async () => {
    if (!supplierForm.name) {
      toast.error("Nama supplier wajib diisi.");
      return;
    }
    await createSupplier.mutateAsync(supplierForm);
    toast.success("Supplier ditambahkan.");
    setSupplierForm(EMPTY_SUPPLIER);
    setSupplierOpen(false);
  };

  const saveAlerts = async () => {
    const changed = items.filter(
      (item) =>
        minStock[item.id] !== undefined &&
        Number(minStock[item.id]) !== item.minStock,
    );
    for (const item of changed) {
      await updateItem.mutateAsync({
        id: item.id,
        code: item.code,
        name: item.name,
        category: item.category,
        brand: item.brand ?? "",
        size: item.size ?? "",
        unit: item.unit,
        minStock: Number(minStock[item.id]),
        supplierId: item.supplierId,
      });
    }
    toast.success(`${changed.length} batas minimum diperbarui.`);
    setAlertOpen(false);
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Master Item & Supplier"
        description="Daftar consumable, kategori, dan supplier yang dipakai pekerjaan inspeksi."
        actions={
          <>
            <Dialog open={alertOpen} onOpenChange={setAlertOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <SlidersHorizontal />
                  Atur Alert
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle>Atur batas stok minimum</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-lg border px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">
                          {item.name}
                        </p>
                        <p className="text-muted-foreground text-[10.5px]">
                          {item.code} · stok {item.stockGudang} {item.unit}
                        </p>
                      </div>
                      <Input
                        type="number"
                        min={0}
                        className="input-number h-8 w-24 px-2"
                        value={minStock[item.id] ?? String(item.minStock)}
                        onChange={(event) =>
                          setMinStock((current) => ({
                            ...current,
                            [item.id]: event.target.value,
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAlertOpen(false)}>
                    Batal
                  </Button>
                  <Button onClick={saveAlerts} disabled={updateItem.isPending}>
                    Simpan
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={supplierOpen} onOpenChange={setSupplierOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus />
                  Tambah Supplier
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tambah supplier</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3">
                  <div className="grid gap-1.5">
                    <Label>Nama supplier</Label>
                    <Input
                      value={supplierForm.name}
                      onChange={(event) =>
                        setSupplierForm({
                          ...supplierForm,
                          name: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label>Kontak</Label>
                      <Input
                        value={supplierForm.contact}
                        onChange={(event) =>
                          setSupplierForm({
                            ...supplierForm,
                            contact: event.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label>Telepon</Label>
                      <Input
                        value={supplierForm.phone}
                        onChange={(event) =>
                          setSupplierForm({
                            ...supplierForm,
                            phone: event.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={supplierForm.email}
                      onChange={(event) =>
                        setSupplierForm({
                          ...supplierForm,
                          email: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Alamat</Label>
                    <Textarea
                      rows={2}
                      value={supplierForm.address}
                      onChange={(event) =>
                        setSupplierForm({
                          ...supplierForm,
                          address: event.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setSupplierOpen(false)}
                  >
                    Batal
                  </Button>
                  <Button
                    onClick={submitSupplier}
                    disabled={createSupplier.isPending}
                  >
                    Simpan Supplier
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={itemOpen} onOpenChange={setItemOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus />
                  Tambah Item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle>Tambah item consumable</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label>Kode</Label>
                    <Input
                      value={itemForm.code}
                      placeholder="FILM-004"
                      onChange={(event) =>
                        setItemForm({ ...itemForm, code: event.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Kategori</Label>
                    <Input
                      value={itemForm.category}
                      list="item-category-options"
                      placeholder="Ketik atau pilih kategori"
                      onChange={(event) =>
                        setItemForm({
                          ...itemForm,
                          category: event.target.value,
                        })
                      }
                    />
                    <datalist id="item-category-options">
                      {categories.map((value) => (
                        <option key={value} value={value} />
                      ))}
                      {["Film", "Chemical", "Penetrant", "APD", "Lainnya"]
                        .filter((value) => !categories.includes(value))
                        .map((value) => (
                          <option key={value} value={value} />
                        ))}
                    </datalist>
                    <p className="text-muted-foreground text-[10px]">
                      Kategori baru langsung tersimpan dengan item ini.
                    </p>
                  </div>
                  <div className="col-span-2 grid gap-1.5">
                    <Label>Nama item</Label>
                    <Input
                      value={itemForm.name}
                      onChange={(event) =>
                        setItemForm({ ...itemForm, name: event.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Merek</Label>
                    <Input
                      value={itemForm.brand}
                      onChange={(event) =>
                        setItemForm({ ...itemForm, brand: event.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Ukuran</Label>
                    <Input
                      value={itemForm.size}
                      placeholder="30x40 cm"
                      onChange={(event) =>
                        setItemForm({ ...itemForm, size: event.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Satuan</Label>
                    <Input
                      value={itemForm.unit}
                      onChange={(event) =>
                        setItemForm({ ...itemForm, unit: event.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Supplier</Label>
                    <SearchableSelect
                      value={itemForm.supplierId || "NONE"}
                      onValueChange={(value) =>
                        setItemForm({
                          ...itemForm,
                          supplierId: value === "NONE" ? "" : value,
                        })
                      }
                      placeholder="Pilih supplier"
                      searchPlaceholder="Cari supplier…"
                      options={[
                        { value: "NONE", label: "Tanpa supplier" },
                        ...suppliers.map((supplier) => ({
                          value: supplier.id,
                          label: supplier.name,
                        })),
                      ]}
                      className="w-full"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Stok awal</Label>
                    <Input
                      type="number"
                      min={0}
                      className="input-number px-3"
                      value={itemForm.stockGudang}
                      onChange={(event) =>
                        setItemForm({
                          ...itemForm,
                          stockGudang: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Stok minimum</Label>
                    <Input
                      type="number"
                      min={0}
                      className="input-number px-3"
                      value={itemForm.minStock}
                      onChange={(event) =>
                        setItemForm({
                          ...itemForm,
                          minStock: event.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setItemOpen(false)}>
                    Batal
                  </Button>
                  <Button onClick={submitItem} disabled={createItem.isPending}>
                    Simpan Item
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      <Tabs defaultValue="items" className="gap-4">
        <TabsList className="h-auto flex-wrap justify-start gap-1 rounded-none bg-transparent p-0">
          {[
            ["items", "Item", items.length],
            ["suppliers", "Supplier", suppliers.length],
            ["damage", "Laporan Rusak", damagedRows.length],
          ].map(([value, label, count]) => (
            <TabsTrigger
              key={String(value)}
              value={String(value)}
              className="data-[state=active]:bg-transparent data-[state=active]:text-foreground text-muted-foreground rounded-none border-0 border-b-2 border-transparent px-1 pb-2.5 text-[12.5px] data-[state=active]:border-foreground data-[state=active]:shadow-none"
            >
              {label}
              <span className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10.5px]">
                {count}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="items" className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <div className="border-border flex min-w-[200px] flex-1 items-center gap-2 rounded-lg border px-3">
              <Search className="text-muted-foreground size-3.5" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama, kode, merek, atau supplier item…"
                className="h-9 border-0 bg-transparent px-0 text-xs shadow-none focus-visible:ring-0"
              />
            </div>
            <SearchableSelect
              value={category}
              onValueChange={setCategory}
              searchPlaceholder="Cari kategori…"
              options={[
                { value: "ALL", label: "Semua kategori" },
                ...categories.map((value) => ({ value, label: value })),
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

          {lowStock.length > 0 ? (
            <div className="bg-warning-surface border-warning-border flex items-center gap-3 rounded-lg border px-4 py-2.5">
              <AlertTriangle className="text-warning size-4 shrink-0" />
              <p className="text-warning text-[11.5px]">
                <span className="font-semibold">
                  {lowStock.length} item di bawah stok minimum
                </span>{" "}
                · {lowStock.filter((item) => item.stockGudang === 0).length} item
                habis. Alert otomatis muncul saat stok ≤ batas minimum.
              </p>
            </div>
          ) : null}

          <div className="bg-card border-border overflow-hidden rounded-xl border">
            {isLoading ? (
              <TableSkeleton rows={8} columns={10} />
            ) : filtered.length === 0 ? (
              <EmptyState title="Tidak ada item" description="Ubah filter atau tambah item baru." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60">
                    <TableHead className="w-24">Kode</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="w-28">Kategori</TableHead>
                    <TableHead className="w-24">Ukuran</TableHead>
                    <TableHead className="w-20">Stok</TableHead>
                    <TableHead className="w-24">Di request</TableHead>
                    <TableHead className="w-24">Tersedia</TableHead>
                    <TableHead className="w-20">Satuan</TableHead>
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
                          {item.brand ?? "—"} · {item.supplier?.name ?? "Tanpa supplier"}
                        </p>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {item.category}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {item.size ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {item.stockGudang}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {item.onRequest}
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {item.stockGudang - item.onRequest}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {item.unit}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {item.minStock}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={
                            item.stockGudang === 0
                              ? "EMPTY"
                              : item.stockGudang <= item.minStock
                                ? "LOW"
                                : "SAFE"
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <p className="text-muted-foreground text-[11.5px]">
            Menampilkan {filtered.length} dari {items.length} item.
          </p>
        </TabsContent>

        <TabsContent value="suppliers" className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <div className="border-border flex min-w-[200px] flex-1 items-center gap-2 rounded-lg border px-3">
              <Search className="text-muted-foreground size-3.5" />
              <Input
                value={supplierSearch}
                onChange={(event) => setSupplierSearch(event.target.value)}
                placeholder="Cari nama, kontak, telepon, atau email supplier…"
                className="h-9 border-0 bg-transparent px-0 text-xs shadow-none focus-visible:ring-0"
              />
            </div>
            <SearchableSelect
              value={supplierStatus}
              onValueChange={setSupplierStatus}
              searchPlaceholder="Cari status…"
              options={[
                { value: "ALL", label: "Semua status" },
                { value: "ACTIVE", label: "Aktif" },
                { value: "INACTIVE", label: "Nonaktif" },
              ]}
              className="h-9 w-full text-xs sm:w-[150px]"
            />
          </div>

          {filteredSuppliers.length === 0 ? (
            <div className="bg-card border-border rounded-xl border">
              <EmptyState
                title="Tidak ada supplier"
                description="Ubah filter atau tambah supplier baru."
              />
            </div>
          ) : (
          <div className="bg-card border-border overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead>Supplier</TableHead>
                  <TableHead>Kontak</TableHead>
                  <TableHead>Telepon</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-24">Item</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="text-xs font-medium">
                      {supplier.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {supplier.contact ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {supplier.phone ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {supplier.email ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {supplier._count?.items ?? 0}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={supplier.isActive ? "SAFE" : "DRAFT"}
                        label={supplier.isActive ? "Aktif" : "Nonaktif"}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          )}
        </TabsContent>

        <TabsContent value="damage" className="flex flex-col gap-3">
          <div className="bg-warning-surface border-warning-border flex items-start gap-2.5 rounded-lg border px-4 py-3">
            <AlertTriangle className="text-warning mt-0.5 size-4 shrink-0" />
            <p className="text-warning text-[11.5px] leading-5">
              Barang rusak berasal dari laporan turnover Leader yang sudah
              diverifikasi Admin. Setiap laporan dapat diunduh sebagai berita
              acara resmi.
            </p>
          </div>

          <div className="bg-card border-border overflow-x-auto rounded-xl border">
            {turnoversLoading ? (
              <TableSkeleton rows={4} columns={6} />
            ) : damagedRows.length === 0 ? (
              <EmptyState
                title="Tidak ada barang rusak"
                description="Laporan rusak akan muncul setelah turnover berisi barang rusak diverifikasi."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60">
                    <TableHead className="w-32">Surat Jalan</TableHead>
                    <TableHead>Pelanggan</TableHead>
                    <TableHead className="w-36">Leader</TableHead>
                    <TableHead className="w-32">Tanggal</TableHead>
                    <TableHead>Item &amp; Supplier</TableHead>
                    <TableHead className="w-20 text-right">Rusak</TableHead>
                    <TableHead className="w-28" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {damagedRows.map((row) => {
                    const damaged = row.items.filter(
                      (item) => item.damaged > 0,
                    );
                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <p className="text-xs font-medium">
                            {row.deliveryNote.number}
                          </p>
                          <p className="text-muted-foreground text-[10.5px]">
                            PO {row.deliveryNote.request.poNo}
                          </p>
                        </TableCell>
                        <TableCell className="text-xs">
                          {row.deliveryNote.request.customer?.company ??
                            row.deliveryNote.request.customer?.name ??
                            "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {row.submittedBy.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {formatDate(row.submittedAt)}
                        </TableCell>
                        <TableCell>
                          {damaged.map((item) => (
                            <p key={item.id} className="text-[11px]">
                              {item.item.name} ·{" "}
                              <span className="text-muted-foreground">
                                {item.item.supplier?.name ?? "Tanpa supplier"}
                              </span>
                            </p>
                          ))}
                        </TableCell>
                        <TableCell className="text-right text-xs font-medium tabular-nums">
                          {damaged.reduce((sum, item) => sum + item.damaged, 0)}
                        </TableCell>
                        <TableCell>
                          <Button asChild variant="outline" size="xs">
                            <a
                              href={`/api/turnovers/${row.id}/pdf`}
                              download={`BA-Rusak-${row.deliveryNote.number}.pdf`}
                            >
                              <Download />
                              PDF
                            </a>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
