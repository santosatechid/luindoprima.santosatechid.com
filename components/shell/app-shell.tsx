"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Bell,
  Building2,
  ClipboardCheck,
  ClipboardList,
  FileSpreadsheet,
  Inbox,
  LayoutDashboard,
  LogOut,
  Package,
  RotateCcw,
  Truck,
  Users,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdownMenu";
import { cn } from "@/lib/shadcn/utils";
import { useRequests } from "@/hooks/inventory/useRequests";
import { signOut } from "@/services/auth/authClients";
import type { Role } from "@/types/inventory";

type NavItem = { title: string; url: string; icon: LucideIcon; roles: Role[] };
type NavGroup = { title: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    title: "Utama",
    items: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: LayoutDashboard,
        roles: ["ADMIN", "DIREKTUR", "LEADER"],
      },
      {
        title: "Request & Approval",
        url: "/requests",
        icon: ClipboardList,
        roles: ["ADMIN", "LEADER"],
      },
      {
        title: "Persetujuan",
        url: "/approvals",
        icon: ClipboardCheck,
        roles: ["DIREKTUR"],
      },
    ],
  },
  {
    title: "Gudang",
    items: [
      {
        title: "Barang Masuk",
        url: "/incoming",
        icon: Inbox,
        roles: ["ADMIN"],
      },
      {
        title: "Surat Jalan",
        url: "/delivery-notes",
        icon: Truck,
        roles: ["ADMIN", "DIREKTUR"],
      },
      {
        title: "Turnover",
        url: "/turnover",
        icon: RotateCcw,
        roles: ["LEADER", "ADMIN"],
      },
      {
        title: "Progres Inspeksi",
        url: "/inspections",
        icon: Activity,
        roles: ["ADMIN"],
      },
    ],
  },
  {
    title: "Data",
    items: [
      {
        title: "Pelanggan",
        url: "/customers",
        icon: Building2,
        roles: ["ADMIN", "DIREKTUR", "LEADER"],
      },
      {
        title: "Master Item & Supplier",
        url: "/items",
        icon: Package,
        roles: ["ADMIN"],
      },
      {
        title: "Stok Inventory",
        url: "/stock",
        icon: Warehouse,
        roles: ["DIREKTUR"],
      },
      {
        title: "Laporan",
        url: "/reports",
        icon: FileSpreadsheet,
        roles: ["ADMIN", "DIREKTUR"],
      },
      {
        title: "Pengguna",
        url: "/users",
        icon: Users,
        roles: ["ADMIN"],
      },
    ],
  },
];

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/requests": "Request Barang",
  "/requests/new": "Buat Request",
  "/approvals": "Persetujuan",
  "/incoming": "Barang Masuk",
  "/delivery-notes": "Surat Jalan",
  "/turnover": "Turnover",
  "/inspections": "Progres Inspeksi",
  "/customers": "Pelanggan",
  "/items": "Master Item & Supplier",
  "/stock": "Stok Inventory",
  "/reports": "Laporan",
  "/users": "Manajemen Pengguna",
};

