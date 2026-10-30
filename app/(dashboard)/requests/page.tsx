"use client";

import { History, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shell/page-header";
import { DateRangePicker } from "@/components/common/date-range-picker";
import { EmptyState } from "@/components/shell/stat-card";
import { TableSkeleton } from "@/components/shell/loading-state";
import { StatusBadge } from "@/components/shell/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useDecideRequest, useRequests } from "@/hooks/inventory/useRequests";
import {
  formatDate,
  formatDateTime,
  inRange,
  uniqueValues,
} from "@/lib/format";
import { authClient } from "@/services/auth/authClients";
import type { InventoryRequest } from "@/types/inventory";

const TABS = [
  { value: "ALL", label: "Semua" },
  { value: "PENDING", label: "Menunggu" },
  { value: "APPROVED", label: "Disetujui" },
  { value: "COMPLETED", label: "Selesai" },
];

export default function RequestsPage() {
  const { data: rows = [], isLoading } = useRequests();
  const decide = useDecideRequest();
  const { data: session } = authClient.useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;

  const [tab, setTab] = useState("ALL");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [customer, setCustomer] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState<InventoryRequest | null>(null);
  const [note, setNote] = useState("");
  const [qty, setQty] = useState<Record<string, number>>({});

  const customers = uniqueValues(rows.map((row) => row.customer?.name));

  const filtered = rows.filter((row) => {
    const matchesTab =
      tab === "ALL" ||
      (tab === "PENDING" &&
        ["PENDING_ADMIN", "PENDING_DIRECTOR"].includes(row.status)) ||
      (tab === "APPROVED" && row.status === "APPROVED") ||
      (tab === "COMPLETED" && row.status === "COMPLETED");
    const matchesStatus = status === "ALL" || row.status === status;
    const matchesCustomer =
      customer === "ALL" || row.customer?.name === customer;
    const query = search.toLowerCase();
    const matchesSearch =
      row.number.toLowerCase().includes(query) ||
      row.poNo.toLowerCase().includes(query) ||
      row.site.toLowerCase().includes(query) ||
      (row.customer?.name ?? "").toLowerCase().includes(query) ||
      (row.customer?.company ?? "").toLowerCase().includes(query) ||
      row.leader.name.toLowerCase().includes(query);
    return (
      matchesTab &&
      matchesStatus &&
      matchesCustomer &&
      matchesSearch &&
      inRange(row.createdAt, dateFrom, dateTo)
    );
  });

  const canDecide =
    selected &&
    ((role === "ADMIN" && selected.status === "PENDING_ADMIN") ||
      (role === "DIREKTUR" && selected.status === "PENDING_DIRECTOR"));
  const canEditItems =
    !!selected &&
    (canDecide || (role === "LEADER" && selected.status === "PENDING_ADMIN"));

  async function submit(action?: "approve" | "reject") {
    if (!selected) return;
    await decide.mutateAsync({
      id: selected.id,
      action,
      note: note || undefined,
      items: canEditItems
        ? selected.items.map((item) => ({
            id: item.id,
            qty: qty[item.id] ?? item.qty,
          }))
        : undefined,
    });
    toast.success(
      action === "approve"
        ? "Request disetujui."
        : action === "reject"
          ? "Request ditolak."
          : "Jumlah item diperbarui.",
    );
    setSelected(null);
    setNote("");
    setQty({});
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Request Barang"
        description="Ajukan consumable untuk pekerjaan inspeksi dan pantau status persetujuannya."
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/requests?tab=ALL">
                <History />
                Riwayat Saya
              </Link>
            </Button>
            {role === "LEADER" ? (
              <Button size="sm" asChild>
                <Link href="/requests/new">
                  <Plus />
                  Buat Request
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      <Tabs value={tab} onValueChange={setTab} className="gap-4">
        <TabsList className="h-auto flex-wrap justify-start gap-5 rounded-none bg-transparent p-0">
          {TABS.map((item) => {
            const count =
              item.value === "ALL"
                ? rows.length
                : item.value === "PENDING"
                  ? rows.filter((row) =>
                      ["PENDING_ADMIN", "PENDING_DIRECTOR"].includes(
                        row.status,
                      ),
                    ).length
                  : rows.filter((row) => row.status === item.value).length;
            return (
              <TabsTrigger
                key={item.value}
                value={item.value}
                className="data-[state=active]:text-foreground text-muted-foreground data-[state=active]:border-foreground rounded-none border-0 border-b-2 border-transparent px-0 pb-2.5 text-[12.5px] data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                {item.label}
                <span className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10.5px]">
                  {count}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <div className="border-border flex min-w-[200px] flex-1 items-center gap-2 rounded-lg border px-3">
          <Search className="text-muted-foreground size-3.5" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nomor request, pekerjaan, site, atau pelanggan…"
            className="h-9 border-0 bg-transparent px-0 text-xs shadow-none focus-visible:ring-0"
          />
        </div>
        <SearchableSelect
          value={status}
          onValueChange={setStatus}
          searchPlaceholder="Cari status…"
          options={[
            { value: "ALL", label: "Semua status" },
            { value: "PENDING_ADMIN", label: "Menunggu Admin" },
            { value: "PENDING_DIRECTOR", label: "Menunggu Direktur" },
            { value: "APPROVED", label: "Disetujui" },
            { value: "REJECTED", label: "Ditolak" },
            { value: "COMPLETED", label: "Selesai" },
          ]}
          className="h-9 w-full text-xs sm:w-[180px]"
        />
        <SearchableSelect
          value={customer}
          onValueChange={setCustomer}
          searchPlaceholder="Cari pelanggan…"
          options={[
            { value: "ALL", label: "Semua pelanggan" },
            ...customers.map((value) => ({ value, label: value })),
          ]}
          className="h-9 w-full text-xs sm:w-[170px]"
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

      <div className="bg-card border-border overflow-hidden rounded-xl border">
        {isLoading ? (
          <TableSkeleton rows={5} columns={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Belum ada request"
            description={
              role === "LEADER"
                ? "Buat request pertama untuk pekerjaan inspeksi."
                : "Request dari Leader akan muncul di sini."
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60">
                <TableHead className="w-40">Nomor Request</TableHead>
                <TableHead>PO, Site &amp; Pelanggan</TableHead>
                <TableHead className="w-44">Item</TableHead>
                <TableHead className="w-20">Jumlah</TableHead>
                <TableHead className="w-28">Dibutuhkan</TableHead>
                <TableHead className="w-40">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => {
                    setSelected(row);
                    setNote("");
                    setQty({});
                  }}
                >
                  <TableCell>
                    <p className="text-xs font-medium">{row.number}</p>
                    <p className="text-muted-foreground text-[10.5px]">
                      {formatDate(row.createdAt)}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="text-xs font-medium">{row.poNo}</p>
                    <p className="text-muted-foreground text-[10.5px]">
                      {row.site} · {row.customer?.company ?? row.customer?.name ?? "Tanpa pelanggan"} · {row.leader.name}
                    </p>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {row.items.map((item) => item.item.name).join(", ")}
                  </TableCell>
                  <TableCell className="text-xs font-medium">
                    {row.items.reduce((sum, item) => sum + item.qty, 0)} unit
                  </TableCell>
                  <TableCell className="text-xs font-medium">
                    {formatDate(row.neededAt)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={row.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="bg-muted text-muted-foreground rounded-xl px-4 py-3 text-[11.5px]">
        Alur: request masuk ke Admin untuk cek stok, lalu ke Direktur untuk
        persetujuan. Surat jalan diterbitkan setelah kedua approval selesai.
      </div>

      <Dialog
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between gap-3">
                  <span>{selected.number}</span>
                  <StatusBadge status={selected.status} />
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-muted-foreground text-[10.5px]">Leader</p>
                  <p className="font-medium">{selected.leader.name}</p>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-muted-foreground text-[10.5px]">
                    Nomor PO
                  </p>
                  <p className="font-medium">{selected.poNo}</p>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-muted-foreground text-[10.5px]">Site</p>
                  <p className="font-medium">{selected.site}</p>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-muted-foreground text-[10.5px]">
                    Dibutuhkan
                  </p>
                  <p className="font-medium">{formatDate(selected.neededAt)}</p>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="w-36">Jumlah</TableHead>
                      <TableHead className="w-24">Stok</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selected.items.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <p className="text-xs font-medium">{row.item.name}</p>
                          <p className="text-muted-foreground text-[10.5px]">
                            {row.item.code} · {row.item.brand ?? "—"}
                          </p>
                        </TableCell>
                        <TableCell className="text-xs">
                          {canEditItems ? (
                            <div className="flex items-center gap-1.5">
                              <Input
                                type="number"
                                min={1}
                                max={row.item.stockGudang}
                                value={qty[row.id] ?? row.qty}
                                onFocus={(event) => event.target.select()}
                                onChange={(event) =>
                                  setQty((prev) => ({
                                    ...prev,
                                    [row.id]: Math.max(
                                      1,
                                      Number(event.target.value) || 1,
                                    ),
                                  }))
                                }
                                className="input-number h-8 w-20 px-2 text-xs"
                              />
                              <span className="text-muted-foreground text-[10.5px]">
                                {row.item.unit}
                              </span>
                            </div>
                          ) : (
                            <>
                              {row.qty} {row.item.unit}
                            </>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {row.item.stockGudang}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {selected.note ? (
                <p className="text-muted-foreground text-[11.5px]">
                  Catatan Leader: {selected.note}
                </p>
              ) : null}

              <div className="text-muted-foreground text-[10.5px]">
                Dibuat {formatDateTime(selected.createdAt)}
                {selected.admin ? ` · Admin: ${selected.admin.name}` : ""}
                {selected.director
                  ? ` · Direktur: ${selected.director.name}`
                  : ""}
              </div>

              {canDecide ? (
                <div className="flex flex-col gap-2">
                  <Label className="text-[11.5px]">
                    Catatan persetujuan (opsional)
                  </Label>
                  <Textarea
                    rows={2}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Contoh: disetujui, pastikan sisa box dikembalikan saat turnover."
                  />
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => submit("reject")}
                      disabled={decide.isPending}
                    >
                      Tolak
                    </Button>
                    <Button
                      onClick={() => submit("approve")}
                      disabled={decide.isPending}
                    >
                      {role === "DIREKTUR"
                        ? "Setujui Permintaan"
                        : "Verifikasi & Lanjutkan"}
                    </Button>
                  </DialogFooter>
                </div>
              ) : canEditItems ? (
                <DialogFooter>
                  <Button onClick={() => submit()} disabled={decide.isPending}>
                    Simpan Jumlah
                  </Button>
                </DialogFooter>
              ) : null}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
