import {
  ArrowRight,
  CheckCheck,
  ClipboardList,
  FileText,
  Stamp,
  Truck,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/shadcn/utils";
import type { DashboardData } from "@/types/inventory";

type Pipeline = DashboardData["pipeline"];

const STAGES: {
  key: keyof Pipeline;
  label: string;
  hint: string;
  icon: LucideIcon;
}[] = [
  {
    key: "pendingAdmin",
    label: "Request",
    hint: "Diajukan Leader, menunggu verifikasi Admin.",
    icon: FileText,
  },
  {
    key: "pendingDirector",
    label: "Approval direktur",
    hint: "Sudah dicek Admin, menunggu persetujuan Direktur.",
    icon: Stamp,
  },
  {
    key: "readyToShip",
    label: "Surat jalan",
    hint: "Disetujui Direktur, menunggu surat jalan terbit.",
    icon: ClipboardList,
  },
  {
    key: "onSite",
    label: "Di site",
    hint: "Barang dibawa ke site, menunggu turnover.",
    icon: Truck,
  },
  {
    key: "completed",
    label: "Selesai",
    hint: "Turnover diverifikasi, stok sudah kembali.",
    icon: CheckCheck,
  },
];

function CrossMark({ className }: { className: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 12 12"
      className={cn(
        "text-navy-muted pointer-events-none absolute size-3",
        className,
      )}
    >
      <path d="M6 0v12M0 6h12" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

export function RequestPipeline({ pipeline }: { pipeline: Pipeline }) {
  const stages = STAGES.map((stage) => ({
    ...stage,
    value: pipeline[stage.key],
  }));
  const total = stages.reduce((sum, stage) => sum + stage.value, 0);
  const active = stages.slice(0, -1);
  const busiest = Math.max(...active.map((stage) => stage.value));
  const busiestIndex = busiest > 0 ? active.findIndex((s) => s.value === busiest) : -1;

  return (
    <section aria-labelledby="request-pipeline-title" className="relative">
      <CrossMark className="-top-1.5 -left-1.5" />
      <CrossMark className="-top-1.5 -right-1.5" />
      <CrossMark className="-bottom-1.5 -left-1.5" />
      <CrossMark className="-bottom-1.5 -right-1.5" />

      <div className="border-navy-border bg-navy overflow-hidden rounded-xl border">
        <div className="border-navy-border flex items-center justify-between gap-3 border-b px-5 py-3">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h2
              id="request-pipeline-title"
              className="text-navy-foreground text-[13px] font-semibold"
            >
              Alur request
            </h2>
            <p className="text-navy-muted text-[11px]">
              {total > 0
                ? `${total} request tercatat, dari pengajuan sampai selesai`
                : "Belum ada request tercatat"}
            </p>
          </div>
          <Link
            href="/requests"
            className="text-navy-muted hover:text-navy-foreground focus-visible:outline-ring inline-flex shrink-0 items-center gap-1 rounded text-[11px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Buka request
            <ArrowRight className="size-3.5" />
          </Link>
        </div>

        <div
          tabIndex={0}
          aria-label="Alur request, geser ke samping untuk melihat semua tahap"
          className="focus-visible:outline-ring overflow-x-auto focus-visible:outline-2 focus-visible:-outline-offset-2"
        >
          <ol className="divide-navy-border grid min-w-[860px] grid-cols-5 divide-x">
            {stages.map((stage, index) => {
              const percent = total
                ? Math.round((stage.value / total) * 100)
                : 0;
              const done = stage.key === "completed";
              const isBusiest = index === busiestIndex;

              return (
                <li
                  key={stage.key}
                  className="flex min-w-0 flex-col gap-5 p-5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="border-navy-border flex size-9 shrink-0 items-center justify-center rounded-md border bg-white/[0.04]">
                      <stage.icon
                        className="text-navy-accent size-[15px]"
                        strokeWidth={1.75}
                      />
                    </span>
                    {isBusiest ? (
                      <span className="border-navy-border text-navy-muted rounded-full border px-2 py-0.5 text-[10px] leading-4">
                        Terbanyak
                      </span>
                    ) : null}
                  </div>

                  <div>
                    <p className="text-navy-foreground text-[13px] font-semibold tracking-[-0.1px]">
                      {stage.label}
                    </p>
                    <p className="text-navy-muted mt-1 text-[11px] leading-[1.45]">
                      {stage.hint}
                    </p>
                  </div>

                  <div className="mt-auto flex flex-col gap-2">
                    <p className="text-navy-muted flex items-center gap-1.5 text-[10.5px]">
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          stage.value > 0
                            ? "bg-navy-accent"
                            : "bg-navy-muted/40",
                        )}
                      />
                      {done
                        ? stage.value > 0
                          ? "Selesai"
                          : "Belum ada"
                        : stage.value > 0
                          ? "Dalam proses"
                          : "Kosong"}
                    </p>
                    <p className="flex items-baseline gap-1.5">
                      <span className="text-navy-foreground text-[27px] leading-none font-medium tracking-[-0.6px] tabular-nums">
                        {stage.value}
                      </span>
                      <span className="text-navy-muted text-[10.5px]">
                        request
                      </span>
                    </p>
                    <div
                      aria-hidden
                      className="h-[3px] w-full overflow-hidden rounded-full bg-white/10"
                    >
                      <div
                        className="bg-navy-accent h-full rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <p className="text-navy-muted text-[10px] tabular-nums">
                      {percent}% dari alur
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
