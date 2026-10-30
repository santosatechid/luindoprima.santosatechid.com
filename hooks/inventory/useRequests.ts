"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { CACHE_STRATEGIES } from "@/app/providers";
import { apiGet, apiPatch, apiPost } from "@/lib/http/apiClient";
import type { InventoryRequest } from "@/types/inventory";

export type RequestInput = {
  poNo: string;
  site: string;
  customerId: string;
  neededAt: string;
  estimatedDoneAt?: string;
  note?: string;
  items: { itemId: string; qty: number }[];
};

export type RequestDecision = {
  id: string;
  action?: "approve" | "reject";
  note?: string;
  items?: { id: string; qty: number }[];
};

export const useRequests = () =>
  useQuery({
    queryKey: ["requests"],
    queryFn: async () =>
      (await apiGet<InventoryRequest[]>("/api/requests")).data,
    ...CACHE_STRATEGIES.dynamic,
  });

export const useCreateRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: RequestInput) =>
      (await apiPost<InventoryRequest>("/api/requests", data)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
};

export const useDecideRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: RequestDecision) =>
      (await apiPatch<InventoryRequest>("/api/requests", data)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
};
