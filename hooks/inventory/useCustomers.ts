"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { CACHE_STRATEGIES } from "@/app/providers";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/http/apiClient";
import type { Customer } from "@/types/inventory";

export type CustomerInput = {
  id?: string;
  name: string;
  company?: string;
  contact?: string;
  phone?: string;
  email?: string;
  address?: string;
  note?: string;
  isActive?: boolean;
};

export type CustomerDetail = Customer & {
  requests: {
    id: string;
    number: string;
    poNo: string;
    site: string;
    status: string;
    createdAt: string;
    neededAt: string;
    leader: { id: string; name: string };
    items: {
      id: string;
      qty: number;
      item: {
        id: string;
        code: string;
        name: string;
        size: string | null;
        unit: string;
        stockGudang: number;
      };
    }[];
    delivery: {
      id: string;
      number: string;
      status: string;
      issuedAt: string;
      items: {
        id: string;
        qty: number;
        item: {
          id: string;
          code: string;
          name: string;
          size: string | null;
          unit: string;
          stockGudang: number;
          minStock: number;
        };
      }[];
      turnover: {
        id: string;
        status: string;
        items: {
          id: string;
          used: number;
          returned: number;
          damaged: number;
          item: {
            id: string;
            code: string;
            name: string;
            size: string | null;
            unit: string;
            stockGudang: number;
            minStock: number;
          };
        }[];
      } | null;
    } | null;
  }[];
};

export const useCustomers = () =>
  useQuery({
    queryKey: ["customers"],
    queryFn: async () => (await apiGet<Customer[]>("/api/customers")).data,
    ...CACHE_STRATEGIES.dynamic,
  });

export const useCustomer = (id: string) =>
  useQuery({
    queryKey: ["customers", id],
    queryFn: async () =>
      (await apiGet<CustomerDetail>(`/api/customers/${id}`)).data,
    enabled: Boolean(id),
    ...CACHE_STRATEGIES.dynamic,
  });

export const useCreateCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CustomerInput) =>
      (await apiPost<Customer>("/api/customers", data)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["requests"] });
    },
  });
};

export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CustomerInput) =>
      (await apiPut<Customer>("/api/customers", data)).data,
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customers", updated.id] });
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-notes"] });
    },
  });
};

export const useDeactivateCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await apiDelete<Customer>("/api/customers", { body: JSON.stringify({ id }) }))
        .data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["requests"] });
    },
  });
};
