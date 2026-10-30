"use client";

import {
  Bar,
  BarChart,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { ItemUsage, ItemUsageBreakdown } from "@/types/inventory";

const COLORS = [
  "var(--chart-1)",
  "var(--chart-3)",
  "var(--info-solid)",
  "var(--caution-solid)",
  "var(--chart-2)",
  "var(--destructive-solid)",
  "var(--primary)",
];

const topItemsConfig = {
  qty: { label: "Unit keluar", color: "var(--chart-1)" },
} satisfies ChartConfig;

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="text-muted-foreground flex h-[220px] items-center justify-center text-center text-xs">
      {message}
    </div>
  );
}

function truncate(value: string, max = 17) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export function TopItemsChart({ items }: { items: ItemUsage[] }) {
  return (
    <div className="bg-card border-border flex min-w-0 flex-col gap-4 rounded-xl border p-4">
      <div>
        <p className="text-[13.5px] font-semibold">Barang Paling Banyak Dipakai</p>
        <p className="text-muted-foreground text-[11.5px]">
          Total unit keluar ke pelanggan dari surat jalan terkonfirmasi
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyChart message="Belum ada barang keluar yang terkonfirmasi." />
      ) : (
        <ChartContainer
          config={topItemsConfig}
          className="aspect-auto h-[300px] w-full"
        >
          <BarChart
            data={items}
            layout="vertical"
            margin={{ top: 4, right: 40, bottom: 4, left: 0 }}
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={132}
              interval={0}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value: string) => truncate(value, 22)}
            />
            <ChartTooltip
              cursor={{ fill: "var(--muted)" }}
              content={<ChartTooltipContent />}
            />
            <Bar
              dataKey="qty"
              fill="var(--color-qty)"
              barSize={20}
              radius={[0, 4, 4, 0]}
            >
              <LabelList
                dataKey="qty"
                position="right"
                fill="var(--foreground)"
                fontSize={11}
                formatter={(value) => Number(value).toLocaleString("id-ID")}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      )}
    </div>
  );
}

export function UsageByLeaderCustomerChart({
  items,
}: {
  items: ItemUsageBreakdown[];
}) {
  const totals = new Map<
    string,
    { leader: string; customer: string; qty: number }
  >();

  for (const item of items) {
    for (const group of item.groups) {
      const key = `${group.leader}|${group.customer}`;
      const current = totals.get(key);
      totals.set(key, {
        leader: group.leader,
        customer: group.customer,
        qty: (current?.qty ?? 0) + group.qty,
      });
    }
  }

  const series = [...totals.values()]
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 7);
  const seriesIndex = new Map(
    series.map((row, index) => [`${row.leader}|${row.customer}`, index]),
  );

  const chartData = items.map((item) => {
    const row: Record<string, string | number> = { name: item.name };
    let rest = 0;

    for (const group of item.groups) {
      const index = seriesIndex.get(`${group.leader}|${group.customer}`);
      if (index === undefined) {
        rest += group.qty;
        continue;
      }
      const key = `series-${index}`;
      row[key] = Number(row[key] ?? 0) + group.qty;
    }

    if (rest > 0) row.rest = rest;
    return row;
  });

  const config: ChartConfig = {};
  for (const [index, row] of series.entries()) {
    config[`series-${index}`] = {
      label: `${row.leader} → ${row.customer}`,
      color: COLORS[index % COLORS.length],
    };
  }
  config.rest = { label: "Lainnya", color: "var(--tertiary-solid)" };

  const hasRest = chartData.some((row) => row.rest);

  return (
    <div className="bg-card border-border flex min-w-0 flex-col gap-4 rounded-xl border p-4">
      <div>
        <p className="text-[13.5px] font-semibold">
          Pemakaian per Leader &amp; Pelanggan
        </p>
        <p className="text-muted-foreground text-[11.5px]">
          Komposisi barang terbanyak menurut leader dan pelanggan tujuan
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyChart message="Belum ada data leader dan pelanggan untuk ditampilkan." />
      ) : (
        <ChartContainer
          config={config}
          className="aspect-auto h-[300px] w-full"
        >
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 24, bottom: 4, left: 0 }}
          >
            <XAxis type="number" axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="name"
              width={132}
              interval={0}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value: string) => truncate(value, 22)}
            />
            <ChartTooltip
              cursor={{ fill: "var(--muted)" }}
              content={<ChartTooltipContent />}
            />
            {series.map((row, index) => (
              <Bar
                key={`${row.leader}|${row.customer}`}
                dataKey={`series-${index}`}
                stackId="usage"
                fill={`var(--color-series-${index})`}
                barSize={12}
              />
            ))}
            {hasRest ? (
              <Bar
                dataKey="rest"
                stackId="usage"
                fill="var(--color-rest)"
                barSize={12}
              />
            ) : null}
            <ChartLegend
              content={
                <ChartLegendContent className="flex-wrap justify-start gap-x-4 gap-y-2" />
              }
            />
          </BarChart>
        </ChartContainer>
      )}
    </div>
  );
}
