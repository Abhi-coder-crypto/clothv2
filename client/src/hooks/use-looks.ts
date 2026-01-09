import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type InsertSavedLook } from "@shared/routes";
import { z } from "zod";

// Create a local schema for validation to avoid type errors
const savedLookSelectSchema = z.object({
  id: z.number(),
  imageUrl: z.string(),
  createdAt: z.string().optional().or(z.date().optional()),
});

export function useLooks() {
  return useQuery({
    queryKey: [api.looks.list.path],
    queryFn: async () => {
      const res = await fetch(api.looks.list.path);
      if (!res.ok) throw new Error("Failed to fetch looks");
      const data = await res.json();
      // Ensure we're returning the raw data to match the expected usage in components
      return data;
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
      return api.looks.create.responses[201].parse(await res.json());
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
      return api.looks.delete.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.looks.list.path] });
    },
  });
}
