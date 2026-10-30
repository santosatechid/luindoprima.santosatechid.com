"use client";

import {
  Building2,
  ClipboardList,
  Download,
  Plus,
  Search,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
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
import { useCreateCustomer, useCustomers } from "@/hooks/inventory/useCustomers";
import { downloadCsv } from "@/lib/csv";
import { authClient } from "@/services/auth/authClients";
import type { Customer } from "@/types/inventory";

const EMPTY = {
  name: "",
  company: "",
  contact: "",
  phone: "",
  email: "",
  address: "",
  note: "",
};

export default function CustomersPage() {
  const { data: customers = [], isLoading } = useCustomers();
  const createCustomer = useCreateCustomer();
  const { data: session } = authClient.useSession();
  const isAdmin =
    (session?.user as { role?: string } | undefined)?.role === "ADMIN";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const query = search.trim().toLowerCase();
  const filtered = customers.filter((customer) => {
    const matchesSearch =
      !query ||
      customer.code.toLowerCase().includes(query) ||
      customer.name.toLowerCase().includes(query) ||
      (customer.company ?? "").toLowerCase().includes(query) ||
      (customer.contact ?? "").toLowerCase().includes(query) ||
      (customer.phone ?? "").toLowerCase().includes(query);
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" ? customer.isActive : !customer.isActive);
    return matchesSearch && matchesStatus;
  });

  const activeCount = customers.filter((customer) => customer.isActive).length;
  const withPo = customers.filter(
    (customer) => (customer._count?.requests ?? 0) > 0,
  ).length;

  async function submit() {
    if (!form.name.trim()) {
      toast.error("Nama pelanggan wajib diisi.");
      return;
    }
    await createCustomer.mutateAsync(form);
    toast.success("Pelanggan ditambahkan.");
    setForm(EMPTY);
    setOpen(false);
  }

  function exportCsv() {
    downloadCsv("pelanggan.csv", [
      ["Kode", "Nama", "Perusahaan", "Kontak", "Telepon", "Email", "PO", "Status"],
      ...customers.map((customer) => [
        customer.code,
        customer.name,
        customer.company ?? "",
        customer.contact ?? "",
        customer.phone ?? "",
        customer.email ?? "",
        customer._count?.requests ?? 0,
        customer.isActive ? "Aktif" : "Nonaktif",
      ]),
    ]);
  }

  if (isLoading) return <PageSkeleton stats={3} columns={6} />;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Pelanggan"
        description="Data pelanggan beserta PO, leader yang bergerak, dan pemakaian inventory di lokasi mereka."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={exportCsv}
              disabled={customers.length === 0}
            >
              <Download />
              Ekspor
            </Button>
            {isAdmin ? (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus />
                    Tambah Pelanggan
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Tambah pelanggan</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-3">
                    <div className="grid gap-1.5">
                      <Label>Nama pelanggan</Label>
                      <Input
                        value={form.name}
                        placeholder="PT Indonesia Power"
                        onChange={(event) =>
                          setForm({ ...form, name: event.target.value })
                        }
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label>Perusahaan / unit</Label>
                      <Input
                        value={form.company}
                        placeholder="UP Suralaya"
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
                          placeholder="0812 3456 7890"
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
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                      Batal
                    </Button>
                    <Button
                      onClick={submit}
                      disabled={createCustomer.isPending}
                    >
                      Simpan Pelanggan
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            ) : null}
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Total Pelanggan"
          value={customers.length}
          icon={Building2}
        />
        <StatCard label="Aktif" value={activeCount} icon={Users} />
        <StatCard
          label="Punya PO"
          value={withPo}
          icon={ClipboardList}
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <div className="border-border flex min-w-[200px] flex-1 items-center gap-2 rounded-lg border px-3">
          <Search className="text-muted-foreground size-3.5" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari kode, nama, perusahaan, kontak, atau telepon…"
            className="h-9 border-0 bg-transparent px-0 text-xs shadow-none focus-visible:ring-0"
          />
        </div>
        <SearchableSelect
          value={statusFilter}
          onValueChange={setStatusFilter}
          searchPlaceholder="Cari status…"
          options={[
            { value: "ALL", label: "Semua status" },
            { value: "ACTIVE", label: "Aktif" },
            { value: "INACTIVE", label: "Nonaktif" },
          ]}
          className="h-9 w-full text-xs sm:w-[150px]"
        />
      </div>

      <div className="bg-card border-border overflow-hidden rounded-xl border">
        {filtered.length === 0 ? (
          <EmptyState
            title="Belum ada pelanggan"
            description={
              isAdmin
                ? "Tambahkan pelanggan agar Leader dapat memilih saat membuat request PO."
                : "Admin belum menambahkan data pelanggan."
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60">
                <TableHead className="w-28">Kode</TableHead>
                <TableHead>Pelanggan</TableHead>
                <TableHead className="w-52">Kontak</TableHead>
                <TableHead className="w-20">PO</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="w-24">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((customer: Customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="text-xs font-medium">
                    {customer.code}
                  </TableCell>
                  <TableCell>
                    <p className="text-xs font-medium">{customer.name}</p>
                    <p className="text-muted-foreground text-[10.5px]">
                      {customer.company ?? "—"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="text-xs">{customer.contact ?? "—"}</p>
                    <p className="text-muted-foreground text-[10.5px]">
                      {customer.phone ?? customer.email ?? "—"}
                    </p>
                  </TableCell>
                  <TableCell className="text-xs font-medium">
                    {customer._count?.requests ?? 0}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={customer.isActive ? "SAFE" : "DRAFT"}
                      label={customer.isActive ? "Aktif" : "Nonaktif"}
                    />
                  </TableCell>
                  <TableCell>
                    <Button asChild variant="outline" size="xs">
                      <Link href={`/customers/${customer.id}`}>
                        {isAdmin ? "Kelola" : "Lihat"}
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <p className="bg-muted text-muted-foreground rounded-xl px-4 py-3 text-[11px]">
        Admin mengelola data pelanggan. Direktur dan Leader hanya dapat melihat
        PO, leader, serta inventory yang dipakai di tiap pelanggan.
      </p>
    </div>
  );
}
