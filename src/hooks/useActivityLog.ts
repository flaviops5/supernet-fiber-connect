import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ActivityLog {
  id: string;
  activity_type: string;
  activity_description: string;
  ip_address?: unknown;
  user_agent?: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  user_id: string;
}

export const useActivityLog = () => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);

  const logActivity = async (
    activityType: string,
    description: string,
    metadata: Record<string, unknown> = {}
  ) => {
    try {
      await supabase.rpc('log_user_activity', {
        activity_type: activityType,
        activity_description: description,
        metadata_param: metadata as never
      });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  const loadActivities = async (limit: number = 50) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setActivities((data || []) as ActivityLog[]);
    } catch (error) {
      console.error('Error loading activities:', error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (activityType: string): string => {
    switch (activityType) {
      case 'profile_update':
        return '👤';
      case 'password_change':
        return '🔒';
      case 'avatar_upload':
        return '📷';
      case 'avatar_remove':
        return '🗑️';
      case 'email_change':
        return '📧';
      case 'phone_update':
        return '📱';
      case 'login':
        return '🔑';
      case 'logout':
        return '🚪';
      default:
        return '📝';
    }
  };

  const getActivityColor = (activityType: string): string => {
    switch (activityType) {
      case 'profile_update':
      case 'phone_update':
        return 'text-blue-600';
      case 'password_change':
        return 'text-red-600';
      case 'avatar_upload':
        return 'text-green-600';
      case 'avatar_remove':
        return 'text-orange-600';
      case 'email_change':
        return 'text-purple-600';
      case 'login':
        return 'text-emerald-600';
      case 'logout':
        return 'text-gray-600';
      default:
        return 'text-gray-500';
    }
  };

  const formatActivityTime = (createdAt: string): string => {
    const date = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'agora mesmo';
    if (diffMins < 60) return `há ${diffMins} min`;
    if (diffHours < 24) return `há ${diffHours}h`;
    if (diffDays < 7) return `há ${diffDays} dias`;
    
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return {
    activities,
    loading,
    logActivity,
    loadActivities,
    getActivityIcon,
    getActivityColor,
    formatActivityTime
  };
};