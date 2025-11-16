import { createProtectedHandler } from '../_shared/base-handler.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

interface DeleteUserRequest {
  userId: string;
}

// P0 FIX: Convertido para createProtectedHandler com verificação admin
// Deletar usuários é operação crítica que requer admin
Deno.serve(createProtectedHandler({
  functionName: 'delete-user',
  requireAuth: true,
  enableRateLimit: false,
  
  handler: async (req, { supabase, user }) => {
    // 🔒 Verificar se usuário é admin
    const { data: roleData, error: roleError } = await supabase.rpc('has_role', {
      _user_id: user!.id,
      _role: 'admin'
    });

    if (roleError || !roleData) {
      console.error('❌ User is not admin', { userId: user!.id });
      throw new Error('Forbidden: Admin role required');
    }

    // Create admin client for user deletion
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { userId }: DeleteUserRequest = await req.json();

    if (!userId) {
      throw new Error('userId is required');
    }

    // Prevent self-deletion
    if (userId === user!.id) {
      throw new Error('Cannot delete your own account');
    }

    // Delete user from auth.users (this will cascade delete related data due to foreign keys)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('❌ Error deleting user:', deleteError);
      throw new Error(`Failed to delete user: ${deleteError.message}`);
    }

    // Log the deletion for security audit
    await supabaseAdmin.from('security_logs').insert({
      user_id: user!.id,
      event_type: 'user_deleted',
      event_description: `Admin deleted user ${userId}`,
      severity: 'info',
      details: { deleted_user_id: userId }
    });

    console.log(`✅ User ${userId} deleted successfully by admin ${user!.id}`);

    return { success: true, message: 'User deleted successfully' };
  }
}));
