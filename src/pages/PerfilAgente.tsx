import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AuthGuard } from '@/components/AuthGuard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, Save, ArrowLeft } from 'lucide-react';

export default function PerfilAgente() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    avatar_url: '',
    job_title: '',
    work_hours_start: '',
    work_hours_end: '',
    bio: ''
  });
  const [department, setDepartment] = useState<string>('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;

      if (profileData) {
        setProfile({
          name: profileData.name || '',
          email: profileData.email || '',
          phone: profileData.phone || '',
          avatar_url: profileData.avatar_url || '',
          job_title: profileData.job_title || '',
          work_hours_start: profileData.work_hours_start || '',
          work_hours_end: profileData.work_hours_end || '',
          bio: profileData.bio || ''
        });
      }

      const { data: deptData } = await supabase
        .from('agent_department_assignments')
        .select('department')
        .eq('user_id', user.id)
        .single();

      if (deptData) {
        setDepartment(deptData.department);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o perfil.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Math.random()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));

      toast({
        title: 'Sucesso',
        description: 'Foto atualizada com sucesso!'
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível fazer upload da foto.',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: profile.name,
          phone: profile.phone,
          avatar_url: profile.avatar_url,
          job_title: profile.job_title,
          work_hours_start: profile.work_hours_start || null,
          work_hours_end: profile.work_hours_end || null,
          bio: profile.bio
        })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      if (department) {
        const { error: deptError } = await supabase
          .from('agent_department_assignments')
          .upsert({
            user_id: user.id,
            department: department as any,
            assigned_by: user.id
          }, {
            onConflict: 'user_id,department'
          });

        if (deptError) throw deptError;
      }

      toast({
        title: 'Sucesso',
        description: 'Perfil atualizado com sucesso!'
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o perfil.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard requiredRoles={['admin', 'editor']}>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center justify-between px-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/admin')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao Admin
            </Button>
            <h1 className="text-xl font-bold">Meu Perfil</h1>
            <div className="w-24" />
          </div>
        </header>

        <div className="container mx-auto p-4 max-w-4xl">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Foto e Informações Básicas */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Foto e Informações Básicas</CardTitle>
                <CardDescription>Atualize sua foto e informações de perfil</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center gap-4">
                  <Avatar className="h-32 w-32">
                    <AvatarImage src={profile.avatar_url} alt={profile.name} />
                    <AvatarFallback className="text-3xl">
                      {profile.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadAvatar}
                      disabled={uploading}
                      className="hidden"
                      id="avatar-upload"
                    />
                    <Label htmlFor="avatar-upload">
                      <Button
                        variant="outline"
                        disabled={uploading}
                        asChild
                      >
                        <span className="cursor-pointer">
                          <Upload className="h-4 w-4 mr-2" />
                          {uploading ? 'Enviando...' : 'Alterar Foto'}
                        </span>
                      </Button>
                    </Label>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input
                      id="name"
                      value={profile.name}
                      onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Digite seu nome completo"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                      disabled
                      className="bg-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={profile.phone}
                      onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="(00) 00000-0000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="job_title">Função na Empresa</Label>
                    <Input
                      id="job_title"
                      value={profile.job_title}
                      onChange={(e) => setProfile(prev => ({ ...prev, job_title: e.target.value }))}
                      placeholder="Ex: Atendente, Suporte Técnico"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Departamento */}
            <Card>
              <CardHeader>
                <CardTitle>Departamento</CardTitle>
                <CardDescription>Selecione seu departamento</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="department">Departamento</Label>
                  <Select value={department} onValueChange={setDepartment}>
                    <SelectTrigger id="department">
                      <SelectValue placeholder="Selecione um departamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="comercial">Comercial</SelectItem>
                      <SelectItem value="tecnico">Técnico</SelectItem>
                      <SelectItem value="financeiro">Financeiro</SelectItem>
                      <SelectItem value="administrativo">Administrativo</SelectItem>
                      <SelectItem value="logistica">Logística</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Horário de Trabalho */}
            <Card>
              <CardHeader>
                <CardTitle>Horário de Trabalho</CardTitle>
                <CardDescription>Defina seu horário de expediente</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="work_hours_start">Início</Label>
                    <Input
                      id="work_hours_start"
                      type="time"
                      value={profile.work_hours_start}
                      onChange={(e) => setProfile(prev => ({ ...prev, work_hours_start: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="work_hours_end">Término</Label>
                    <Input
                      id="work_hours_end"
                      type="time"
                      value={profile.work_hours_end}
                      onChange={(e) => setProfile(prev => ({ ...prev, work_hours_end: e.target.value }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bio */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Sobre Mim</CardTitle>
                <CardDescription>Escreva uma breve descrição sobre você</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={profile.bio}
                  onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Fale um pouco sobre sua experiência e especialidades..."
                  rows={4}
                />
              </CardContent>
            </Card>

            {/* Botão Salvar */}
            <div className="md:col-span-2">
              <Button
                onClick={handleSave}
                disabled={loading}
                className="w-full"
                size="lg"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Salvando...' : 'Salvar Perfil'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
