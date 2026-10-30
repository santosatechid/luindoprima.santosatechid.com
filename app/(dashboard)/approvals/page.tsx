"use client";

import {
  Check,
  CheckCheck,
  ClipboardClock,
  History,
  Search,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shell/page-header";
import { EmptyState, StatCard } from "@/components/shell/stat-card";
import { StatusBadge } from "@/components/shell/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useDashboard } from "@/hooks/inventory/useDashboard";
import { useDecideRequest, useRequests } from "@/hooks/inventory/useRequests";
import { formatDateTime } from "@/lib/format";

export default function ApprovalsPage() {
  const { data: rows = [] } = useRequests();
  const { data: dashboard } = useDashboard();
  const decide = useDecideRequest();

  const queue = rows.filter((row) => row.status === "PENDING_DIRECTOR");
  const [selectedId, setSelectedId] = useState("");
  const [note, setNote] = useState("");
  const [qty, setQty] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const filteredQueue = queue.filter(
    (row) =>
      !query ||
      row.number.toLowerCase().includes(query) ||
      row.poNo.toLowerCase().includes(query) ||
      row.site.toLowerCase().includes(query) ||
      (row.customer?.name ?? "").toLowerCase().includes(query) ||
      (row.customer?.company ?? "").toLowerCase().includes(query) ||
      row.leader.name.toLowerCase().includes(query),
  );
  const selected =
    filteredQueue.find((row) => row.id === selectedId) ?? filteredQueue[0];

  async function decideSelected(action: "approve" | "reject") {
    if (!selected) return;
    await decide.mutateAsync({
      id: selected.id,
      action,
      note: note || undefined,
      items: selected.items.map((row) => ({
        id: row.id,
        qty: qty[row.id] ?? row.qty,
      })),
    });
    toast.success(
      action === "approve"
        ? "Request disetujui. Admin dapat menerbitkan surat jalan."
        : "Request ditolak.",
    );
    setSelectedId("");
    setNote("");
    setQty({});
  }

  const approved = rows.filter((row) => row.status === "APPROVED").length;
  const rejected = rows.filter((row) => row.status === "REJECTED").length;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Persetujuan Request"
        description="Tinjau permintaan yang sudah diverifikasi Admin, lalu berikan keputusan akhir."
        actions={
          <Button variant="outline" size="sm">
            <History />
            Riwayat Persetujuan
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Menunggu Saya"
          value={`${queue.length} request`}
          icon={ClipboardClock}
        >
          <span className="bg-warning-surface text-warning w-fit rounded-full px-2.5 py-0.5 text-[11px]">
            Perlu keputusan
          </span>
        </StatCard>
        <StatCard
          label="Disetujui"
          value={`${approved} request`}
          icon={CheckCheck}
        >
          <span className="bg-success-surface text-success w-fit rounded-full px-2.5 py-0.5 text-[11px]">
            Siap surat jalan
          </span>
        </StatCard>
        <StatCard label="Ditolak" value={`${rejected} request`} icon={X}>
          <span className="bg-destructive-surface text-destructive-strong w-fit rounded-full px-2.5 py-0.5 text-[11px]">
            Sudah diputuskan
          </span>
        </StatCard>
        <StatCard
          label="Nilai Barang Keluar"
          value={`${dashboard?.outgoingThisMonth ?? 0} unit`}
          icon={ClipboardClock}
        >
          <span className="bg-info-surface text-info w-fit rounded-full px-2.5 py-0.5 text-[11px]">
            Bulan ini
          </span>
        </StatCard>
      </div>

      {selected ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex flex-col gap-4">
            <div className="bg-card border-border flex flex-col gap-4 rounded-xl border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold tracking-[-0.3px]">
                    {selected.number}
                  </p>
                  <p className="text-muted-foreground text-[11.5px]">
                    Diajukan {selected.leader.name} ·{" "}
                    {formatDateTime(selected.createdAt)}
                  </p>
                </div>
                <StatusBadge status={selected.status} />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["Leader", selected.leader.name],
                  ["Nomor PO", selected.poNo],
                  ["Pelanggan", selected.customer?.company ?? selected.customer?.name ?? "—"],
                  ["Site", selected.site],
                ].map(([label, value]) => (
                  <div key={label} className="bg-muted rounded-lg p-2.5">
                    <p className="text-muted-foreground text-[10.5px]">
                      {label}
                    </p>
                    <p className="mt-0.5 text-[12px] font-medium">{value}</p>
                  </div>
                ))}
              </div>

              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="w-36">Diminta</TableHead>
                      <TableHead className="w-28">Stok gudang</TableHead>
                      <TableHead className="w-32">
                        Sisa setelah keluar
                      </TableHead>
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
                        <TableCell className="text-xs font-medium">
                          <div className="flex items-center gap-1.5">
                            <Input
                              type="number"
                              min={1}
                              max={
                                row.item.stockGudang -
                                row.item.onRequest +
                                row.qty
                              }
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
                        </TableCell>
                        <TableCell className="text-xs">
                          {row.item.stockGudang} {row.item.unit}
                        </TableCell>
                        <TableCell className="text-xs">
                          {row.item.stockGudang -
                            row.item.onRequest +
                            row.qty -
                            (qty[row.id] ?? row.qty)}{" "}
                          {row.item.unit}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col gap-1.5">
                <p className="text-[11.5px] font-medium">
                  Catatan persetujuan (opsional)
                </p>
                <Textarea
                  rows={2}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Contoh: disetujui, pastikan sisa box dikembalikan saat turnover."
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => decideSelected("reject")}
                  disabled={decide.isPending}
                >
                  <X />
                  Tolak Permintaan
                </Button>
                <Button
                  onClick={() => decideSelected("approve")}
                  disabled={decide.isPending}
                >
                  <Check />
                  Setujui Permintaan
                </Button>
              </div>
            </div>

            <div className="bg-card border-border flex flex-col gap-3 rounded-xl border p-4">
              <p className="text-[13.5px] font-semibold">Riwayat Persetujuan</p>
              <div className="flex gap-3">
                <div className="bg-success-solid mt-1.5 size-2 shrink-0 rounded-full" />
                <div className="flex-1">
                  <p className="text-[11.5px] font-medium">
                    Admin · {selected.admin?.name ?? "—"}
                  </p>
                  <p className="text-muted-foreground text-[11px]">
                    {selected.adminNote || "Stok tersedia, diverifikasi."}
                  </p>
                </div>
                <span className="text-muted-foreground text-[10.5px]">
                  {formatDateTime(selected.createdAt)}
                </span>
              </div>
              <div className="flex gap-3">
                <div className="bg-warning-solid mt-1.5 size-2 shrink-0 rounded-full" />
                <div className="flex-1">
                  <p className="text-[11.5px] font-medium">Direktur · Anda</p>
                  <p className="text-muted-foreground text-[11px]">
                    Menunggu keputusan
                  </p>
                </div>
                <span className="text-muted-foreground text-[10.5px]">—</span>
              </div>
            </div>
          </div>

          <div className="flex h-fit flex-col gap-4">
            <div className="bg-card border-border flex flex-col gap-2 rounded-xl border p-4">
              <p className="text-[13.5px] font-semibold">Antrean Persetujuan</p>
              <p className="text-muted-foreground text-[11.5px]">
                {filteredQueue.length} request menunggu Anda
              </p>
              <div className="border-border flex items-center gap-2 rounded-lg border px-3">
                <Search className="text-muted-foreground size-3.5" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari nomor, pekerjaan, site, pelanggan…"
                  className="h-9 border-0 bg-transparent px-0 text-xs shadow-none focus-visible:ring-0"
                />
              </div>
              {filteredQueue.map((row) => (
                <button
                  key={row.id}
                  onClick={() => {
                    setSelectedId(row.id);
                    setNote("");
                    setQty({});
                  }}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left ${
                    row.id === selected.id ? "bg-muted" : "border-border border"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11.5px] font-medium">
                      {row.number}
                    </p>
                    <p className="text-muted-foreground truncate text-[10.5px]">
                      {row.site} · {row.items.length} item
                    </p>
                  </div>
                  <StatusBadge status={row.status} />
                </button>
              ))}
            </div>

            <div className="bg-muted flex flex-col gap-1.5 rounded-xl p-4">
              <p className="text-[11.5px] font-semibold">
                Kebijakan persetujuan
              </p>
              <p className="text-muted-foreground text-[10.5px] leading-4">
                Request harus melewati Admin lalu Direktur. Surat jalan baru
                dapat diterbitkan setelah disetujui Direktur.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          title="Tidak ada request menunggu"
          description="Semua request sudah diputuskan."
        />
      )}
    </div>
  );
}
