"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { CACHE_STRATEGIES } from "@/app/providers";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/http/apiClient";
import type { Personnel } from "@/types/inventory";

export type PersonnelInput = {
  id?: string;
  name: string;
  position: string;
  isActive?: boolean;
};

export const usePersonnel = () =>
  useQuery({
    queryKey: ["personnel"],
    queryFn: async () => (await apiGet<Personnel[]>("/api/personnel")).data,
    ...CACHE_STRATEGIES.dynamic,
  });

export const useCreatePersonnel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: PersonnelInput) =>
      (await apiPost<Personnel>("/api/personnel", data)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personnel"] });
    },
  });
};

export const useUpdatePersonnel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: PersonnelInput) =>
      (await apiPut<Personnel>("/api/personnel", data)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personnel"] });
    },
  });
};

export const useDeactivatePersonnel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (
        await apiDelete<Personnel>("/api/personnel", {
          body: JSON.stringify({ id }),
        })
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personnel"] });
    },
  });
};
