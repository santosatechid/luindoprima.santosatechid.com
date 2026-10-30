"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { CACHE_STRATEGIES } from "@/app/providers";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/http/apiClient";
import type { Item, Supplier } from "@/types/inventory";

export type ItemInput = {
  id?: string;
  code: string;
  name: string;
  category: string;
  brand?: string;
  size?: string;
  unit: string;
  stockGudang?: number;
  minStock?: number;
  supplierId?: string | null;
};

export type SupplierInput = {
  id?: string;
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
  address?: string;
  isActive?: boolean;
};

export const useItems = (options?: { staleTime?: number }) =>
  useQuery({
    queryKey: ["items"],
    queryFn: async () => (await apiGet<Item[]>("/api/items")).data,
    ...CACHE_STRATEGIES.dynamic,
    ...options,
  });

export const useSuppliers = () =>
  useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => (await apiGet<Supplier[]>("/api/suppliers")).data,
    ...CACHE_STRATEGIES.static,
  });

export const useCreateItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: ItemInput) =>
      (await apiPost<Item>("/api/items", data)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
};

export const useUpdateItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: ItemInput) =>
      (await apiPut<Item>("/api/items", data)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
};

export const useDeactivateItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await apiDelete<Item>("/api/items", { body: JSON.stringify({ id }) }))
        .data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["items"] }),
  });
};

export const useCreateSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: SupplierInput) =>
      (await apiPost<Supplier>("/api/suppliers", data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
  });
};

export const useUpdateSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: SupplierInput) =>
      (await apiPut<Supplier>("/api/suppliers", data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
  });
};
