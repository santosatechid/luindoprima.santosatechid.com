"use client";

import { Check, Plus, Send, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Textarea } from "@/components/ui/textarea";
import { useCustomers } from "@/hooks/inventory/useCustomers";
import { useItems } from "@/hooks/inventory/useItems";
import { usePersonnel } from "@/hooks/inventory/usePersonnel";
import { useCreateRequest } from "@/hooks/inventory/useRequests";
import { formatDate, todayInput } from "@/lib/format";
import { cn } from "@/lib/shadcn/utils";

type Row = { itemId: string; qty: string };
type Crew = { key: string; name: string; position: string };

export default function NewRequestPage() {
  const router = useRouter();
  const { data: items = [] } = useItems();
  const { data: customers = [] } = useCustomers();
  const { data: personnel = [] } = usePersonnel();
  const createRequest = useCreateRequest();

  const [poNo, setPoNo] = useState("");
  const [site, setSite] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [neededAt, setNeededAt] = useState(todayInput());
  const [estimatedDoneAt, setEstimatedDoneAt] = useState("");
  const [note, setNote] = useState("");
  const [rows, setRows] = useState<Row[]>([{ itemId: "", qty: "" }]);
  const [picker, setPicker] = useState("");
  const [crew, setCrew] = useState<Crew[]>([]);
  const [manualName, setManualName] = useState("");
  const [manualPosition, setManualPosition] = useState("");

  const chosen = rows.filter((row) => row.itemId);
  const roster = personnel.filter((person) => person.isActive);
  const assigned = crew;

  function toggleCrew(person: { id: string; name: string; position: string }) {
    setCrew((current) =>
      current.some((entry) => entry.key === person.id)
        ? current.filter((entry) => entry.key !== person.id)
        : [
            ...current,
            { key: person.id, name: person.name, position: person.position },
          ],
    );
  }

  function addManual() {
    if (!manualName.trim() || !manualPosition.trim()) {
      toast.error("Nama dan jabatan personel manual wajib diisi.");
      return;
    }
    setCrew((current) => [
      ...current,
      {
        key: `manual-${Date.now()}`,
        name: manualName.trim(),
        position: manualPosition.trim(),
      },
    ]);
    setManualName("");
    setManualPosition("");
  }

  function addRow() {
    if (!picker) return;
    if (rows.some((row) => row.itemId === picker)) {
      toast.error("Item sudah ada di daftar.");
      return;
    }
    setRows((current) => [
      ...current.filter((row) => row.itemId),
      { itemId: picker, qty: "" },
    ]);
    setPicker("");
  }

  async function submit() {
    if (!poNo || !site || !neededAt || !customerId || chosen.length === 0) {
      toast.error(
        "Nomor PO, pelanggan, site, tanggal, dan minimal satu item wajib diisi.",
      );
      return;
    }
    if (chosen.some((row) => Number(row.qty) <= 0)) {
      toast.error("Jumlah item harus lebih dari nol.");
      return;
    }
    if (assigned.length === 0) {
      toast.error("Pilih minimal satu personel untuk surat tugas.");
      return;
    }
    for (const row of chosen) {
      const item = items.find((entry) => entry.id === row.itemId);
      if (!item) continue;
      const available = item.stockGudang - item.onRequest;
      if (Number(row.qty) > available) {
        toast.error(
          `Stok ${item.name} tidak cukup. Tersedia ${available} ${item.unit}.`,
        );
        return;
      }
    }

    await createRequest.mutateAsync({
      poNo,
      site,
      customerId,
      neededAt,
      estimatedDoneAt: estimatedDoneAt || undefined,
      note: note || undefined,
      personnel: assigned.map((person) => ({
        name: person.name,
        position: person.position,
      })),
      items: chosen.map((row) => ({
        itemId: row.itemId,
        qty: Number(row.qty),
      })),
    });

    toast.success("Request dikirim ke Admin.");
    router.push("/requests");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Buat Permintaan Baru"
        description="Isi data pekerjaan, tugaskan personel, lalu pilih item. Permintaan dikirim ke Admin untuk dicek stoknya."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/requests")}
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={submit}
              disabled={createRequest.isPending}
            >
              <Send />
              {createRequest.isPending ? "Mengirim…" : "Kirim Permintaan"}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-4">
          <div className="bg-card border-border flex flex-col gap-4 rounded-xl border p-4">
            <div>
              <p className="text-[13.5px] font-semibold">Informasi Pekerjaan</p>
              <p className="text-muted-foreground text-[11.5px]">
                Data ini dipakai untuk surat jalan dan laporan bulanan.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label className="text-[11.5px]">Nomor PO pelanggan</Label>
                <Input
                  value={poNo}
                  placeholder="PO/2026/0431"
                  onChange={(event) => setPoNo(event.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[11.5px]">Site / lokasi</Label>
                <Input
                  value={site}
                  placeholder="Suralaya, Cilegon"
                  onChange={(event) => setSite(event.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[11.5px]">Pelanggan</Label>
                <SearchableSelect
                  value={customerId}
                  onValueChange={setCustomerId}
                  placeholder="Pilih pelanggan"
                  searchPlaceholder="Cari nama pelanggan…"
                  options={customers
                    .filter((customer) => customer.isActive)
                    .map((customer) => ({
                      value: customer.id,
                      label: customer.name,
                      hint: customer.company ?? undefined,
                    }))}
                  className="w-full"
                />
                {customers.length === 0 ? (
                  <p className="text-muted-foreground text-[10.5px]">
                    Belum ada pelanggan. Minta Admin menambah data pelanggan.
                  </p>
                ) : null}
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[11.5px]">Tanggal dibutuhkan</Label>
                <Input
                  type="date"
                  value={neededAt}
                  onChange={(event) => setNeededAt(event.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[11.5px]">
                  Perkiraan selesai inspeksi
                </Label>
                <Input
                  type="date"
                  value={estimatedDoneAt}
                  onChange={(event) => setEstimatedDoneAt(event.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label className="text-[11.5px]">Catatan untuk Admin</Label>
              <Textarea
                rows={2}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Contoh: untuk radiografi weld joint pipa header unit 3."
              />
            </div>
          </div>

          <div className="bg-card border-border flex flex-col gap-3 rounded-xl border p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-[13.5px] font-semibold">
                  Personel Penugasan
                </p>
                <p className="text-muted-foreground text-[11.5px]">
                  Diambil dari roster Admin. Urutan pilih jadi urutan di surat
                  tugas.
                </p>
              </div>
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium tabular-nums",
                  assigned.length > 0
                    ? "bg-interactive-surface text-accent-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {assigned.length} orang
              </span>
            </div>

            {roster.length === 0 ? (
              <p className="border-border text-muted-foreground rounded-lg border border-dashed px-4 py-4 text-center text-xs">
                Roster belum diisi Admin. Tambahkan personel manual di bawah,
                atau minta Admin mengisi menu Personel.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {roster.map((person) => {
                  const selected = crew.some(
                    (entry) => entry.key === person.id,
                  );
                  const initials = person.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();
                  return (
                    <button
                      key={person.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleCrew(person)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors",
                        selected
                          ? "border-interactive-border bg-interactive-surface"
                          : "border-border hover:bg-muted/60",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                          selected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {initials}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium">
                          {person.name}
                        </span>
                        <span className="text-muted-foreground block truncate text-[10.5px]">
                          {person.position}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border",
                        )}
                      >
                        {selected ? <Check className="size-2.5" /> : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="border-border flex flex-col gap-2 rounded-lg border border-dashed p-3 sm:flex-row sm:items-center">
              <Input
                value={manualName}
                onChange={(event) => setManualName(event.target.value)}
                placeholder="Nama di luar roster"
                aria-label="Nama personel di luar roster"
                className="h-9 text-xs sm:flex-1"
              />
              <Input
                value={manualPosition}
                onChange={(event) => setManualPosition(event.target.value)}
                placeholder="Jabatan"
                aria-label="Jabatan personel di luar roster"
                className="h-9 text-xs sm:w-44"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addManual}
              >
                <Plus />
                Tambah
              </Button>
            </div>
          </div>

          <div className="bg-card border-border flex flex-col gap-3 rounded-xl border p-4">
            <div>
              <p className="text-[13.5px] font-semibold">Item yang Diminta</p>
              <p className="text-muted-foreground text-[11.5px]">
                {chosen.length} item dipilih · tersedia = stok gudang − yang
                sedang diminta.
              </p>
            </div>

            <div className="border-border divide-border divide-y rounded-lg border">
              {chosen.length === 0 ? (
                <p className="text-muted-foreground px-4 py-8 text-center text-xs">
                  Belum ada item dipilih.
                </p>
              ) : (
                chosen.map((row) => {
                  const item = items.find((entry) => entry.id === row.itemId);
                  if (!item) return null;
                  const available = item.stockGudang - item.onRequest;
                  return (
                    <div
                      key={row.itemId}
                      className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:gap-4"
                    >
                      <div className="flex min-w-0 items-start justify-between gap-3 sm:flex-[1.4]">
                        <div className="min-w-0">
                          <p className="text-xs font-medium">{item.name}</p>
                          <p className="text-muted-foreground text-[10.5px]">
                            {item.code} · {item.brand ?? "—"}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="-mt-1 shrink-0 sm:hidden"
                          aria-label={`Hapus ${item.name}`}
                          onClick={() =>
                            setRows((current) =>
                              current.filter(
                                (entry) => entry.itemId !== row.itemId,
                              ),
                            )
                          }
                        >
                          <Trash2 />
                        </Button>
                      </div>

                      <dl className="border-border grid grid-cols-3 gap-2 border-t pt-2.5 sm:flex sm:shrink-0 sm:gap-5 sm:border-t-0 sm:pt-0">
                        {[
                          ["Stok", `${item.stockGudang} ${item.unit}`],
                          ["Di request", `${item.onRequest} ${item.unit}`],
                          ["Tersedia", `${available} ${item.unit}`],
                        ].map(([label, value], index) => (
                          <div key={label}>
                            <dt className="text-muted-foreground text-[10px]">
                              {label}
                            </dt>
                            <dd
                              className={
                                index === 2
                                  ? "text-xs font-medium tabular-nums"
                                  : "text-muted-foreground text-xs tabular-nums"
                              }
                            >
                              {value}
                            </dd>
                          </div>
                        ))}
                      </dl>

                      <div className="flex items-center gap-2 sm:shrink-0">
                        <Label
                          htmlFor={`qty-${row.itemId}`}
                          className="text-[11.5px]"
                        >
                          Jumlah
                        </Label>
                        <Input
                          id={`qty-${row.itemId}`}
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={available}
                          placeholder="0"
                          value={row.qty}
                          onChange={(event) =>
                            setRows((current) =>
                              current.map((entry) =>
                                entry.itemId === row.itemId
                                  ? { ...entry, qty: event.target.value }
                                  : entry,
                              ),
                            )
                          }
                          className="input-number h-9 w-20 px-2 tabular-nums"
                        />
                        <span className="text-muted-foreground text-[11px]">
                          {item.unit}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="ml-auto hidden sm:inline-flex"
                          aria-label={`Hapus ${item.name}`}
                          onClick={() =>
                            setRows((current) =>
                              current.filter(
                                (entry) => entry.itemId !== row.itemId,
                              ),
                            )
                          }
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <SearchableSelect
                value={picker}
                onValueChange={setPicker}
                placeholder="Pilih item untuk ditambahkan…"
                searchPlaceholder="Cari nama atau kode item…"
                options={items.map((item) => ({
                  value: item.id,
                  label: item.name,
                  hint: `${item.code} · stok ${item.stockGudang} ${item.unit}`,
                }))}
                className="w-full sm:flex-1"
              />
              <Button variant="outline" onClick={addRow}>
                <Plus />
                Tambah
              </Button>
            </div>

            <p className="text-muted-foreground text-[10.5px]">
              Jumlah tidak boleh melebihi stok gudang. Bila kebutuhan mendesak,
              tambahkan catatan.
            </p>
          </div>
        </div>

        <div className="flex h-fit flex-col gap-4">
          <div className="bg-card border-border flex flex-col gap-3 rounded-xl border p-4">
            <p className="text-[13.5px] font-semibold">Ringkasan Permintaan</p>
            {[
              ["Nomor PO", poNo || "—"],
              ["Site", site || "—"],
              [
                "Pelanggan",
                customers.find((customer) => customer.id === customerId)
                  ?.name ?? "—",
              ],
              ["Jumlah item", `${chosen.length} item`],
              [
                "Total unit",
                `${chosen.reduce((sum, row) => sum + Number(row.qty || 0), 0)} unit`,
              ],
              ["Dibutuhkan", formatDate(neededAt)],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-start justify-between gap-3 text-[11.5px]"
              >
                <span className="text-muted-foreground">{label}</span>
                <span className="text-right font-medium">{value}</span>
              </div>
            ))}
            <div className="bg-border h-px" />
            <div className="flex items-center justify-between text-[11.5px]">
              <span className="text-muted-foreground">
                Status setelah dikirim
              </span>
              <span className="bg-warning-surface text-warning rounded-full px-2.5 py-0.5 text-[11px] font-medium">
                Menunggu Admin
              </span>
            </div>
          </div>

          <div className="bg-card border-border flex flex-col gap-1 rounded-xl border p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[13.5px] font-semibold">Tim di Surat Tugas</p>
              <span className="text-muted-foreground text-[10.5px] tabular-nums">
                {assigned.length} orang
              </span>
            </div>
            {assigned.length === 0 ? (
              <p className="text-muted-foreground py-3 text-[11.5px]">
                Belum ada personel dipilih.
              </p>
            ) : (
              <ol className="flex flex-col">
                {assigned.map((person, index) => (
                  <li
                    key={person.key}
                    className="border-border flex items-center gap-2.5 border-b py-2 last:border-b-0"
                  >
                    <span className="text-muted-foreground w-4 text-[10.5px] tabular-nums">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11.5px] font-medium">
                        {person.name}
                      </p>
                      <p className="text-muted-foreground truncate text-[10px]">
                        {person.position}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Keluarkan ${person.name}`}
                      onClick={() =>
                        setCrew((current) =>
                          current.filter((entry) => entry.key !== person.key),
                        )
                      }
                      className="text-muted-foreground hover:text-foreground rounded p-1 transition-colors"
                    >
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="bg-card border-border flex flex-col gap-3 rounded-xl border p-4">
            <p className="text-[13.5px] font-semibold">Alur Persetujuan</p>
            {[
              ["1", "Admin memeriksa stok", "Menunggu Admin"],
              ["2", "Direktur menyetujui", "Menunggu Direktur"],
              ["3", "Admin menerbitkan surat jalan", "Surat Jalan"],
            ].map(([number, title, sub]) => (
              <div
                key={number}
                className="bg-muted flex items-center gap-2.5 rounded-lg px-3 py-2"
              >
                <span className="bg-background border-border flex size-5 items-center justify-center rounded-full border text-[10px] font-semibold">
                  {number}
                </span>
                <div>
                  <p className="text-[11.5px] font-medium">{title}</p>
                  <p className="text-muted-foreground text-[10px]">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
