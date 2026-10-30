"use client";

import { CheckCheck, Download, RotateCcw, Search, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shell/page-header";
import { DateRangePicker } from "@/components/common/date-range-picker";
import { TableSkeleton } from "@/components/shell/loading-state";
import { EmptyState, StatCard } from "@/components/shell/stat-card";
import { StatusBadge } from "@/components/shell/status-badge";
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
import { useDeliveryNotes } from "@/hooks/inventory/useDeliveryNotes";
import {
  useCreateTurnover,
  useTurnovers,
  useVerifyTurnover,
} from "@/hooks/inventory/useTurnovers";
import { formatDate, inRange } from "@/lib/format";
import { authClient } from "@/services/auth/authClients";

export default function TurnoverPage() {
  const { data: notes = [] } = useDeliveryNotes();
  const { data: turnovers = [], isLoading } = useTurnovers();
  const createTurnover = useCreateTurnover();
  const verifyTurnover = useVerifyTurnover();
  const { data: session } = authClient.useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const isAdmin = role === "ADMIN";

  const [noteId, setNoteId] = useState("");
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [values, setValues] = useState<
    Record<string, { used: string; returned: string; damaged: string }>
  >({});

  const available = notes.filter(
    (row) => row.status === "CONFIRMED" && !row.turnover,
  );
  const selected = available.find((row) => row.id === noteId);
  const pending = turnovers.filter((row) => row.status === "SUBMITTED");

  const query = search.trim().toLowerCase();
  const filtered = turnovers.filter((row) => {
    const matchesSearch =
      !query ||
      row.deliveryNote.number.toLowerCase().includes(query) ||
      row.deliveryNote.request.site.toLowerCase().includes(query) ||
      row.deliveryNote.request.leader.name.toLowerCase().includes(query) ||
      (row.deliveryNote.request.customer?.name ?? "")
        .toLowerCase()
        .includes(query) ||
      (row.deliveryNote.request.customer?.company ?? "")
        .toLowerCase()
        .includes(query) ||
      row.submittedBy.name.toLowerCase().includes(query);
    return (
      matchesSearch &&
      (statusFilter === "ALL" || row.status === statusFilter) &&
      inRange(row.submittedAt, dateFrom, dateTo)
    );
  });

  function valueFor(itemId: string) {
    return values[itemId] ?? { used: "0", returned: "0", damaged: "0" };
  }

  async function submit() {
    if (!selected) {
      toast.error("Pilih surat jalan yang sudah dikonfirmasi.");
      return;
    }

    const rows = selected.items.map((row) => {
      const value = valueFor(row.itemId);
      return {
        itemId: row.itemId,
        brought: row.qty,
        used: Number(value.used || 0),
        returned: Number(value.returned || 0),
        damaged: Number(value.damaged || 0),
      };
    });

    if (
      rows.some(
        (row) => row.used + row.returned + row.damaged !== row.brought,
      )
    ) {
      toast.error(
        "Terpakai + kembali + rusak harus sama dengan jumlah dibawa.",
      );
      return;
    }

    await createTurnover.mutateAsync({
      deliveryNoteId: selected.id,
      note: note || undefined,
      items: rows,
    });
    toast.success("Laporan turnover dikirim ke Admin.");
    setNoteId("");
    setNote("");
    setValues({});
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Turnover Barang"
        description="Laporkan barang terpakai, sisa yang dikembalikan, serta barang rusak atau hilang setelah inspeksi."
        actions={
          !isAdmin ? (
            <Button onClick={submit} disabled={createTurnover.isPending}>
              <Send />
              {createTurnover.isPending ? "Mengirim…" : "Kirim Laporan"}
            </Button>
          ) : null
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Menunggu Turnover"
          value={`${available.length} surat jalan`}
          icon={RotateCcw}
        />
        <StatCard
          label="Menunggu Verifikasi"
          value={`${pending.length} laporan`}
          icon={Send}
        />
        <StatCard
          label="Terverifikasi"
          value={`${turnovers.filter((row) => row.status === "VERIFIED").length} laporan`}
          icon={CheckCheck}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-4">
          {!isAdmin ? (
            <div className="bg-card border-border flex flex-col gap-3 rounded-xl border p-4">
              <div>
                <p className="text-[13.5px] font-semibold">Rincian Pemakaian</p>
                <p className="text-muted-foreground text-[11.5px]">
                  Pilih surat jalan, lalu isi jumlah terpakai, kembali, dan
                  rusak/hilang.
                </p>
              </div>

              <div className="grid gap-1.5">
                <Label className="text-[11.5px]">Surat jalan</Label>
                <SearchableSelect
                  value={noteId}
                  onValueChange={(value) => {
                    setNoteId(value);
                    setValues({});
                  }}
                  placeholder="Pilih surat jalan terkonfirmasi"
                  searchPlaceholder="Cari surat jalan, site, atau leader…"
                  options={available.map((row) => ({
                    value: row.id,
                    label: row.number,
                    hint: `${row.request.site} · ${row.request.leader.name}`,
                  }))}
                  className="w-full"
                />
                {available.length === 0 ? (
                  <p className="text-muted-foreground text-[10.5px]">
                    Belum ada surat jalan yang siap di-turnover.
                  </p>
                ) : null}
              </div>

              {selected ? (
                <>
                  <div className="overflow-hidden rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead className="w-24">Dibawa</TableHead>
                          <TableHead className="w-32">Terpakai</TableHead>
                          <TableHead className="w-32">Kembali</TableHead>
                          <TableHead className="w-32">Rusak</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selected.items.map((row) => {
                          const value = valueFor(row.itemId);
                          return (
                            <TableRow key={row.id}>
                              <TableCell>
                                <p className="text-xs font-medium">
                                  {row.item.name}
                                </p>
                                <p className="text-muted-foreground text-[10.5px]">
                                  {row.qty} {row.item.unit}
                                </p>
                              </TableCell>
                              <TableCell className="text-xs font-medium">
                                {row.qty}
                              </TableCell>
                              {(["used", "returned", "damaged"] as const).map(
                                (field) => (
                                  <TableCell key={field}>
                                    <Input
                                      type="number"
                                      min={0}
                                      max={row.qty}
                                      inputMode="numeric"
                                      className="input-number h-8 w-full min-w-[88px] px-2"
                                      value={value[field]}
                                      onChange={(event) =>
                                        setValues((current) => ({
                                          ...current,
                                          [row.itemId]: {
                                            ...value,
                                            [field]: event.target.value,
                                          },
                                        }))
                                      }
                                    />
                                  </TableCell>
                                ),
                              )}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="grid gap-1.5">
                    <Label className="text-[11.5px]">Catatan Leader</Label>
                    <Textarea
                      rows={2}
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder="Contoh: 1 box rusak karena terkena air saat pengujian."
                    />
                  </div>

                  <p className="bg-muted text-muted-foreground rounded-lg px-3 py-2 text-[10.5px]">
                    Aturan: terpakai + kembali + rusak/hilang harus sama dengan
                    jumlah dibawa. Sisa barang wajib dikembalikan ke gudang.
                  </p>
                </>
              ) : null}
            </div>
          ) : (
            <div className="bg-card border-border flex flex-col gap-3 rounded-xl border p-4">
              <div>
                <p className="text-[13.5px] font-semibold">
                  Verifikasi Turnover
                </p>
                <p className="text-muted-foreground text-[11.5px]">
                  Periksa laporan Leader sebelum menyesuaikan stok.
                </p>
              </div>

              {pending.length === 0 ? (
                <EmptyState
                  title="Tidak ada laporan menunggu"
                  description="Turnover dari Leader akan tampil di sini."
                />
              ) : (
                <div className="flex flex-col gap-2">
                  {pending.map((row) => (
                    <div
                      key={row.id}
                      className="border-border flex flex-col gap-2 rounded-lg border p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-medium">
                            {row.deliveryNote.number}
                          </p>
                          <p className="text-muted-foreground text-[10.5px]">
                            {row.deliveryNote.request.site} ·{" "}
                            {row.submittedBy.name} ·{" "}
                            {formatDate(row.submittedAt)}
                          </p>
                        </div>
                        <StatusBadge status={row.status} />
                      </div>
                      <div className="overflow-x-auto rounded-lg border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Item</TableHead>
                              <TableHead className="text-right">
                                Dibawa
                              </TableHead>
                              <TableHead className="text-right">
                                Dipakai
                              </TableHead>
                              <TableHead className="text-right">
                                Kembali
                              </TableHead>
                              <TableHead className="text-right">Rusak</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {row.items.map((item) => {
                              return (
                                <TableRow key={item.id}>
                                  <TableCell>
                                    <p className="text-xs font-medium">
                                      {item.item.name}
                                    </p>
                                    <p className="text-muted-foreground text-[10.5px]">
                                      {item.item.unit}
                                    </p>
                                  </TableCell>
                                  <TableCell className="text-right text-xs tabular-nums">
                                    {item.brought}
                                  </TableCell>
                                  <TableCell className="text-right text-xs font-medium tabular-nums">
                                    {item.used}
                                  </TableCell>
                                  <TableCell className="text-right text-xs tabular-nums">
                                    {item.returned}
                                  </TableCell>
                                  <TableCell
                                    className={`text-right text-xs tabular-nums ${
                                      item.damaged > 0
                                        ? "text-destructive font-medium"
                                        : ""
                                    }`}
                                  >
                                    {item.damaged}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                      {row.items.some(
                        (item) =>
                          item.brought !==
                          item.used + item.returned + item.damaged,
                      ) ? (
                        <p className="text-destructive text-[10.5px]">
                          Jumlah dipakai + kembali + rusak tidak sama dengan
                          yang dibawa.
                        </p>
                      ) : null}
                      <Button
                        size="sm"
                        className="w-fit"
                        onClick={async () => {
                          await verifyTurnover.mutateAsync(row.id);
                          toast.success(
                            "Turnover diverifikasi. Stok telah disesuaikan.",
                          );
                        }}
                        disabled={verifyTurnover.isPending}
                      >
                        <CheckCheck />
                        Verifikasi &amp; Perbarui Stok
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="bg-card border-border flex flex-col gap-3 rounded-xl border p-4">
            <p className="text-[13.5px] font-semibold">Riwayat Turnover</p>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <div className="border-border flex min-w-[200px] flex-1 items-center gap-2 rounded-lg border px-3">
                <Search className="text-muted-foreground size-3.5" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari surat jalan, site, leader, pelanggan, atau pengirim…"
                  className="h-9 border-0 bg-transparent px-0 text-xs shadow-none focus-visible:ring-0"
                />
              </div>
              <SearchableSelect
                value={statusFilter}
                onValueChange={setStatusFilter}
                searchPlaceholder="Cari status…"
                options={[
                  { value: "ALL", label: "Semua status" },
                  { value: "DRAFT", label: "Draft" },
                  { value: "SUBMITTED", label: "Menunggu Verifikasi" },
                  { value: "VERIFIED", label: "Terverifikasi" },
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

            {isLoading ? (
              <TableSkeleton rows={5} columns={5} />
            ) : filtered.length === 0 ? (
              <EmptyState title="Belum ada turnover" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Surat Jalan</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Leader</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-28">Rusak</TableHead>
                    <TableHead className="w-32" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => {
                    const damaged = row.items.reduce(
                      (sum, item) => sum + item.damaged,
                      0,
                    );
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="text-xs font-medium">
                          {row.deliveryNote.number}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {row.deliveryNote.request.site}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {row.submittedBy.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {formatDate(row.submittedAt)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={row.status} />
                        </TableCell>
                        <TableCell className="text-xs tabular-nums">
                          {damaged > 0 ? `${damaged} unit` : "—"}
                        </TableCell>
                        <TableCell>
                          {damaged > 0 ? (
                            <Button asChild variant="outline" size="xs">
                              <a
                                href={`/api/turnovers/${row.id}/pdf`}
                                download={`BA-Rusak-${row.deliveryNote.number}.pdf`}
                              >
                                <Download />
                                PDF
                              </a>
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        <div className="flex h-fit flex-col gap-4">
          <div className="bg-card border-border flex flex-col gap-2 rounded-xl border p-4">
            <p className="text-[13.5px] font-semibold">Dampak ke Stok</p>
            <p className="text-muted-foreground text-[11.5px]">
              Dihitung otomatis saat Admin memverifikasi.
            </p>
            <div className="text-muted-foreground flex justify-between border-b py-1.5 text-[11px]">
              <span>Terpakai</span>
              <span className="text-foreground font-medium">
                keluar dari operasional
              </span>
            </div>
            <div className="text-muted-foreground flex justify-between border-b py-1.5 text-[11px]">
              <span>Kembali</span>
              <span className="text-foreground font-medium">
                masuk ke gudang
              </span>
            </div>
            <div className="text-muted-foreground flex justify-between py-1.5 text-[11px]">
              <span>Rusak / hilang</span>
              <span className="text-foreground font-medium">
                dicatat sebagai kerugian
              </span>
            </div>
          </div>

          <div className="bg-muted flex flex-col gap-2 rounded-xl p-4">
            <p className="text-[11.5px] font-semibold">Aturan Pengisian</p>
            {[
              "Terpakai + kembali + rusak/hilang = jumlah dibawa.",
              "Sisa barang wajib dikembalikan ke gudang.",
              "Barang rusak atau hilang dicatat terpisah.",
            ].map((text) => (
              <p
                key={text}
                className="text-muted-foreground text-[10.5px] leading-4"
              >
                • {text}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
