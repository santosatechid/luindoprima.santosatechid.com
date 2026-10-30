"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { CACHE_STRATEGIES } from "@/app/providers";
import { apiGet, apiPatch, apiPost } from "@/lib/http/apiClient";
import type { Turnover } from "@/types/inventory";

export type TurnoverInput = {
  deliveryNoteId: string;
  note?: string;
  items: {
    itemId: string;
    brought: number;
    used: number;
    returned: number;
    damaged: number;
  }[];
};

export const useTurnovers = () =>
  useQuery({
    queryKey: ["turnovers"],
    queryFn: async () => (await apiGet<Turnover[]>("/api/turnovers")).data,
    ...CACHE_STRATEGIES.dynamic,
  });

export const useCreateTurnover = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: TurnoverInput) =>
      (await apiPost<Turnover>("/api/turnovers", data)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["turnovers"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-notes"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
};

export const useVerifyTurnover = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (
        await apiPatch<Turnover>("/api/turnovers", {
          id,
          action: "verify",
        })
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["turnovers"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-notes"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
};