function ApprovalBell({ role }: { role: Role }) {
  const router = useRouter();
  const { data: rows = [] } = useRequests();
  const status =
    role === "ADMIN"
      ? "PENDING_ADMIN"
      : role === "DIREKTUR"
        ? "PENDING_DIRECTOR"
        : null;
  if (!status) return null;

  const pending = rows.filter((row) => row.status === status);
  const href = role === "DIREKTUR" ? "/approvals" : "/requests";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={`Notifikasi persetujuan, ${pending.length} menunggu`}
          className="hover:bg-secondary focus-visible:ring-ring relative flex size-8 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:outline-none"
        >
          <Bell className="size-4" />
          {pending.length > 0 ? (
            <span className="bg-destructive-solid absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9.5px] leading-4 font-semibold text-white">
              {pending.length > 9 ? "9+" : pending.length}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="text-xs">
          Menunggu persetujuan Anda
        </DropdownMenuLabel>
        {pending.length === 0 ? (
          <p className="text-muted-foreground px-2 py-3 text-[11.5px]">
            Tidak ada permintaan yang menunggu.
          </p>
        ) : (
          pending.slice(0, 5).map((row) => (
            <DropdownMenuItem
              key={row.id}
              className="flex-col items-start gap-0.5"
              onClick={() => router.push(href)}
            >
              <span className="text-[12px] font-medium">{row.number}</span>
              <span className="text-muted-foreground text-[10.5px]">
                {row.site} · {row.leader.name} · {row.items.length} item
              </span>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push(href)}>
          <ClipboardCheck />
          Lihat semua permintaan
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({
  user,
  children,
}: {
  user: { id: string; name: string; email: string; role: Role };
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const groups = NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.roles.includes(user.role)),
  })).filter((group) => group.items.length > 0);
  const flat = groups.flatMap((group) => group.items);
  const title =
    Object.entries(TITLES).find(
      ([path]) => pathname === path || pathname.startsWith(`${path}/`),
    )?.[1] ?? "Dashboard";
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="bg-background flex min-h-screen">
      <aside className="bg-sidebar border-border sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r px-3 py-4 md:flex">
        <Link href="/dashboard" className="flex items-center gap-2.5 px-2">
          <Image
            src="/luindo-logo.webp"
            alt="LUINDO Prima"
            width={293}
            height={184}
            priority
            className="h-10 w-auto"
          />
          <span className="flex flex-col">
            <span className="text-[12.5px] font-semibold">NDT Inventory</span>
            <span className="text-muted-foreground text-[10px]">
              PT Luindo Prima
            </span>
          </span>
        </Link>

        <nav className="mt-5 flex flex-1 flex-col gap-4 overflow-y-auto">
          {groups.map((group) => (
            <div key={group.title} className="flex flex-col gap-1">
              <span className="text-muted-foreground px-2.5 text-[10px] font-medium tracking-[0.4px] uppercase">
                {group.title}
              </span>
              {group.items.map((item) => {
                const active =
                  pathname === item.url ||
                  (item.url !== "/dashboard" &&
                    pathname.startsWith(`${item.url}/`));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.url}
                    href={item.url}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[12.5px] transition-colors",
                      active
                        ? "bg-primary text-primary-foreground font-medium"
                        : "text-foreground hover:bg-secondary",
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    {item.title}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="border-border mt-3 flex items-center gap-2.5 border-t px-2 pt-3">
          <Avatar className="size-7">
            <AvatarFallback className="bg-secondary text-[10px] font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium">{user.name}</p>
            <p className="text-muted-foreground text-[10px] capitalize">
              {user.role.toLowerCase()}
            </p>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background border-border sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 text-[12.5px]">
            <Link
              href="/dashboard"
              className="text-muted-foreground hover:text-foreground hidden sm:inline"
            >
              Beranda
            </Link>
            <span className="text-muted-foreground hidden sm:inline">/</span>
            <span className="truncate font-medium">{title}</span>
          </div>

          <div className="flex items-center gap-2">
            <ApprovalBell role={user.role} />
            <Badge variant="outline" className="px-2.5 text-[11px] capitalize">
              {user.role.toLowerCase()}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="focus-visible:ring-ring rounded-full focus-visible:ring-2 focus-visible:outline-none">
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-[10.5px] font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-xs">
                  <span className="block truncate font-medium">
                    {user.name}
                  </span>
                  <span className="text-muted-foreground block truncate font-normal">
                    {user.email}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await signOut();
                    // Data tiap peran (leader lain) tidak boleh ikut ke sesi berikutnya.
                    queryClient.clear();
                    router.push("/auth/signIn");
                    router.refresh();
                  }}
                >
                  <LogOut />
                  Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <nav className="border-border flex flex-wrap gap-1 border-b px-3 py-2 md:hidden">
          {flat.map((item) => {
            const active = pathname === item.url;
            const Icon = item.icon;
            return (
              <Link
                key={item.url}
                href={item.url}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11.5px]",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground",
                )}
              >
                <Icon className="size-3.5" />
                {item.title}
              </Link>
            );
          })}
        </nav>

        <main className="mx-auto w-full max-w-[1320px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
