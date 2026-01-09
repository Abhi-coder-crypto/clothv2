import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertSavedLook } from "@shared/schema";

export function useLooks() {
  return useQuery({
    queryKey: [api.looks.list.path],
    queryFn: async () => {
      const res = await fetch(api.looks.list.path);
      if (!res.ok) throw new Error("Failed to fetch looks");
      return await res.json();
    },
  });
}

export function useSaveLook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertSavedLook) => {
      const res = await fetch(api.looks.create.path, {
        method: api.looks.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save look");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.looks.list.path] });
    },
  });
}

export function useDeleteLook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.looks.delete.path, { id });
      const res = await fetch(url, {
        method: api.looks.delete.method,
      });
      if (!res.ok) throw new Error("Failed to delete look");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.looks.list.path] });
    },
  });
}
