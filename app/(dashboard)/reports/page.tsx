"use client";

import {
  Download,
  FileSpreadsheet,
  Inbox,
  RotateCcw,
  Search,
  Truck,
} from "lucide-react";
import { useState } from "react";

import { DateRangePicker } from "@/components/common/date-range-picker";
import { PageHeader } from "@/components/shell/page-header";
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
import { useDeliveryNotes } from "@/hooks/inventory/useDeliveryNotes";
import { useIncoming } from "@/hooks/inventory/useIncoming";
import { useTurnovers } from "@/hooks/inventory/useTurnovers";
import { downloadCsv } from "@/lib/csv";
import { formatDate, inRange, todayInput, uniqueValues } from "@/lib/format";

export default function ReportsPage() {
  const { data: incoming = [] } = useIncoming();
  const { data: notes = [] } = useDeliveryNotes();
  const { data: turnovers = [] } = useTurnovers();
  const [dateFrom, setDateFrom] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [dateTo, setDateTo] = useState(todayInput());
  const [customerFilter, setCustomerFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const incomingRows = incoming.filter((row) =>
    inRange(row.receivedAt, dateFrom, dateTo),
  );
  const customers = uniqueValues(
    notes.map((row) => row.request.customer?.name),
  );
  const outgoingQuery = search.trim().toLowerCase();
  const outgoingRows = notes.filter((row) => {
    const matchesSearch =
      !outgoingQuery ||
      row.number.toLowerCase().includes(outgoingQuery) ||
      row.request.poNo.toLowerCase().includes(outgoingQuery) ||
      row.request.site.toLowerCase().includes(outgoingQuery) ||
      (row.request.customer?.name ?? "").toLowerCase().includes(outgoingQuery) ||
      (row.request.customer?.company ?? "")
        .toLowerCase()
        .includes(outgoingQuery) ||
      row.request.leader.name.toLowerCase().includes(outgoingQuery) ||
      row.items.some((item) =>
        item.item.name.toLowerCase().includes(outgoingQuery),
      );
    return (
      inRange(row.confirmedAt ?? row.issuedAt, dateFrom, dateTo) &&
      matchesSearch &&
      (customerFilter === "ALL" ||
        row.request.customer?.name === customerFilter) &&
      (statusFilter === "ALL" || row.status === statusFilter)
    );
  });
  const turnoverRows = turnovers.filter((row) =>
    inRange(row.submittedAt, dateFrom, dateTo),
  );

  const incomingQty = incomingRows.reduce(
    (sum, row) => sum + row.items.reduce((s, item) => s + item.qty, 0),
    0,
  );
  const outgoingQty = outgoingRows.reduce(
    (sum, row) => sum + row.items.reduce((s, item) => s + item.qty, 0),
    0,
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Laporan"
        description="Unduh laporan sesuai rentang tanggal, mengikuti template Excel PT Luindo Prima."
        actions={
          <Button
            size="sm"
            onClick={() =>
              downloadCsv(`laporan-barang-keluar-${dateFrom}-${dateTo}.csv`, [
                [
                  "Tanggal",
                  "No. Surat Jalan",
                  "No. PO",
                  "Site",
                  "Leader",
                  "Item",
                  "Jumlah",
                  "Status",
                ],
                ...outgoingRows.flatMap((row) =>
                  row.items.map((item) => [
                    formatDate(row.confirmedAt ?? row.issuedAt),
                    row.number,
                    row.request.poNo,
                    row.request.site,
                    row.request.leader.name,
                    item.item.name,
                    item.qty,
                    row.status,
                  ]),
                ),
              ])
            }
          >
            <Download />
            Ekspor Excel
          </Button>
        }
      />

      <div className="bg-card border-border flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1.5">
          <span className="text-muted-foreground text-[11px] font-medium">
            Rentang tanggal
          </span>
          <DateRangePicker
            from={dateFrom}
            to={dateTo}
            onChange={({ from, to }) => {
              setDateFrom(from);
              setDateTo(to);
            }}
            className="w-full sm:w-[280px]"
          />
        </div>
        <div className="text-muted-foreground flex items-center gap-2 text-[11px]">
          <FileSpreadsheet className="size-3.5" />
          Format kolom mengikuti template perusahaan.
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {[
          {
            icon: Inbox,
            title: "Laporan Barang Masuk",
            value: `${incomingRows.length} dokumen · ${incomingQty} unit`,
            description: "Tanggal, supplier, item, jumlah, dan Admin penerima.",
            rows: [
              ["Tanggal", "Nomor", "Supplier", "Item", "Jumlah", "Admin"],
              ...incomingRows.map((row) => [
                formatDate(row.receivedAt),
                row.number,
                row.supplier.name,
                row.items.map((item) => item.item.name).join(", "),
                row.items.reduce((s, item) => s + item.qty, 0),
                row.createdBy.name,
              ]),
            ],
          },
          {
            icon: Truck,
            title: "Laporan Barang Keluar",
            value: `${outgoingRows.length} surat jalan · ${outgoingQty} unit`,
            description:
              "Nomor surat jalan, pekerjaan/site, Leader, item, jumlah.",
            rows: [
              [
                "Tanggal",
                "No. Surat Jalan",
                "Pekerjaan",
                "Site",
                "Leader",
                "Item",
                "Jumlah",
                "Status",
              ],
              ...outgoingRows.map((row) => [
                formatDate(row.confirmedAt ?? row.issuedAt),
                row.number,
                row.request.poNo,
                row.request.site,
                row.request.leader.name,
                row.items.map((item) => item.item.name).join(", "),
                row.items.reduce((s, item) => s + item.qty, 0),
                row.status,
              ]),
            ],
          },
          {
            icon: RotateCcw,
            title: "Laporan Turnover",
            value: `${turnoverRows.length} laporan`,
            description:
              "Jumlah keluar, terpakai, dikembalikan, rusak/hilang, status.",
            rows: [
              [
                "Tanggal",
                "Surat Jalan",
                "Leader",
                "Item",
                "Dipakai",
                "Kembali",
                "Rusak",
                "Status",
              ],
              ...turnoverRows.flatMap((row) =>
                row.items.map((item) => [
                  formatDate(row.submittedAt),
                  row.deliveryNote.number,
                  row.submittedBy.name,
                  item.item.name,
                  item.used,
                  item.returned,
                  item.damaged,
                  row.status,
                ]),
              ),
            ],
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="bg-card border-border flex flex-col gap-2.5 rounded-xl border p-4"
            >
              <div className="flex items-center justify-between">
                <span className="bg-muted flex size-7 items-center justify-center rounded-md">
                  <Icon className="size-3.5" />
                </span>
                <span className="border-border rounded-full border px-2.5 py-0.5 text-[10.5px]">
                  CSV
                </span>
              </div>
              <p className="text-[12.5px] font-semibold">{card.title}</p>
              <p className="text-base font-semibold tracking-[-0.3px]">
                {card.value}
              </p>
              <p className="text-muted-foreground text-[11px] leading-4">
                {card.description}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={() =>
                  downloadCsv(
                    `${card.title.toLowerCase().replaceAll(" ", "-")}-${dateFrom}-${dateTo}.csv`,
                    card.rows,
                  )
                }
              >
                <Download />
                Unduh
              </Button>
            </div>
          );
        })}
      </div>

      <div className="bg-card border-border flex flex-col gap-3 rounded-xl border p-4">
        <div>
          <p className="text-[13.5px] font-semibold">
            Pratinjau Laporan Barang Keluar
          </p>
          <p className="text-muted-foreground text-[11.5px]">
            {outgoingRows.length} baris pada rentang terpilih
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <div className="border-border flex min-w-[200px] flex-1 items-center gap-2 rounded-lg border px-3">
            <Search className="text-muted-foreground size-3.5" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nomor, pekerjaan, site, pelanggan, leader, atau item…"
              className="h-9 border-0 bg-transparent px-0 text-xs shadow-none focus-visible:ring-0"
            />
          </div>
          <SearchableSelect
            value={customerFilter}
            onValueChange={setCustomerFilter}
            searchPlaceholder="Cari pelanggan…"
            options={[
              { value: "ALL", label: "Semua pelanggan" },
              ...customers.map((value) => ({ value, label: value })),
            ]}
            className="h-9 w-full text-xs sm:w-[170px]"
          />
          <SearchableSelect
            value={statusFilter}
            onValueChange={setStatusFilter}
            searchPlaceholder="Cari status…"
            options={[
                { value: "ALL", label: "Semua status" },
                { value: "ISSUED", label: "Diterbitkan" },
                { value: "CONFIRMED", label: "Dibawa" },
                { value: "COMPLETED", label: "Selesai" },
              ]}
            className="h-9 w-full text-xs sm:w-[150px]"
            />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>No. Surat Jalan</TableHead>
              <TableHead>Pekerjaan / Site</TableHead>
              <TableHead>Leader</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Jumlah</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {outgoingRows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="text-xs">
                  {formatDate(row.confirmedAt ?? row.issuedAt)}
                </TableCell>
                <TableCell className="text-xs font-medium">
                  {row.number}
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {row.request.poNo} · {row.request.site}
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {row.request.leader.name}
                </TableCell>
                <TableCell className="text-xs">
                  <div className="flex flex-col gap-0.5">
                    {row.items.map((item) => (
                      <p key={item.id} className="text-muted-foreground">
                        {item.item.name}{" "}
                        <span className="text-foreground font-medium tabular-nums">
                          × {item.qty} {item.item.unit}
                        </span>
                      </p>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-xs font-semibold tabular-nums">
                  {row.items.reduce((sum, item) => sum + item.qty, 0)} unit
                </TableCell>
                <TableCell>
                  <StatusBadge status={row.status} />
                </TableCell>
              </TableRow>
            ))}
            {outgoingRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-muted-foreground py-6 text-center text-xs"
                >
                  Tidak ada data pada rentang ini.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
        <p className="text-muted-foreground text-[11.5px]">
          Total {outgoingRows.length} surat jalan · {outgoingQty} unit barang
          keluar.
        </p>
      </div>
    </div>
  );
}
