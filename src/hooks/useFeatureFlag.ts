import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';

type FeatureFlagRow = Database['public']['Tables']['feature_flags']['Row'];
type FeatureFlagInsert = Database['public']['Tables']['feature_flags']['Insert'];
type FeatureFlagUpdate = Database['public']['Tables']['feature_flags']['Update'];

export const useFeatureFlag = (flagKey: string) => {
  return useQuery({
    queryKey: ['feature-flag', flagKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .eq('flag_key', flagKey)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as FeatureFlagRow | null;
    },
  });
};

export const useFeatureFlags = () => {
  return useQuery({
    queryKey: ['feature-flags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as FeatureFlagRow[];
    },
  });
};

export const useIsFeatureEnabled = (flagKey: string, userId?: string) => {
  return useQuery({
    queryKey: ['feature-enabled', flagKey, userId],
    queryFn: async () => {
      const { data: flag } = await supabase
        .from('feature_flags')
        .select('*')
        .eq('flag_key', flagKey)
        .single();

      if (!flag || !flag.enabled) return false;
      if (flag.rollout_percentage >= 100) return true;

      // Check if user is in target list (needs proper type handling)
      // Target users is stored as TEXT[] in DB
      
      if (userId) {
        const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const userPercentage = hash % 100;
        return userPercentage < flag.rollout_percentage;
      }

      return false;
    },
  });
};

export const useUpdateFeatureFlag = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: FeatureFlagUpdate }) => {
      const { error } = await supabase
        .from('feature_flags')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      toast({
        title: 'Feature flag atualizada',
        description: 'A configuração foi salva com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useCreateFeatureFlag = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (flag: FeatureFlagInsert) => {
      const { error } = await supabase
        .from('feature_flags')
        .insert([flag]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      toast({
        title: 'Feature flag criada',
        description: 'A nova flag foi criada com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
