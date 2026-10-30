"use client";

import { Activity, CalendarDays, Download, Search } from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/shell/page-header";
import { DateRangePicker } from "@/components/common/date-range-picker";
import { EmptyState, StatCard } from "@/components/shell/stat-card";
import { StatusBadge } from "@/components/shell/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useDeliveryNotes } from "@/hooks/inventory/useDeliveryNotes";
import { useRequests } from "@/hooks/inventory/useRequests";
import { useTurnovers } from "@/hooks/inventory/useTurnovers";
import { downloadCsv } from "@/lib/csv";
import { formatDate, inRange, uniqueValues } from "@/lib/format";

export default function InspectionsPage() {
  const { data: requests = [] } = useRequests();
  const { data: notes = [] } = useDeliveryNotes();
  const { data: turnovers = [] } = useTurnovers();
  const [search, setSearch] = useState("");
  const [site, setSite] = useState("ALL");
  const [customer, setCustomer] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedId, setSelectedId] = useState("");

  const rows = requests
    .filter((request) => request.delivery || request.status === "APPROVED")
    .map((request) => {
      const note = notes.find((row) => row.request.id === request.id);
      const turnover = turnovers.find(
        (row) => row.deliveryNote.id === note?.id,
      );
      const progress =
        request.status === "COMPLETED" || turnover?.status === "VERIFIED"
          ? 100
          : turnover?.status === "SUBMITTED"
            ? 85
            : note?.status === "CONFIRMED"
              ? 70
              : note?.status === "ISSUED"
                ? 50
                : 25;
      const overdue =
        progress < 100 && new Date(request.neededAt) < new Date();
      return { request, note, turnover, progress, overdue };
    });

  const sites = Array.from(new Set(rows.map((row) => row.request.site)));
  const customers = uniqueValues(
    rows.map((row) => row.request.customer?.name),
  );
  const selected = rows.find((row) => row.request.id === selectedId);
  const filtered = rows.filter((row) => {
    const query = search.toLowerCase();
    return (
      (site === "ALL" || row.request.site === site) &&
      (customer === "ALL" || row.request.customer?.name === customer) &&
      (row.request.poNo.toLowerCase().includes(query) ||
        row.request.site.toLowerCase().includes(query) ||
        (row.request.customer?.name ?? "").toLowerCase().includes(query) ||
        (row.request.customer?.company ?? "").toLowerCase().includes(query) ||
        row.request.leader.name.toLowerCase().includes(query)) &&
      inRange(row.request.createdAt, dateFrom, dateTo)
    );
  });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Progres Inspeksi"
        description="Pantau pekerjaan inspeksi yang berjalan: Leader, site, barang dibawa, dan status penyelesaiannya."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              downloadCsv("progres-inspeksi.csv", [
                [
                  "Pekerjaan",
                  "Site",
                  "Leader",
                  "Status",
                  "Progres",
                  "Dibutuhkan",
                ],
                ...filtered.map((row) => [
                  row.request.poNo,
                  row.request.site,
                  row.request.leader.name,
                  row.request.status,
                  `${row.progress}%`,
                  formatDate(row.request.neededAt),
                ]),
              ])
            }
          >
            <Download />
            Ekspor
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Sedang Berjalan"
          value={`${rows.filter((row) => row.progress < 100).length} pekerjaan`}
          icon={Activity}
        />
        <StatCard
          label="Selesai"
          value={`${rows.filter((row) => row.progress === 100).length} pekerjaan`}
          icon={CalendarDays}
        />
        <StatCard
          label="Menunggu Turnover"
          value={`${rows.filter((row) => row.progress === 70).length} pekerjaan`}
          icon={Activity}
        />
        <StatCard
          label="Melewati Target"
          value={`${rows.filter((row) => row.overdue).length} pekerjaan`}
          icon={CalendarDays}
        />
      </div>

      <div className="bg-card border-border flex flex-col gap-3 rounded-xl border p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <div className="border-border flex min-w-[200px] flex-1 items-center gap-2 rounded-lg border px-3">
            <Search className="text-muted-foreground size-3.5" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nomor pekerjaan, Leader, site, atau pelanggan…"
              className="h-9 border-0 bg-transparent px-0 text-xs shadow-none focus-visible:ring-0"
            />
          </div>
          <SearchableSelect
            value={site}
            onValueChange={setSite}
            searchPlaceholder="Cari site…"
            options={[
              { value: "ALL", label: "Semua site" },
              ...sites.map((value) => ({ value, label: value })),
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

        {filtered.length === 0 ? (
          <EmptyState
            title="Belum ada pekerjaan"
            description="Pekerjaan muncul setelah request disetujui."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60">
                <TableHead>Pekerjaan / Site</TableHead>
                <TableHead>Pelanggan</TableHead>
                <TableHead>Leader</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead>Barang dibawa</TableHead>
                <TableHead>Progres</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <TableRow
                  key={row.request.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedId(row.request.id)}
                >
                  <TableCell>
                    <p className="text-xs font-medium">{row.request.poNo}</p>
                    <p className="text-muted-foreground text-[10.5px]">
                      {row.request.site}
                    </p>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {row.request.customer?.company ??
                      row.request.customer?.name ??
                      "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {row.request.leader.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {formatDate(row.request.createdAt)} –{" "}
                    {formatDate(row.request.estimatedDoneAt ?? row.request.neededAt)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {row.note
                      ? row.note.items
                          .map(
                            (item) =>
                              `${item.qty} ${item.item.unit} ${item.item.name}`,
                          )
                          .join(", ")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="bg-muted h-1.5 w-20 overflow-hidden rounded-full">
                        <div
                          className={`h-full rounded-full ${
                            row.progress === 100
                              ? "bg-success-solid"
                              : row.overdue
                                ? "bg-destructive-solid"
                                : "bg-foreground"
                          }`}
                          style={{ width: `${row.progress}%` }}
                        />
                      </div>
                      <span className="text-[10.5px] font-medium">
                        {row.progress}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={
                        row.progress === 100
                          ? "COMPLETED"
                          : row.overdue
                            ? "REJECTED"
                            : row.progress === 70
                              ? "SUBMITTED"
                              : "CONFIRMED"
                      }
                      label={
                        row.progress === 100
                          ? "Selesai"
                          : row.overdue
                            ? "Terlambat"
                            : row.progress === 70
                              ? "Menunggu turnover"
                              : row.progress === 50
                                ? "Diterbitkan"
                                : "Di site"
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelectedId("")}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between gap-2">
                  <span>{selected.request.poNo}</span>
                  <StatusBadge status={selected.request.status} />
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-muted-foreground text-[10.5px]">Site</p>
                  <p className="font-medium">{selected.request.site}</p>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-muted-foreground text-[10.5px]">Leader</p>
                  <p className="font-medium">{selected.request.leader.name}</p>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-muted-foreground text-[10.5px]">
                    Surat jalan
                  </p>
                  <p className="font-medium">
                    {selected.note?.number ?? "Belum diterbitkan"}
                  </p>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-muted-foreground text-[10.5px]">
                    Progres
                  </p>
                  <p className="font-medium">{selected.progress}%</p>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="w-24">Dibawa</TableHead>
                      <TableHead className="w-24">Terpakai</TableHead>
                      <TableHead className="w-24">Kembali</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(selected.note?.items ?? []).map((item) => {
                      const turnoverItem = selected.turnover?.items.find(
                        (row) => row.itemId === item.itemId,
                      );
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="text-xs font-medium">
                            {item.item.name}
                          </TableCell>
                          <TableCell className="text-xs">{item.qty}</TableCell>
                          <TableCell className="text-xs">
                            {turnoverItem?.used ?? "—"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {turnoverItem?.returned ?? "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {!selected.note ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-muted-foreground py-4 text-center text-xs"
                        >
                          Surat jalan belum diterbitkan.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
