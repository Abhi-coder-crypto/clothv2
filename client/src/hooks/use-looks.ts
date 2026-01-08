import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type InsertSavedLook } from "@shared/routes";

export function useLooks() {
  return useQuery({
    queryKey: [api.looks.list.path],
    queryFn: async () => {
      const res = await fetch(api.looks.list.path);
      if (!res.ok) throw new Error("Failed to fetch looks");
      return api.looks.list.responses[200].parse(await res.json());
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
