import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { BlogPostRow } from "@/types/blog.types";

export function useBlogPosts(): { 
  data: BlogPostRow[] | undefined; 
  isLoading: boolean; 
  error: Error | null;
} {
  const query = useQuery({
    queryKey: ["blog_posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return data as BlogPostRow[];
    }
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: (query.error as Error | null) ?? null
  };
}

export function useBlogPost(slug: string | undefined): { 
  data: BlogPostRow | null; 
  isLoading: boolean; 
  error: Error | null;
} {
  const query = useQuery({
    queryKey: ["blog_post", slug],
    enabled: Boolean(slug),
    queryFn: async () => {
      if (!slug) return null;

      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data as BlogPostRow | null;
    }
  });

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: (query.error as Error | null) ?? null
  };
}
