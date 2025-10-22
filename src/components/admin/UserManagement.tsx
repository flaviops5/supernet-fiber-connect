import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Plus, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

export default function UserManagement() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [presence, setPresence] = useState<any[]>([]);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;

      const usersWithRoles = await Promise.all(
        (profilesData || []).map(async (profile) => {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.user_id)
            .maybeSingle();

          return {
            ...profile,
            user_roles: roleData ? [roleData] : [{ role: 'viewer' }]
          };
        })
      );

      setUsers(usersWithRoles);
      
      const { data: assignmentsData } = await supabase
        .from('agent_department_assignments')
        .select('*');
      
      setAssignments(assignmentsData || []);
      
      const { data: presenceData } = await supabase
        .from('agent_presence')
        .select('*');
      
      setPresence(presenceData || []);
      
    } catch (error) {
      logger.error('Error loading users', error as Error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'admin' | 'editor' | 'viewer') => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;
      
      setUsers(users.map(user => 
        user.user_id === userId 
          ? { ...user, user_roles: [{ role: newRole }] }
          : user
      ));
      
      toast.success('Permissão atualizada com sucesso!');
    } catch (error) {
      logger.error('Error updating role', error as Error);
      toast.error('Erro ao atualizar permissão');
    }
  };
  
  const getUserAssignments = (userId: string) => {
    return assignments.filter(a => a.user_id === userId);
  };
  
  const getUserPresence = (userId: string) => {
    return presence.find(p => p.user_id === userId);
  };
  
  const DEPARTMENTS = [
    { value: 'comercial', label: 'Comercial', color: 'bg-blue-500' },
    { value: 'tecnico', label: 'Técnico', color: 'bg-green-500' },
    { value: 'financeiro', label: 'Financeiro', color: 'bg-yellow-500' },
    { value: 'administrativo', label: 'Administrativo', color: 'bg-purple-500' },
    { value: 'logistica', label: 'Logística', color: 'bg-orange-500' }
  ];
  
  const getDeptLabel = (dept: string) => {
    return DEPARTMENTS.find(d => d.value === dept)?.label || dept;
  };
  
  const getDeptColor = (dept: string) => {
    return DEPARTMENTS.find(d => d.value === dept)?.color || 'bg-gray-500';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Usuários</h1>
          <p className="text-muted-foreground">Gerencie usuários e permissões do sistema</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Carregando usuários...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Usuários & Agentes</h1>
          <p className="text-muted-foreground">
            Gerencie usuários, permissões e configurações de atendimento
          </p>
        </div>
        <Button 
          onClick={() => navigate('/admin/add-user')}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Adicionar Usuário
        </Button>
      </div>

      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4" />
            Guia de Gerenciamento
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p><strong>Criar usuários:</strong> Clique em "Adicionar Usuário" para criar novas contas</p>
          <p><strong>Permissões:</strong> Defina se o usuário é Admin, Editor ou Visualizador</p>
          <p><strong>Configurar agentes:</strong> Use "Configurar como Agente" para atribuir departamentos</p>
          <p><strong>Editar perfis:</strong> Atualize informações pessoais, avatar e horários de trabalho</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usuários do Sistema</CardTitle>
          <CardDescription>
            Total de {users.length} usuário{users.length !== 1 ? 's' : ''} cadastrado{users.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum usuário cadastrado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => {
                const userAssignments = getUserAssignments(user.user_id);
                const userPresence = getUserPresence(user.user_id);
                const isAgent = userAssignments.length > 0 || userPresence;
                const isOnline = userPresence?.status === 'online';
                
                return (
                  <Card
                    key={user.id}
                    className="border-2"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="relative">
                          {user.avatar_url ? (
                            <img 
                              src={user.avatar_url} 
                              alt={user.name}
                              className="w-16 h-16 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                              <Users className="w-8 h-8 text-primary" />
                            </div>
                          )}
                          {isAgent && (
                            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white ${
                              isOnline ? 'bg-green-500' : 'bg-gray-400'
                            }`} title={isOnline ? 'Online' : 'Offline'} />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-semibold text-lg">{user.name}</h3>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                              {user.phone && (
                                <p className="text-xs text-muted-foreground">{user.phone}</p>
                              )}
                            </div>
                            
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              user.user_roles[0]?.role === 'admin' 
                                ? 'bg-red-100 text-red-800' 
                                : user.user_roles[0]?.role === 'editor'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {user.user_roles[0]?.role === 'admin' ? 'Administrador' : 
                               user.user_roles[0]?.role === 'editor' ? 'Editor' : 'Visualizador'}
                            </span>
                          </div>
                          
                          {userAssignments.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs text-muted-foreground mb-1">Departamentos:</p>
                              <div className="flex flex-wrap gap-1">
                                {userAssignments.map(assignment => (
                                  <span
                                    key={assignment.id}
                                    className={`text-xs px-2 py-1 rounded-full text-white flex items-center gap-1 ${getDeptColor(assignment.department)}`}
                                  >
                                    {getDeptLabel(assignment.department)}
                                    {assignment.is_universal && ' ⭐'}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {userPresence && (
                            <div className="flex gap-4 text-xs text-muted-foreground mb-3">
                              <span>
                                Conversas: {userPresence.current_conversations}/{userPresence.max_conversations}
                              </span>
                              <span>
                                Status: {isOnline ? '🟢 Online' : '⚫ Offline'}
                              </span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/perfil-agente?user_id=${user.user_id}`)}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Editar Perfil
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/admin/agentes`)}
                            >
                              <Users className="h-3 w-3 mr-1" />
                              Configurar como Agente
                            </Button>
                            
                            <select
                              value={user.user_roles[0]?.role || 'viewer'}
                              onChange={(e) => updateUserRole(user.user_id, e.target.value as 'admin' | 'editor' | 'viewer')}
                              className="px-3 py-1 border rounded text-sm ml-auto"
                            >
                              <option value="viewer">Visualizador</option>
                              <option value="editor">Editor</option>
                              <option value="admin">Administrador</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
