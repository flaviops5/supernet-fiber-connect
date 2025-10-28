import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useUserRole = () => {
  const query = useQuery({
    queryKey: ["user-role"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { role: "viewer" as const };

      // Prefer RPC to avoid RLS recursion and minimize queries
      const checkRole = async (r: "admin" | "editor" | "viewer" | "gestor") => {
        const { data, error } = await supabase.rpc("has_role", {
          _user_id: user.id,
          _role: r,
        });
        if (error) throw error;
        return data === true;
      };

      // Try admin -> gestor -> editor -> viewer
      try {
        if (await checkRole("admin")) return { role: "admin" as const };
        if (await checkRole("gestor")) return { role: "gestor" as const };
        if (await checkRole("editor")) return { role: "editor" as const };
        return { role: "viewer" as const };
      } catch (e) {
        // Fallback to direct table read if RPC fails
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();
        return { role: (data?.role as "admin" | "editor" | "viewer" | "gestor") || "viewer" };
      }
    },
    retry: 2,
    staleTime: 2 * 60 * 1000,
  });

  return {
    role: query.data?.role ?? "viewer",
    isLoading: query.isLoading,
    error: query.error,
  };
};
