import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, UserCog } from "lucide-react";
import { AddUserForm } from "@/components/AddUserForm";
import { logger } from "@/lib/logger";

type UserRole = 'admin' | 'editor' | 'viewer';

interface UserProfile {
  user_id: string;
  name: string;
  email: string;
  role: UserRole;
}

export default function UserManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      logger.info('Fetching users list');
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, name, email');

      if (profilesError) {
        logger.error('Failed to fetch profiles', profilesError);
        throw profilesError;
      }

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) {
        logger.error('Failed to fetch roles', rolesError);
        throw rolesError;
      }

      return profiles.map(profile => ({
        ...profile,
        role: roles.find(r => r.user_id === profile.user_id)?.role || 'viewer'
      })) as UserProfile[];
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      logger.info('Deleting user', { userId });
      
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuário removido com sucesso');
      logger.info('User deleted successfully');
    },
    onError: (error) => {
      logger.error('Failed to delete user', error);
      toast.error('Erro ao remover usuário');
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) => {
      logger.info('Updating user role', { userId, role });
      
      const { error } = await supabase
        .from('user_roles')
        .update({ role })
        .eq('user_id', userId);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Papel atualizado com sucesso');
      logger.info('User role updated successfully');
    },
    onError: (error) => {
      logger.error('Failed to update user role', error);
      toast.error('Erro ao atualizar papel');
    }
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              Gerenciamento de Usuários
            </CardTitle>
            <CardDescription>
              Gerencie usuários e suas permissões
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Usuário
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Novo Usuário</DialogTitle>
              </DialogHeader>
              <AddUserForm />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user) => (
                <TableRow key={user.user_id}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <select
                      value={user.role}
                      onChange={(e) => updateRoleMutation.mutate({
                        userId: user.user_id,
                        role: e.target.value as UserRole
                      })}
                      className="border rounded px-2 py-1"
                    >
                      <option value="viewer">Visualizador</option>
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteUserMutation.mutate(user.user_id)}
                    >
                      Remover
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
