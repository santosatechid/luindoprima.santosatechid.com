"use client";

import { CheckCheck, CircleSlash, MessageSquare, TriangleAlert } from "lucide-react";
import { useState } from "react";

import { DateRangePicker } from "@/components/common/date-range-picker";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState, StatCard } from "@/components/shell/stat-card";
import { TableSkeleton } from "@/components/shell/loading-state";
import { StatusBadge } from "@/components/shell/status-badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNotifications } from "@/hooks/inventory/useNotifications";
import { formatDateTime, inRange } from "@/lib/format";

const TABS = [
  { value: "ALL", label: "Semua" },
  { value: "SENT", label: "Terkirim" },
  { value: "FAILED", label: "Gagal" },
  { value: "SKIPPED", label: "Dilewati" },
];

export default function NotificationsPage() {
  const { data: rows = [], isLoading } = useNotifications();
  const [tab, setTab] = useState("ALL");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const query = search.trim().toLowerCase();
  const filtered = rows.filter((row) => {
    const matchesSearch =
      !query ||
      (row.targetName ?? "").toLowerCase().includes(query) ||
      row.target.toLowerCase().includes(query) ||
      row.subject.toLowerCase().includes(query) ||
      row.message.toLowerCase().includes(query) ||
      (row.error ?? "").toLowerCase().includes(query);
    return (
      matchesSearch &&
      (tab === "ALL" || row.status === tab) &&
      inRange(row.createdAt, dateFrom, dateTo)
    );
  });

  const counts = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Log WhatsApp"
        description="Riwayat notifikasi otomatis ke Admin, Direktur, dan Leader — termasuk yang gagal terkirim."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total pesan" value={rows.length} icon={MessageSquare} />
        <StatCard label="Terkirim" value={counts.SENT ?? 0} icon={CheckCheck} />
        <StatCard label="Gagal" value={counts.FAILED ?? 0} icon={TriangleAlert} />
        <StatCard
          label="Dilewati (nomor kosong)"
          value={counts.SKIPPED ?? 0}
          icon={CircleSlash}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={setTab} className="gap-4">
          <TabsList className="h-auto flex-wrap justify-start gap-5 rounded-none bg-transparent p-0">
            {TABS.map((item) => (
              <TabsTrigger
                key={item.value}
                value={item.value}
                className="data-[state=active]:text-foreground text-muted-foreground data-[state=active]:border-foreground rounded-none border-0 border-b-2 border-transparent px-0 pb-2.5 text-[12.5px] data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                {item.label}
                <span className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10.5px]">
                  {item.value === "ALL" ? rows.length : counts[item.value] ?? 0}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nama, nomor, isi pesan…"
            className="h-9 w-full text-xs sm:w-64"
          />
          <DateRangePicker
            from={dateFrom}
            to={dateTo}
            onChange={(range) => {
              setDateFrom(range.from);
              setDateTo(range.to);
            }}
          />
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Belum ada log pengiriman"
          description="Notifikasi muncul di sini setelah ada request, surat jalan, atau turnover."
        />
      ) : (
        <div className="border-border overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60">
                <TableHead>Waktu</TableHead>
                <TableHead>Penerima</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Subjek</TableHead>
                <TableHead>Pesan</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                    {formatDateTime(row.createdAt)}
                  </TableCell>
                  <TableCell>
                    <p className="text-xs font-medium">
                      {row.targetName ?? "—"}
                    </p>
                    <p className="text-muted-foreground text-[10.5px]">
                      {row.target}
                    </p>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {row.role ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs">{row.subject}</TableCell>
                  <TableCell className="max-w-[360px]">
                    <p
                      className="text-muted-foreground line-clamp-2 text-[11.5px] whitespace-pre-line"
                      title={row.message}
                    >
                      {row.message}
                    </p>
                    {row.error ? (
                      <p className="text-destructive-strong mt-1 text-[10.5px]">
                        {row.error}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={row.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
