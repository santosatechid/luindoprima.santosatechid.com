"use client";

import { Download, Search, UserPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shell/page-header";
import { PageSkeleton } from "@/components/shell/loading-state";
import { EmptyState } from "@/components/shell/stat-card";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCreateUser, useUsers } from "@/hooks/users/useUsers";
import { downloadCsv } from "@/lib/csv";
import { formatDateTime } from "@/lib/format";
import type { Role } from "@/types/inventory";

const EMPTY = {
  name: "",
  email: "",
  password: "",
  phone: "",
  role: "LEADER" as Role,
};

export default function UsersPage() {
  const { data: users = [], isLoading } = useUsers();
  const createUser = useCreateUser();
  const [tab, setTab] = useState("ALL");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const filtered = users.filter((user) => {
    const matchesTab = tab === "ALL" || user.role === tab;
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "BANNED" ? user.banned : !user.banned);
    const query = search.toLowerCase();
    return (
      matchesTab &&
      matchesStatus &&
      (user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        (user.employeeNo ?? "").toLowerCase().includes(query) ||
        (user.phone ?? "").toLowerCase().includes(query))
    );
  });

  async function submit() {
    if (!form.name || !form.email || !form.password) {
      toast.error("Nama, email, dan kata sandi wajib diisi.");
      return;
    }
    if (form.password.length < 8) {
      toast.error("Kata sandi minimal 8 karakter.");
      return;
    }
    await createUser.mutateAsync(form);
    toast.success("Pengguna ditambahkan.");
    setForm(EMPTY);
    setOpen(false);
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Manajemen Pengguna"
        description="Kelola akun Admin, Direktur, dan Leader beserta role dan hak aksesnya."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadCsv("pengguna.csv", [
                  ["No. Pengguna", "Nama", "Email", "Telepon", "Role", "Status"],
                  ...users.map((user) => [
                    user.employeeNo ?? "",
                    user.name,
                    user.email,
                    user.phone ?? "",
                    user.role,
                    user.banned ? "Nonaktif" : "Aktif",
                  ]),
                ])
              }
            >
              <Download />
              Ekspor
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <UserPlus />
                  Tambah Pengguna
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tambah pengguna</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3">
                  <div className="grid gap-1.5">
                    <Label>Nama lengkap</Label>
                    <Input
                      value={form.name}
                      onChange={(event) =>
                        setForm({ ...form, name: event.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Email kantor</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(event) =>
                        setForm({ ...form, email: event.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Nomor WhatsApp</Label>
                    <Input
                      value={form.phone}
                      placeholder="0812 3456 7890"
                      onChange={(event) =>
                        setForm({ ...form, phone: event.target.value })
                      }
                    />
                    <p className="text-muted-foreground text-[10.5px]">
                      Dipakai bot untuk mengirim notifikasi approval.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label>Kata sandi</Label>
                      <Input
                        type="password"
                        value={form.password}
                        onChange={(event) =>
                          setForm({ ...form, password: event.target.value })
                        }
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label>Role</Label>
                      <SearchableSelect
                        value={form.role}
                        onValueChange={(value) =>
                          setForm({ ...form, role: value as Role })
                        }
                        searchPlaceholder="Cari role…"
                        options={[
                          { value: "ADMIN", label: "Admin" },
                          { value: "DIREKTUR", label: "Direktur" },
                          { value: "LEADER", label: "Leader" },
                        ]}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Batal
                  </Button>
                  <Button onClick={submit} disabled={createUser.isPending}>
                    Simpan Pengguna
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      <Tabs value={tab} onValueChange={setTab} className="gap-4">
        <TabsList className="h-auto flex-wrap justify-start gap-5 rounded-none bg-transparent p-0">
          {["ALL", "ADMIN", "DIREKTUR", "LEADER"].map((value) => (
            <TabsTrigger
              key={value}
              value={value}
              className="data-[state=active]:bg-transparent data-[state=active]:text-foreground text-muted-foreground rounded-none border-0 border-b-2 border-transparent px-0 pb-2.5 text-[12.5px] data-[state=active]:border-foreground data-[state=active]:shadow-none"
            >
              {value === "ALL" ? "Semua" : value}
              <span className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10.5px]">
                {value === "ALL"
                  ? users.length
                  : users.filter((user) => user.role === value).length}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <div className="border-border flex min-w-[200px] flex-1 items-center gap-2 rounded-lg border px-3">
          <Search className="text-muted-foreground size-3.5" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nama atau email pengguna…"
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
            { value: "BANNED", label: "Diblokir" },
          ]}
          className="h-9 w-full text-xs sm:w-[150px]"
        />
      </div>

      <div className="bg-card border-border overflow-hidden rounded-xl border">
        {isLoading ? (
          <PageSkeleton columns={5} rows={6} />
        ) : filtered.length === 0 ? (
          <EmptyState title="Tidak ada pengguna" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60">
                <TableHead className="w-32">No. Pengguna</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead className="w-28">Role</TableHead>
                <TableHead className="w-40">Terakhir masuk</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="w-24">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="text-xs font-medium tabular-nums">
                    {user.employeeNo ?? "—"}
                  </TableCell>
                  <TableCell>
                    <p className="text-xs font-medium">{user.name}</p>
                    <p className="text-muted-foreground text-[10.5px]">
                      {user.email}
                    </p>
                    <p className="text-muted-foreground text-[10.5px]">
                      {user.phone ?? "WhatsApp belum diisi"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={user.role === "ADMIN" ? "ISSUED" : "SAFE"}
                      label={user.role}
                      className="border-border bg-card text-foreground"
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {formatDateTime(user.createdAt)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={user.banned ? "REJECTED" : "SAFE"}
                      label={user.banned ? "Nonaktif" : "Aktif"}
                    />
                  </TableCell>
                  <TableCell>
                    <Button asChild variant="outline" size="xs">
                      <Link href={`/users/${user.id}`}>Kelola</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <p className="bg-muted text-muted-foreground rounded-xl px-4 py-3 text-[11px]">
        Hanya Admin yang dapat menambah akun dan mengubah role. Setiap perubahan
        tercatat di AuditLog. Tidak ada pendaftaran mandiri.
      </p>
    </div>
  );
}
