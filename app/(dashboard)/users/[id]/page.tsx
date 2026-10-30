"use client";

import { KeyRound, Save, ShieldCheck, UserX } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shell/page-header";
import { StatusBadge } from "@/components/shell/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useUpdateUser, useUsers } from "@/hooks/users/useUsers";
import { formatDate } from "@/lib/format";
import { authClient } from "@/services/auth/authClients";
import type { Role } from "@/types/inventory";

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: users = [] } = useUsers();
  const updateUser = useUpdateUser();
  const { data: session } = authClient.useSession();
  const currentUser = users.find((user) => user.id === params.id);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role>("LEADER");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!currentUser) return;
    setName(currentUser.name);
    setEmail(currentUser.email);
    setPhone(currentUser.phone ?? "");
    setRole(currentUser.role);
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="text-muted-foreground text-sm">Memuat pengguna…</div>
    );
  }

  const self = session?.user?.id === currentUser.id;

  async function save() {
    if (!currentUser) return;
    await updateUser.mutateAsync({
      id: currentUser.id,
      name,
      email,
      phone,
      role,
      password: password || undefined,
    });
    toast.success("Perubahan akun disimpan.");
    setPassword("");
  }

  async function toggleActive() {
    if (!currentUser) return;
    await updateUser.mutateAsync({
      id: currentUser.id,
      banned: !currentUser.banned,
    });
    toast.success(
      currentUser.banned ? "Akun diaktifkan." : "Akun dinonaktifkan.",
    );
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={currentUser.name}
        description={`${currentUser.employeeNo ?? "Tanpa nomor"} · Akun ${currentUser.role} · dibuat ${formatDate(currentUser.createdAt)}.`}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleActive}
              disabled={self || updateUser.isPending}
            >
              <UserX />
              {currentUser.banned ? "Aktifkan Akun" : "Nonaktifkan Akun"}
            </Button>
            <Button size="sm" onClick={save} disabled={updateUser.isPending}>
              <Save />
              Simpan Perubahan
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-4">
          <div className="bg-card border-border flex flex-col gap-4 rounded-xl border p-4">
            <div>
              <p className="text-[13.5px] font-semibold">Informasi Akun</p>
              <p className="text-muted-foreground text-[11.5px]">
                Data ini dipakai pada catatan approval dan audit log.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label className="text-[11.5px]">No. pengguna</Label>
                <div className="border-border bg-muted text-muted-foreground flex h-10 items-center rounded-lg border px-3 text-[12px] tabular-nums">
                  {currentUser.employeeNo ?? "—"}
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[11.5px]">Nomor WhatsApp</Label>
                <Input
                  value={phone}
                  placeholder="0812 3456 7890"
                  onChange={(event) => setPhone(event.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[11.5px]">Nama lengkap</Label>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[11.5px]">Email kantor</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[11.5px]">Role</Label>
                <SearchableSelect
                  value={role}
                  onValueChange={(value) => setRole(value as Role)}
                  searchPlaceholder="Cari role…"
                  options={[
                    { value: "ADMIN", label: "Admin" },
                    { value: "DIREKTUR", label: "Direktur" },
                    { value: "LEADER", label: "Leader" },
                  ]}
                  className="w-full"
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[11.5px]">Status akun</Label>
                <div className="border-border flex h-10 items-center justify-between rounded-lg border px-3">
                  <StatusBadge
                    status={currentUser.banned ? "REJECTED" : "SAFE"}
                    label={currentUser.banned ? "Nonaktif" : "Aktif"}
                  />
                  <span className="text-muted-foreground text-[10.5px]">
                    {currentUser.banned
                      ? "Tidak dapat login"
                      : "Dapat login"}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-1.5 sm:max-w-sm">
              <Label className="text-[11.5px]">Reset kata sandi</Label>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={password}
                  placeholder="Kosongkan bila tidak diubah"
                  onChange={(event) => setPassword(event.target.value)}
                />
                <Button
                  variant="outline"
                  onClick={save}
                  disabled={!password || updateUser.isPending}
                >
                  <KeyRound />
                  Reset
                </Button>
              </div>
              <p className="text-muted-foreground text-[10.5px]">
                Minimal 8 karakter. Password disimpan sebagai hash better-auth.
              </p>
            </div>
          </div>

          <div className="bg-card border-border flex flex-col gap-3 rounded-xl border p-4">
            <p className="text-[13.5px] font-semibold">Role &amp; Hak Akses</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {[
                {
                  value: "ADMIN",
                  title: "Admin",
                  description:
                    "Kelola gudang, verifikasi request, surat jalan, turnover, dan akun.",
                },
                {
                  value: "DIREKTUR",
                  title: "Direktur",
                  description:
                    "Menyetujui request, memantau barang keluar, membaca laporan.",
                },
                {
                  value: "LEADER",
                  title: "Leader",
                  description: "Mengajukan request dan mengisi turnover.",
                },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setRole(item.value as Role)}
                  className={`flex flex-col gap-1 rounded-lg border p-3 text-left ${
                    role === item.value
                      ? "border-foreground bg-muted"
                      : "border-border"
                  }`}
                >
                  <span className="flex items-center gap-2 text-[12px] font-semibold">
                    <span
                      className={`size-3.5 rounded-full border ${
                        role === item.value
                          ? "border-foreground bg-foreground"
                          : "border-border"
                      }`}
                    />
                    {item.title}
                  </span>
                  <span className="text-muted-foreground text-[10px] leading-4">
                    {item.description}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex h-fit flex-col gap-4">
          <div className="bg-card border-border flex flex-col gap-3 rounded-xl border p-4">
            <div className="flex items-center gap-2.5">
              <span className="bg-secondary flex size-9 items-center justify-center rounded-full text-[11px] font-semibold">
                {currentUser.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[12.5px] font-semibold">
                  {currentUser.name}
                </p>
                <p className="text-muted-foreground truncate text-[10.5px]">
                  {currentUser.email}
                </p>
              </div>
            </div>
            <StatusBadge
              status={currentUser.role === "ADMIN" ? "ISSUED" : "SAFE"}
              label={currentUser.role}
              className="border-border bg-card text-foreground"
            />
            {[
              ["No. pengguna", currentUser.employeeNo ?? "—"],
              ["WhatsApp", currentUser.phone ?? "Belum diisi"],
              ["Akun dibuat", formatDate(currentUser.createdAt)],
              ["Status", currentUser.banned ? "Nonaktif" : "Aktif"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between gap-3 border-b py-1.5 text-[11px] last:border-0"
              >
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
          </div>

          <div className="bg-card border-border flex flex-col gap-2 rounded-xl border p-4">
            <p className="flex items-center gap-2 text-[12px] font-semibold">
              <ShieldCheck className="size-4" />
              Kebijakan Akun
            </p>
            {[
              "Jumlah akun mengikuti kebijakan: 2 Direktur, 1 Admin, 5 Leader.",
              "Password minimal 8 karakter dan direset Admin bila lupa.",
              "Akun nonaktif tetap menyimpan riwayat transaksi.",
              "Semua perubahan akun tercatat di AuditLog.",
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
