"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { CACHE_STRATEGIES } from "@/app/providers";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/http/apiClient";
import type { Item, ItemCategory, Supplier } from "@/types/inventory";

export type ItemInput = {
  id?: string;
  name: string;
  categoryId: string;
  brand?: string;
  size?: string;
  unit: string;
  stockGudang?: number;
  minStock?: number;
  supplierId?: string | null;
};

export type ItemCategoryInput = {
  id?: string;
  code: string;
  name: string;
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

export const useItemCategories = () =>
  useQuery({
    queryKey: ["item-categories"],
    queryFn: async () =>
      (await apiGet<ItemCategory[]>("/api/item-categories")).data,
    ...CACHE_STRATEGIES.static,
  });

export const useCreateItemCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: ItemCategoryInput) =>
      (await apiPost<ItemCategory>("/api/item-categories", data)).data,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["item-categories"] }),
  });
};

export const useUpdateItemCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: ItemCategoryInput) =>
      (await apiPut<ItemCategory>("/api/item-categories", data)).data,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["item-categories"] }),
  });
};

export const useDeleteItemCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (
        await apiDelete<ItemCategory>("/api/item-categories", {
          body: JSON.stringify({ id }),
        })
      ).data,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["item-categories"] }),
  });
};

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
      queryClient.invalidateQueries({ queryKey: ["item-categories"] });
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
      queryClient.invalidateQueries({ queryKey: ["item-categories"] });
    },
  });
};

export const useDeleteItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await apiDelete<Item>("/api/items", { body: JSON.stringify({ id }) }))
        .data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["item-categories"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
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

export const useDeleteSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (
        await apiDelete<Supplier>("/api/suppliers", {
          body: JSON.stringify({ id }),
        })
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
};
