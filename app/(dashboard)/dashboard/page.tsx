"use client";

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Download,
  Inbox,
  Package,
  Plus,
  Truck,
  Warehouse,
} from "lucide-react";
import Link from "next/link";

import {
  TopItemsChart,
  UsageByLeaderCustomerChart,
} from "@/components/dashboard/usage-charts";
import { PageHeader } from "@/components/shell/page-header";
import { RequestPipeline } from "@/components/shell/request-pipeline";
import { EmptyState, StatCard } from "@/components/shell/stat-card";
import { StatusBadge } from "@/components/shell/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/hooks/inventory/useDashboard";
import { downloadCsv } from "@/lib/csv";
import { formatDate } from "@/lib/format";
import { authClient } from "@/services/auth/authClients";

export default function DashboardPage() {
  const { data, isLoading } = useDashboard();
  const { data: session } = authClient.useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const isAdmin = role === "ADMIN";
  const maxChart = Math.max(
    ...(data?.chart.flatMap((row) => [row.masuk, row.keluar]) ?? [1]),
    1,
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Dashboard"
        description={`Ringkasan stok dan alur barang · ${new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date())}`}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                data &&
                downloadCsv("ringkasan-stok.csv", [
                  ["Metrik", "Nilai"],
                  ["Total item", data.itemCount],
                  ["Stok gudang", data.stockGudang],
                  ["Stok operasional", data.stockOperasional],
                  ["Menunggu approval", data.pendingApprovals],
                  ["Barang masuk bulan ini", data.incomingThisMonth],
                  ["Barang keluar bulan ini", data.outgoingThisMonth],
                ])
              }
            >
              <Download />
              Ekspor
            </Button>
            {isAdmin ? (
              <Button asChild size="sm">
                <Link href="/incoming">
                  <Plus />
                  Catat Barang Masuk
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      {isLoading || !data ? (
        <>
          <Skeleton className="h-[206px] rounded-xl" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-[104px] rounded-xl" />
            ))}
          </div>
        </>
      ) : (
        <>
          <RequestPipeline pipeline={data.pipeline} />

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total Item Consumable"
              value={`${data.itemCount} item`}
              icon={Package}
            >
              <span className="bg-muted text-muted-foreground w-fit rounded-full px-2.5 py-0.5 text-[11px]">
                {data.lowStock.length} item perlu perhatian
              </span>
            </StatCard>
            <StatCard
              label="Stok Gudang"
              value={`${data.stockGudang.toLocaleString("id-ID")} unit`}
              icon={Warehouse}
            >
              <span className="bg-warning-surface text-warning w-fit rounded-full px-2.5 py-0.5 text-[11px]">
                {data.lowStock.length} item menipis
              </span>
            </StatCard>
            <StatCard
              label="Barang di Operasional"
              value={`${data.stockOperasional.toLocaleString("id-ID")} unit`}
              icon={Truck}
            >
              <span className="bg-info-surface text-info w-fit rounded-full px-2.5 py-0.5 text-[11px]">
                {data.onSite.length} surat jalan aktif
              </span>
            </StatCard>
            <StatCard
              label="Menunggu Approval"
              value={`${data.pendingApprovals} request`}
              icon={Inbox}
            >
              <span className="bg-warning-surface text-warning w-fit rounded-full px-2.5 py-0.5 text-[11px]">
                {data.pendingDirector} perlu Direktur
              </span>
            </StatCard>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="bg-card border-border flex flex-col gap-4 rounded-xl border p-4">
              <div>
                <p className="text-[13.5px] font-semibold">
                  Aktivitas Stok 6 Bulan
                </p>
                <p className="text-muted-foreground text-[11.5px]">
                  Barang masuk dan keluar per bulan
                </p>
              </div>
              <div className="flex h-40 items-end justify-between gap-2">
                {data.chart.map((row) => (
                  <div
                    key={row.month}
                    className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                  >
                    <div className="flex h-full w-full items-end justify-center gap-1">
                      <div
                        title={`Masuk ${row.masuk}`}
                        className="bg-chart-1 w-3 rounded-t-sm"
                        style={{
                          height: `${Math.max((row.masuk / maxChart) * 100, 2)}%`,
                        }}
                      />
                      <div
                        title={`Keluar ${row.keluar}`}
                        className="bg-chart-2 w-3 rounded-t-sm"
                        style={{
                          height: `${Math.max((row.keluar / maxChart) * 100, 2)}%`,
                        }}
                      />
                    </div>
                    <span className="text-muted-foreground text-[10.5px]">
                      {row.month}
                    </span>
                  </div>
                ))}
              </div>
              <div className="text-muted-foreground flex items-center gap-4 text-[10.5px]">
                <span className="flex items-center gap-1.5">
                  <span className="bg-chart-1 size-2 rounded-sm" /> Barang masuk
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="bg-chart-2 size-2 rounded-sm" /> Barang keluar
                </span>
              </div>
            </div>

            <div className="bg-card border-border flex flex-col gap-3 rounded-xl border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[13.5px] font-semibold">Peringatan Stok</p>
                  <p className="text-muted-foreground text-[11.5px]">
                    {data.lowStock.length} item di bawah stok minimum
                  </p>
                </div>
                <span className="bg-destructive-surface text-destructive-strong rounded-full px-2.5 py-0.5 text-[11px] font-medium">
                  {data.lowStock.length} item
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {data.lowStock.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    className="bg-muted flex items-center gap-2 rounded-md px-2.5 py-2"
                  >
                    <AlertTriangle
                      className={
                        item.stockGudang === 0
                          ? "text-destructive size-3.5 shrink-0"
                          : "text-warning-solid size-3.5 shrink-0"
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-medium">
                        {item.name}
                      </p>
                      <p className="text-muted-foreground text-[9.5px]">
                        {item.stockGudang} / min {item.minStock} {item.unit}
                      </p>
                    </div>
                    <StatusBadge
                      status={item.stockGudang === 0 ? "REJECTED" : "PENDING_ADMIN"}
                      label={item.stockGudang === 0 ? "Habis" : "Menipis"}
                    />
                  </div>
                ))}
                {data.lowStock.length === 0 ? (
                  <p className="text-muted-foreground py-4 text-center text-xs">
                    Semua stok di atas minimum.
                  </p>
                ) : null}
              </div>

              {isAdmin ? (
                <Button asChild variant="outline" size="sm" className="w-fit">
                  <Link href="/items">
                    Kelola di Master Item <ArrowRight />
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <TopItemsChart items={data.topItems} />
            <UsageByLeaderCustomerChart items={data.usageByLeaderCustomer} />
          </div>

          <div className="bg-card border-border flex flex-col gap-3 rounded-xl border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13.5px] font-semibold">
                  Barang Sedang Dibawa
                </p>
                <p className="text-muted-foreground text-[11.5px]">
                  Sudah keluar gudang dan belum di-turnover
                </p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/delivery-notes">
                  Lihat semua <ArrowRight />
                </Link>
              </Button>
            </div>

            {data.onSite.length === 0 ? (
              <EmptyState
                title="Belum ada barang di site"
                description="Konfirmasi surat jalan akan menampilkan data di sini."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Surat Jalan</TableHead>
                    <TableHead>Leader</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Jumlah</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.onSite.map((note) => (
                    <TableRow key={note.id}>
                      <TableCell>
                        <p className="text-xs font-medium">{note.number}</p>
                        <p className="text-muted-foreground text-[10.5px]">
                          {formatDate(note.confirmedAt ?? note.issuedAt)}
                        </p>
                      </TableCell>
                      <TableCell className="text-xs">
                        {note.request.leader.name}
                      </TableCell>
                      <TableCell className="text-xs">
                        {note.request.site}
                      </TableCell>
                      <TableCell className="text-xs">
                        {note.items
                          .map((row) => row.item.name)
                          .join(", ")}
                      </TableCell>
                      <TableCell className="text-xs">
                        {note.items.reduce((sum, row) => sum + row.qty, 0)} unit
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={note.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <div className="bg-muted text-muted-foreground flex items-center gap-2 rounded-xl px-4 py-3 text-[11.5px]">
            <CheckCircle2 className="text-success size-4 shrink-0" />
            Alur: Request Leader → cek stok Admin → persetujuan Direktur → surat
            jalan → turnover &amp; verifikasi stok.
          </div>
        </>
      )}
    </div>
  );
}
