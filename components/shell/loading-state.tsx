import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/shadcn/utils";

export function TableSkeleton({
  rows = 6,
  columns = 6,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("flex flex-col", className)}
      aria-busy="true"
      aria-label="Memuat data"
    >
      <div className="bg-muted/60 flex items-center gap-4 px-4 py-3">
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton
            key={index}
            className={cn("h-3", index === 0 ? "w-24" : "w-full max-w-32")}
          />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, row) => (
        <div
          key={row}
          className="border-border flex items-center gap-4 border-t px-4 py-3.5"
        >
          {Array.from({ length: columns }).map((__, column) => (
            <Skeleton
              key={column}
              className={cn(
                "h-3.5",
                column === 0 ? "w-24" : "w-full max-w-36",
                column === columns - 1 && "ml-auto w-16",
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton({
  stats = 0,
  columns = 5,
  rows = 6,
}: {
  stats?: number;
  columns?: number;
  rows?: number;
}) {
  return (
    <div className="flex flex-col gap-5" aria-busy="true">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-52" />
        <Skeleton className="h-3.5 w-80 max-w-full" />
      </div>
      {stats > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: stats }).map((_, index) => (
            <div
              key={index}
              className="bg-card border-border flex flex-col gap-2 rounded-xl border p-4"
            >
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-20" />
            </div>
          ))}
        </div>
      ) : null}
      <div className="bg-card border-border overflow-hidden rounded-xl border">
        <TableSkeleton rows={rows} columns={columns} />
      </div>
    </div>
  );
}
