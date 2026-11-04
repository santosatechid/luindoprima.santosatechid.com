"use client";

import { useQuery } from "@tanstack/react-query";

import { CACHE_STRATEGIES } from "@/app/providers";
import { apiGet } from "@/lib/http/apiClient";
import type { NotificationLog } from "@/types/inventory";

export const useNotifications = () =>
  useQuery({
    queryKey: ["notifications"],
    queryFn: async () =>
      (await apiGet<NotificationLog[]>("/api/notifications")).data,
    ...CACHE_STRATEGIES.dynamic,
  });
