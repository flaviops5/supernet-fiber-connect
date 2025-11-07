import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useUserRole = () => {
  const query = useQuery({
    queryKey: ["user-role"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('🔐 useUserRole - User:', user?.email, user?.id);
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
        if (await checkRole("admin")) {
          console.log('✅ useUserRole - Role: admin');
          return { role: "admin" as const };
        }
        if (await checkRole("gestor")) {
          console.log('✅ useUserRole - Role: gestor');
          return { role: "gestor" as const };
        }
        if (await checkRole("editor")) {
          console.log('✅ useUserRole - Role: editor');
          return { role: "editor" as const };
        }
        console.log('⚠️ useUserRole - Role: viewer (default)');
        return { role: "viewer" as const };
      } catch (e) {
        console.error('❌ useUserRole - RPC failed, using fallback:', e);
        // Fallback to direct table read if RPC fails
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();
        console.log('🔄 useUserRole - Fallback role:', data?.role || 'viewer');
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
