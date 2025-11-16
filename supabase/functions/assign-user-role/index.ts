import { createProtectedHandler } from '../_shared/base-handler.ts';

interface AssignRoleRequest {
  userId: string;
  role: 'admin' | 'editor' | 'viewer';
}

// P0 FIX: Convertido para createProtectedHandler com verificação admin
// Atribuição de roles é operação crítica de segurança
Deno.serve(createProtectedHandler({
  functionName: 'assign-user-role',
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

    // Parse request body
    const { userId, role }: AssignRoleRequest = await req.json();

    if (!userId || !role) {
      throw new Error('Missing userId or role');
    }

    if (!['admin', 'editor', 'viewer'].includes(role)) {
      throw new Error('Invalid role');
    }

    console.log(`📝 Assigning role ${role} to user ${userId}`);

    // First, delete existing viewer role (auto-assigned on signup)
    const { error: deleteError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role', 'viewer');

    if (deleteError) {
      console.warn('⚠️ Could not delete existing viewer role', deleteError);
    }

    // Insert new role
    const { error: insertError } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role,
        created_by: user!.id
      });

    if (insertError) {
      console.error('❌ Failed to assign role', insertError);
      throw new Error(insertError.message);
    }

    console.log(`✅ Successfully assigned role ${role} to user ${userId}`);

    return { success: true, role };
  }
}));
