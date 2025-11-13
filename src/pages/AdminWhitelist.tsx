import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { BackButton } from '@/components/BackButton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Shield, Plus, CheckCircle, XCircle, Trash2, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WhitelistEntry {
  id: string;
  ip_address: string | null;
  ip_range: string | null;
  label: string;
  description: string | null;
  reason: string;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function AdminWhitelist() {
  const [entries, setEntries] = useState<WhitelistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    ipAddress: '',
    ipRange: '',
    label: '',
    description: '',
    reason: 'Internal API',
    expiresAt: '',
  });

  const loadWhitelist = async () => {
    try {
      const { data, error } = await supabase
        .from('rate_limit_whitelist' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEntries((data as any) || []);
    } catch (error) {
      console.error('Error loading whitelist:', error);
      toast.error('Erro ao carregar whitelist');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWhitelist();
  }, []);

  const handleAdd = async () => {
    if (!formData.ipAddress && !formData.ipRange) {
      toast.error('Informe pelo menos um IP ou range CIDR');
      return;
    }

    if (!formData.label.trim()) {
      toast.error('Label é obrigatório');
      return;
    }

    try {
      const { error } = await supabase.rpc('add_to_whitelist' as any, {
        p_ip_address: formData.ipAddress || null,
        p_ip_range: formData.ipRange || null,
        p_label: formData.label,
        p_description: formData.description || null,
        p_reason: formData.reason,
        p_expires_at: formData.expiresAt || null,
      } as any);

      if (error) throw error;

      toast.success('IP adicionado à whitelist com sucesso!');
      setIsDialogOpen(false);
      setFormData({
        ipAddress: '',
        ipRange: '',
        label: '',
        description: '',
        reason: 'Internal API',
        expiresAt: '',
      });
      loadWhitelist();
    } catch (error: any) {
      console.error('Error adding to whitelist:', error);
      toast.error(`Erro: ${error.message}`);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('rate_limit_whitelist' as any)
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      toast.success(`Whitelist ${!currentStatus ? 'ativada' : 'desativada'}`);
      loadWhitelist();
    } catch (error) {
      console.error('Error toggling whitelist:', error);
      toast.error('Erro ao alterar status');
    }
  };

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`Tem certeza que deseja remover "${label}" da whitelist?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('rate_limit_whitelist' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Removido da whitelist');
      loadWhitelist();
    } catch (error) {
      console.error('Error deleting from whitelist:', error);
      toast.error('Erro ao remover');
    }
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <BackButton />

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            Whitelist de IPs
          </h1>
          <p className="text-muted-foreground">
            Gerencie IPs/ranges confiáveis que bypassam rate limiting
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar IP
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Adicionar à Whitelist</DialogTitle>
              <DialogDescription>
                Adicione um IP específico ou range CIDR para bypass de rate limiting
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ipAddress">IP Específico</Label>
                  <Input
                    id="ipAddress"
                    placeholder="Ex: 192.168.1.100"
                    value={formData.ipAddress}
                    onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Formato: IPv4 ou IPv6
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ipRange">Range CIDR (opcional)</Label>
                  <Input
                    id="ipRange"
                    placeholder="Ex: 192.168.1.0/24"
                    value={formData.ipRange}
                    onChange={(e) => setFormData({ ...formData, ipRange: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Formato: CIDR notation
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="label">Label *</Label>
                <Input
                  id="label"
                  placeholder="Ex: API Interna - Produção"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Detalhes sobre este IP/range..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reason">Motivo</Label>
                  <Input
                    id="reason"
                    placeholder="Ex: Internal API"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiresAt">Expira em (opcional)</Label>
                  <Input
                    id="expiresAt"
                    type="datetime-local"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAdd}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-6 mb-6 bg-gradient-to-r from-green-500/5 to-emerald-500/10">
        <div className="flex items-start gap-4">
          <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
          <div>
            <h2 className="text-xl font-bold mb-2">Como Funciona</h2>
            <p className="text-sm text-muted-foreground mb-3">
              IPs/ranges na whitelist bypassam completamente o rate limiting. Use apenas para sistemas confiáveis.
            </p>
            <div className="flex gap-2">
              <Badge variant="default">✅ Bypass total</Badge>
              <Badge variant="default">✅ CIDR support</Badge>
              <Badge variant="default">✅ Expiração automática</Badge>
              <Badge variant="default">✅ Logs de acesso</Badge>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4">
        {entries.length === 0 ? (
          <Card className="p-12 text-center">
            <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Nenhum IP na whitelist</h2>
            <p className="text-muted-foreground mb-4">
              Adicione IPs confiáveis para bypass de rate limiting
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Primeiro IP
            </Button>
          </Card>
        ) : (
          entries.map((entry) => (
            <Card
              key={entry.id}
              className={`p-6 ${
                !entry.is_active ? 'opacity-50' : ''
              } ${
                isExpired(entry.expires_at) ? 'border-orange-500/20 bg-orange-500/5' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{entry.label}</h3>
                    <Badge variant={entry.is_active ? 'default' : 'secondary'}>
                      {entry.is_active ? (
                        <>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Ativa
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 mr-1" />
                          Inativa
                        </>
                      )}
                    </Badge>
                    {isExpired(entry.expires_at) && (
                      <Badge variant="destructive">
                        <Clock className="w-3 h-3 mr-1" />
                        Expirada
                      </Badge>
                    )}
                  </div>

                  {entry.description && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {entry.description}
                    </p>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground mb-1">IP/Range</p>
                      <code className="font-mono bg-muted px-2 py-1 rounded">
                        {entry.ip_address || entry.ip_range}
                      </code>
                    </div>

                    <div>
                      <p className="text-muted-foreground mb-1">Motivo</p>
                      <p className="font-medium">{entry.reason}</p>
                    </div>

                    <div>
                      <p className="text-muted-foreground mb-1">Adicionado</p>
                      <p className="font-medium">
                        {new Date(entry.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>

                    <div>
                      <p className="text-muted-foreground mb-1">Expira</p>
                      <p className="font-medium">
                        {entry.expires_at
                          ? new Date(entry.expires_at).toLocaleDateString('pt-BR')
                          : 'Nunca'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(entry.id, entry.is_active)}
                  >
                    {entry.is_active ? 'Desativar' : 'Ativar'}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(entry.id, entry.label)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <Card className="p-6 mt-6 border-blue-500/20 bg-blue-500/5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold mb-1">⚠️ Importante - Segurança</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• IPs whitelisted bypassam TODOS os rate limits</li>
              <li>• Use apenas para sistemas internos e APIs confiáveis</li>
              <li>• Configure expiração para acessos temporários</li>
              <li>• Acessos via whitelist são logados para auditoria</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
