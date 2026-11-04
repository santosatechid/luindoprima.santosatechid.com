import { cn } from "@/lib/shadcn/utils";

const STYLES: Record<string, { label: string; className: string; dot: string }> = {
  PENDING_ADMIN: {
    label: "Menunggu Admin",
    className: "bg-warning-surface text-warning border-warning-border",
    dot: "bg-warning-solid",
  },
  PENDING_DIRECTOR: {
    label: "Menunggu Direktur",
    className: "bg-warning-surface text-warning border-warning-border",
    dot: "bg-warning-solid",
  },
  APPROVED: {
    label: "Disetujui",
    className: "bg-success-surface text-success border-success-border",
    dot: "bg-success-solid",
  },
  REJECTED: {
    label: "Ditolak",
    className:
      "bg-destructive-surface text-destructive-strong border-destructive-border",
    dot: "bg-destructive-solid",
  },
  COMPLETED: {
    label: "Selesai",
    className: "bg-secondary text-muted-foreground border-border",
    dot: "bg-muted-foreground",
  },
  ISSUED: {
    label: "Diterbitkan",
    className: "bg-info-surface text-info border-info-border",
    dot: "bg-info-solid",
  },
  CONFIRMED: {
    label: "Dibawa",
    className: "bg-info-surface text-info border-info-border",
    dot: "bg-info-solid",
  },
  SUBMITTED: {
    label: "Menunggu Verifikasi",
    className: "bg-warning-surface text-warning border-warning-border",
    dot: "bg-warning-solid",
  },
  VERIFIED: {
    label: "Terverifikasi",
    className: "bg-success-surface text-success border-success-border",
    dot: "bg-success-solid",
  },
  DRAFT: {
    label: "Draft",
    className: "bg-secondary text-muted-foreground border-border",
    dot: "bg-muted-foreground",
  },
  SAFE: {
    label: "Aman",
    className: "bg-success-surface text-success border-success-border",
    dot: "bg-success-solid",
  },
  LOW: {
    label: "Menipis",
    className: "bg-warning-surface text-warning border-warning-border",
    dot: "bg-warning-solid",
  },
  EMPTY: {
    label: "Habis",
    className:
      "bg-destructive-surface text-destructive-strong border-destructive-border",
    dot: "bg-destructive-solid",
  },
  SENT: {
    label: "Terkirim",
    className: "bg-success-surface text-success border-success-border",
    dot: "bg-success-solid",
  },
  FAILED: {
    label: "Gagal",
    className:
      "bg-destructive-surface text-destructive-strong border-destructive-border",
    dot: "bg-destructive-solid",
  },
  SKIPPED: {
    label: "Dilewati",
    className: "bg-warning-surface text-warning border-warning-border",
    dot: "bg-warning-solid",
  },
};

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: string;
  label?: string;
  className?: string;
}) {
  const style = STYLES[status] ?? STYLES.DRAFT;
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap",
        style.className,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", style.dot)} />
      {label ?? style.label}
    </span>
  );
}
