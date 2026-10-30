"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { CACHE_STRATEGIES } from "@/app/providers";
import { apiGet, apiPatch, apiPost } from "@/lib/http/apiClient";
import type { AppUser, Role } from "@/types/inventory";

export type UserInput = {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: Role;
};

export type UserUpdate = {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: Role;
  banned?: boolean;
  password?: string;
};

export const useUsers = () =>
  useQuery({
    queryKey: ["users"],
    queryFn: async () => (await apiGet<AppUser[]>("/api/users")).data,
    ...CACHE_STRATEGIES.static,
  });

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UserInput) =>
      (await apiPost<AppUser>("/api/users", data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UserUpdate) =>
      (await apiPatch<AppUser>("/api/users", data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
};
