"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { CACHE_STRATEGIES } from "@/app/providers";
import { apiGet, apiPost } from "@/lib/http/apiClient";
import type { Incoming } from "@/types/inventory";

export type IncomingInput = {
  supplierId: string;
  receivedAt: string;
  documentNo?: string;
  note?: string;
  items: { itemId: string; qty: number }[];
};

export const useIncoming = () =>
  useQuery({
    queryKey: ["incoming"],
    queryFn: async () => (await apiGet<Incoming[]>("/api/incoming")).data,
    ...CACHE_STRATEGIES.dynamic,
  });

export const useCreateIncoming = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: IncomingInput) =>
      (await apiPost<Incoming>("/api/incoming", data)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incoming"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
};
