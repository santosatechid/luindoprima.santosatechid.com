"use client";

import { Pencil, Plus, Search, UserRound, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageSkeleton } from "@/components/shell/loading-state";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState, StatCard } from "@/components/shell/stat-card";
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
import {
  useCreatePersonnel,
  useDeactivatePersonnel,
  usePersonnel,
  useUpdatePersonnel,
} from "@/hooks/inventory/usePersonnel";
import { authClient } from "@/services/auth/authClients";
import type { Personnel } from "@/types/inventory";

const EMPTY = { id: "", name: "", position: "" };

export default function PersonnelPage() {
  const { data: rows = [], isLoading } = usePersonnel();
  const createPersonnel = useCreatePersonnel();
  const updatePersonnel = useUpdatePersonnel();
  const deactivatePersonnel = useDeactivatePersonnel();
  const { data: session } = authClient.useSession();
  const isAdmin =
    (session?.user as { role?: string } | undefined)?.role === "ADMIN";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const query = search.trim().toLowerCase();
  const filtered = rows.filter((person) => {
    const matchesSearch =
      !query ||
      person.name.toLowerCase().includes(query) ||
      person.position.toLowerCase().includes(query);
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" ? person.isActive : !person.isActive);
    return matchesSearch && matchesStatus;
  });

  const activeCount = rows.filter((person) => person.isActive).length;
  const positions = new Set(rows.map((person) => person.position)).size;

  function openCreate() {
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(person: Personnel) {
    setForm({ id: person.id, name: person.name, position: person.position });
    setOpen(true);
  }

  async function submit() {
    if (!form.name.trim()) {
      toast.error("Nama personel wajib diisi.");
      return;
    }
    if (!form.position.trim()) {
      toast.error("Jabatan personel wajib diisi.");
      return;
    }

    if (form.id) {
      await updatePersonnel.mutateAsync({
        id: form.id,
        name: form.name,
        position: form.position,
      });
      toast.success("Data personel diperbarui.");
    } else {
      await createPersonnel.mutateAsync({
        name: form.name,
        position: form.position,
      });
      toast.success("Personel ditambahkan ke roster.");
    }
    setOpen(false);
    setForm(EMPTY);
  }

  if (isLoading) return <PageSkeleton stats={3} columns={4} />;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Personel"
        description="Roster nama dan jabatan yang dipilih Leader saat menyusun surat tugas."
        actions={
          isAdmin ? (
            <Button size="sm" onClick={openCreate}>
              <Plus />
              Tambah Personel
            </Button>
          ) : null
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total Personel" value={rows.length} icon={Users} />
        <StatCard label="Aktif" value={activeCount} icon={UserRound} />
        <StatCard label="Jabatan" value={positions} icon={Users} />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <div className="border-border flex min-w-[200px] flex-1 items-center gap-2 rounded-lg border px-3">
          <Search className="text-muted-foreground size-3.5" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nama atau jabatan…"
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
            title={
              rows.length === 0 ? "Roster masih kosong" : "Tidak ada hasil"
            }
            description={
              rows.length === 0
                ? "Tambahkan nama dan jabatan agar Leader bisa menyusun surat tugas."
                : "Ubah kata kunci atau filter status."
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60">
                <TableHead>Nama</TableHead>
                <TableHead className="w-56">Jabatan</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="w-40">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((person) => (
                <TableRow key={person.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <span className="bg-interactive-surface text-accent-foreground flex size-7 items-center justify-center rounded-full text-[10px] font-semibold">
                        {person.name
                          .split(" ")
                          .map((part) => part[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                      <span className="text-xs font-medium">{person.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">{person.position}</TableCell>
                  <TableCell>
                    <StatusBadge
                      status={person.isActive ? "SAFE" : "DRAFT"}
                      label={person.isActive ? "Aktif" : "Nonaktif"}
                    />
                  </TableCell>
                  <TableCell>
                    {isAdmin ? (
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => openEdit(person)}
                        >
                          <Pencil />
                          Ubah
                        </Button>
                        {person.isActive ? (
                          <Button
                            variant="ghost"
                            size="xs"
                            disabled={deactivatePersonnel.isPending}
                            onClick={async () => {
                              await deactivatePersonnel.mutateAsync(person.id);
                              toast.success(`${person.name} dinonaktifkan.`);
                            }}
                          >
                            Nonaktifkan
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="xs"
                            disabled={updatePersonnel.isPending}
                            onClick={async () => {
                              await updatePersonnel.mutateAsync({
                                id: person.id,
                                name: person.name,
                                position: person.position,
                                isActive: true,
                              });
                              toast.success(`${person.name} diaktifkan lagi.`);
                            }}
                          >
                            Aktifkan
                          </Button>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-[10.5px]">
                        Hanya Admin
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <p className="bg-muted text-muted-foreground rounded-xl px-4 py-3 text-[11.5px]">
        Personel yang dinonaktifkan hilang dari pilihan Leader, tetapi surat
        tugas lama tetap menyimpan nama dan jabatan saat surat itu dibuat.
      </p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {form.id ? "Ubah personel" : "Tambah personel"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Nama lengkap</Label>
              <Input
                value={form.name}
                placeholder="Ahmad Dahlan"
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Jabatan</Label>
              <Input
                value={form.position}
                placeholder="Juru Radiografi"
                onChange={(event) =>
                  setForm({ ...form, position: event.target.value })
                }
              />
            </div>
            <p className="text-muted-foreground text-[10.5px]">
              Jabatan tercetak di kolom Jabatan pada surat tugas.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={submit}
              disabled={createPersonnel.isPending || updatePersonnel.isPending}
            >
              {form.id ? "Simpan Perubahan" : "Simpan Personel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
