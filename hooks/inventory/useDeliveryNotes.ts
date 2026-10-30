"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { CACHE_STRATEGIES } from "@/app/providers";
import { apiGet, apiPatch, apiPost } from "@/lib/http/apiClient";
import type { DeliveryNote } from "@/types/inventory";

export const useDeliveryNotes = () =>
  useQuery({
    queryKey: ["delivery-notes"],
    queryFn: async () =>
      (await apiGet<DeliveryNote[]>("/api/delivery-notes")).data,
    ...CACHE_STRATEGIES.dynamic,
  });

export const useCreateDeliveryNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { requestId: string; vehicle?: string }) =>
      (await apiPost<DeliveryNote>("/api/delivery-notes", data)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-notes"] });
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
};

export const useConfirmDeliveryNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (
        await apiPatch<DeliveryNote>("/api/delivery-notes", {
          id,
          action: "confirm",
        })
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-notes"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["turnovers"] });
    },
  });
};
