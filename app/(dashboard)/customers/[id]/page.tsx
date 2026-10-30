"use client";

import {
  ArrowLeft,
  ClipboardList,
  Pencil,
  Save,
  TriangleAlert,
  Truck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shell/page-header";
import { PageSkeleton } from "@/components/shell/loading-state";
import { EmptyState, StatCard } from "@/components/shell/stat-card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useCustomer, useUpdateCustomer } from "@/hooks/inventory/useCustomers";
import { formatDate } from "@/lib/format";
import { authClient } from "@/services/auth/authClients";

type ItemUsage = {
  id: string;
  code: string;
  name: string;
  size: string | null;
  unit: string;
  stockGudang: number;
  minStock: number;
  delivered: number;
  used: number;
  returned: number;
  damaged: number;
};

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: customer, isLoading } = useCustomer(params.id);
  const updateCustomer = useUpdateCustomer();
  const { data: session } = authClient.useSession();
  const isAdmin =
    (session?.user as { role?: string } | undefined)?.role === "ADMIN";

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    company: "",
    contact: "",
    phone: "",
    email: "",
    address: "",
    note: "",
  });

  const usage = useMemo<ItemUsage[]>(() => {
    if (!customer) return [];
    const map = new Map<string, ItemUsage>();

    for (const request of customer.requests) {
      for (const row of request.delivery?.items ?? []) {
        const current = map.get(row.item.id) ?? {
          id: row.item.id,
          code: row.item.code,
          name: row.item.name,
          size: row.item.size,
          unit: row.item.unit,
          stockGudang: row.item.stockGudang,
          minStock: row.item.minStock,
          delivered: 0,
          used: 0,
          returned: 0,
          damaged: 0,
        };
        current.delivered += row.qty;
        map.set(row.item.id, current);
      }
      for (const row of request.delivery?.turnover?.items ?? []) {
        const current = map.get(row.item.id);
        if (!current) continue;
        current.used += row.used;
        current.returned += row.returned;
        current.damaged += row.damaged;
      }
    }

    return Array.from(map.values()).sort((a, b) =>
      a.code.localeCompare(b.code),
    );
  }, [customer]);

  const leaders = useMemo(
    () =>
      Array.from(
        new Map(
          (customer?.requests ?? []).map((request) => [
            request.leader.id,
            request.leader.name,
          ]),
        ).values(),
      ),
    [customer],
  );

  if (isLoading) return <PageSkeleton stats={4} columns={6} />;

  if (!customer) {
    return (
      <EmptyState
        title="Pelanggan tidak ditemukan"
        description="Data mungkin sudah dihapus atau tautannya salah."
      />
    );
  }

  const totalPo = customer.requests.length;
  const totalDelivered = usage.reduce((sum, row) => sum + row.delivered, 0);
  const depleted = usage.filter((row) => row.stockGudang === 0);
  const lowStock = usage.filter(
    (row) => row.stockGudang > 0 && row.stockGudang <= row.minStock,
  );

  function openEdit() {
    if (!customer) return;
    setForm({
      name: customer.name,
      company: customer.company ?? "",
      contact: customer.contact ?? "",
      phone: customer.phone ?? "",
      email: customer.email ?? "",
      address: customer.address ?? "",
      note: customer.note ?? "",
    });
    setOpen(true);
  }

  async function save() {
    if (!customer) return;
    if (!form.name.trim()) {
      toast.error("Nama pelanggan wajib diisi.");
      return;
    }
    await updateCustomer.mutateAsync({ id: customer.id, ...form });
    toast.success("Data pelanggan diperbarui.");
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={customer.name}
        description={`${customer.code} · ${customer.company ?? "Tanpa perusahaan"} · ${customer.isActive ? "Aktif" : "Nonaktif"}`}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/customers">
                <ArrowLeft />
                Kembali
              </Link>
            </Button>
            {isAdmin ? (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={openEdit}>
                    <Pencil />
                    Ubah Data
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Ubah pelanggan</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-3">
                    <div className="grid gap-1.5">
                      <Label>Nama pelanggan</Label>
                      <Input
                        value={form.name}
                        onChange={(event) =>
                          setForm({ ...form, name: event.target.value })
                        }
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label>Perusahaan / unit</Label>
                      <Input
                        value={form.company}
                        onChange={(event) =>
                          setForm({ ...form, company: event.target.value })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-1.5">
                        <Label>Kontak</Label>
                        <Input
                          value={form.contact}
                          onChange={(event) =>
                            setForm({ ...form, contact: event.target.value })
                          }
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label>Telepon / WhatsApp</Label>
                        <Input
                          value={form.phone}
                          onChange={(event) =>
                            setForm({ ...form, phone: event.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="grid gap-1.5">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={form.email}
                        onChange={(event) =>
                          setForm({ ...form, email: event.target.value })
                        }
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label>Alamat</Label>
                      <Textarea
                        rows={2}
                        value={form.address}
                        onChange={(event) =>
                          setForm({ ...form, address: event.target.value })
                        }
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label>Catatan</Label>
                      <Textarea
                        rows={2}
                        value={form.note}
                        onChange={(event) =>
                          setForm({ ...form, note: event.target.value })
                        }
                      />
                    </div>
                    <label className="flex items-center gap-2 text-[11.5px]">
                      <input
                        type="checkbox"
                        checked={customer.isActive}
                        onChange={(event) =>
                          updateCustomer.mutate({
                            id: customer.id,
                            name: customer.name,
                            company: customer.company ?? undefined,
                            contact: customer.contact ?? undefined,
                            phone: customer.phone ?? undefined,
                            email: customer.email ?? undefined,
                            address: customer.address ?? undefined,
                            note: customer.note ?? undefined,
                            isActive: event.target.checked,
                          })
                        }
                        className="accent-primary size-3.5"
                      />
                      Pelanggan aktif (dapat dipilih Leader)
                    </label>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                      Batal
                    </Button>
                    <Button onClick={save} disabled={updateCustomer.isPending}>
                      <Save />
                      Simpan
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            ) : null}
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total PO"
          value={`${totalPo} PO`}
          icon={ClipboardList}
        />
        <StatCard
          label="Leader Bergerak"
          value={`${leaders.length} leader`}
          icon={Users}
        />
        <StatCard
          label="Item Dikirim"
          value={`${totalDelivered} unit`}
          icon={Truck}
        />
        <StatCard
          label="Item Habis"
          value={`${depleted.length} item`}
          icon={TriangleAlert}
        >
          <span className="text-muted-foreground text-[11px]">
            {lowStock.length} item menipis
          </span>
        </StatCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-4">
          <div className="bg-card border-border flex flex-col gap-3 rounded-xl border p-4">
            <div>
              <p className="text-[13.5px] font-semibold">PO & Pekerjaan</p>
              <p className="text-muted-foreground text-[11.5px]">
                Seluruh PO pelanggan ini, terbaru lebih dulu.
              </p>
            </div>
            {customer.requests.length === 0 ? (
              <EmptyState
                title="Belum ada PO"
                description="Leader belum membuat request untuk pelanggan ini."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-36">Nomor PO</TableHead>
                      <TableHead>Site</TableHead>
                      <TableHead className="w-36">Leader</TableHead>
                      <TableHead className="w-28">Surat Jalan</TableHead>
                      <TableHead className="w-32">Tanggal</TableHead>
                      <TableHead className="w-36">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.requests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <p className="text-xs font-medium">{request.poNo}</p>
                          <p className="text-muted-foreground text-[10.5px]">
                            {request.number}
                          </p>
                        </TableCell>
                        <TableCell className="text-xs">
                          {request.site}
                        </TableCell>
                        <TableCell className="text-xs">
                          {request.leader.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {request.delivery?.number ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {formatDate(request.createdAt)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={request.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <div className="bg-card border-border flex flex-col gap-3 rounded-xl border p-4">
            <div>
              <p className="text-[13.5px] font-semibold">Inventory di Pakai</p>
              <p className="text-muted-foreground text-[11.5px]">
                Barang yang dikirim, dipakai, kembali, rusak, dan sisa stok
                terkini.
              </p>
            </div>
            {usage.length === 0 ? (
              <EmptyState
                title="Belum ada barang dikirim"
                description="Inventory akan muncul setelah surat jalan dikonfirmasi Admin."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Item</TableHead>
                      <TableHead className="w-24">Ukuran</TableHead>
                      <TableHead className="w-20 text-right">Dikirim</TableHead>
                      <TableHead className="w-20 text-right">
                        Terpakai
                      </TableHead>
                      <TableHead className="w-20 text-right">Kembali</TableHead>
                      <TableHead className="w-20 text-right">Rusak</TableHead>
                      <TableHead className="w-28 text-right">
                        Sisa Stok
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usage.map((row) => (
                      <TableRow
                        key={row.id}
                        className={
                          row.stockGudang === 0
                            ? "bg-destructive-surface/50"
                            : row.stockGudang <= row.minStock
                              ? "bg-warning-surface/50"
                              : undefined
                        }
                      >
                        <TableCell>
                          <p className="text-xs font-medium">{row.name}</p>
                          <p className="text-muted-foreground text-[10.5px]">
                            {row.code}
                          </p>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {row.size ?? "—"}
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums">
                          {row.delivered} {row.unit}
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
              </div>
            )}
          </div>
        </div>

        <div className="flex h-fit flex-col gap-4">
          <div className="bg-card border-border flex flex-col gap-2 rounded-xl border p-4">
            <p className="text-[13.5px] font-semibold">Kontak Pelanggan</p>
            {[
              ["Kontak", customer.contact ?? "—"],
              ["Telepon", customer.phone ?? "—"],
              ["Email", customer.email ?? "—"],
              ["Alamat", customer.address ?? "—"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex justify-between gap-3 border-b py-1.5 text-[11px] last:border-0"
              >
                <span className="text-muted-foreground">{label}</span>
                <span className="max-w-[60%] text-right font-medium">
                  {value}
                </span>
              </div>
            ))}
          </div>

          <div className="bg-card border-border flex flex-col gap-2 rounded-xl border p-4">
            <p className="text-[13.5px] font-semibold">Leader yang Bergerak</p>
            {leaders.length === 0 ? (
              <p className="text-muted-foreground text-[11px]">Belum ada.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {leaders.map((leader) => (
                  <StatusBadge
                    key={leader}
                    status="SAFE"
                    label={leader}
                    className="border-border bg-card text-foreground"
                  />
                ))}
              </div>
            )}
          </div>

          {customer.note ? (
            <div className="bg-muted flex flex-col gap-1.5 rounded-xl p-4">
              <p className="text-[11.5px] font-semibold">Catatan</p>
              <p className="text-muted-foreground text-[10.5px] leading-4">
                {customer.note}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
