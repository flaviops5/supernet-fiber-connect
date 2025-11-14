import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wand2, Edit, Trash2, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { logger } from '@/lib/logger';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  featured_image: string | null;
  category: string;
  read_time: number;
  featured: boolean;
  published: boolean;
  created_at: string;
  updated_at: string;
}

interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export default function BlogManagement() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    author: 'SUPERNET FIBRA',
    featured_image: '',
    category: '',
    read_time: 5,
    featured: false,
    published: false
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchPosts();
    fetchCategories();
  }, []);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      logger.error('Error fetching posts', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar posts do blog',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      logger.error('Error fetching categories', error);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const generateWithAI = async (type: 'title' | 'excerpt' | 'content') => {
    if (!aiPrompt.trim()) {
      toast({
        title: 'Erro',
        description: 'Digite um prompt para gerar conteúdo',
        variant: 'destructive',
      });
      return;
    }

    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-blog-content', {
        body: {
          prompt: type === 'title' ? aiPrompt : (type === 'excerpt' ? formData.title : aiPrompt),
          type,
          category: formData.category
        }
      });

      if (error) throw error;

      if (data.success) {
        if (type === 'title') {
          const titles = data.content.split('\n').filter((line: string) => line.trim());
          setFormData(prev => ({ 
            ...prev, 
            title: titles[0]?.replace(/^\d+\.?\s*/, '') || '',
            slug: generateSlug(titles[0]?.replace(/^\d+\.?\s*/, '') || '')
          }));
        } else if (type === 'excerpt') {
          setFormData(prev => ({ ...prev, excerpt: data.content }));
        } else {
          setFormData(prev => ({ ...prev, content: data.content }));
        }
        
        toast({
          title: 'Sucesso',
          description: 'Conteúdo gerado com IA!',
        });
      } else {
        throw new Error(data.error || 'Erro ao gerar conteúdo');
      }
    } catch (error) {
      console.error('Error generating content:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao gerar conteúdo com IA',
        variant: 'destructive',
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.content || !formData.category) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    try {
      const slug = formData.slug || generateSlug(formData.title);
      
      if (isEditing) {
        const { error } = await supabase
          .from('blog_posts')
          .update({
            title: formData.title,
            slug,
            excerpt: formData.excerpt,
            content: formData.content,
            author: formData.author,
            featured_image: formData.featured_image || null,
            category: formData.category,
            read_time: formData.read_time,
            featured: formData.featured,
            published: formData.published
          })
          .eq('id', formData.id);

        if (error) throw error;
        
        toast({
          title: 'Sucesso',
          description: 'Post atualizado com sucesso!',
        });
      } else {
        const { error } = await supabase
          .from('blog_posts')
          .insert({
            title: formData.title,
            slug,
            excerpt: formData.excerpt,
            content: formData.content,
            author: formData.author,
            featured_image: formData.featured_image || null,
            category: formData.category,
            read_time: formData.read_time,
            featured: formData.featured,
            published: formData.published
          });

        if (error) throw error;
        
        toast({
          title: 'Sucesso',
          description: 'Post criado com sucesso!',
        });
      }

      resetForm();
      fetchPosts();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving post:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar post',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (post: BlogPost) => {
    setFormData({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      author: post.author,
      featured_image: post.featured_image || '',
      category: post.category,
      read_time: post.read_time,
      featured: post.featured,
      published: post.published
    });
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este post?')) return;

    try {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: 'Sucesso',
        description: 'Post excluído com sucesso!',
      });
      fetchPosts();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao excluir post',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      id: '',
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      author: 'SUPERNET FIBRA',
      featured_image: '',
      category: '',
      read_time: 5,
      featured: false,
      published: false
    });
    setIsEditing(false);
    setAiPrompt('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gerenciamento de Blog</h2>
          <p className="text-muted-foreground">Gerencie posts do blog com IA</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Post
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Editar Post' : 'Criar Novo Post'}</DialogTitle>
              <DialogDescription>
                Use a IA para gerar conteúdo automaticamente ou escreva manualmente
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* AI Content Generator */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wand2 className="w-5 h-5" />
                    Gerador de Conteúdo com IA
                  </CardTitle>
                  <CardDescription>
                    Digite um tópico ou ideia para gerar conteúdo automaticamente
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="ai-prompt">Prompt para IA</Label>
                    <Textarea
                      id="ai-prompt"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="Ex: Benefícios da fibra óptica para trabalho remoto"
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => generateWithAI('title')}
                      disabled={aiLoading}
                    >
                      {aiLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wand2 className="w-4 h-4 mr-2" />}
                      Gerar Título
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => generateWithAI('excerpt')}
                      disabled={aiLoading || !formData.title}
                    >
                      {aiLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wand2 className="w-4 h-4 mr-2" />}
                      Gerar Resumo
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => generateWithAI('content')}
                      disabled={aiLoading}
                    >
                      {aiLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wand2 className="w-4 h-4 mr-2" />}
                      Gerar Conteúdo
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Separator />

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => {
                      setFormData(prev => ({ 
                        ...prev, 
                        title: e.target.value,
                        slug: generateSlug(e.target.value)
                      }));
                    }}
                    placeholder="Título do post"
                    sanitize
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                    placeholder="url-amigavel"
                    sanitize
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="excerpt">Resumo *</Label>
                <Textarea
                  id="excerpt"
                  value={formData.excerpt}
                  onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                  placeholder="Breve descrição do post"
                  rows={3}
                  sanitize
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Conteúdo *</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Conteúdo completo do post (Markdown)"
                  rows={15}
                  sanitize
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria *</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.slug}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="author">Autor</Label>
                  <Input
                    id="author"
                    value={formData.author}
                    onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                    placeholder="Nome do autor"
                    sanitize
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="read_time">Tempo de Leitura (min)</Label>
                  <Input
                    id="read_time"
                    type="number"
                    value={formData.read_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, read_time: parseInt(e.target.value) || 5 }))}
                    min="1"
                    max="60"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="featured_image">URL da Imagem Destacada</Label>
                <Input
                  id="featured_image"
                  value={formData.featured_image}
                  onChange={(e) => setFormData(prev => ({ ...prev, featured_image: e.target.value }))}
                  placeholder="/assets/image.jpg"
                />
              </div>

              <div className="flex gap-6">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="featured"
                    checked={formData.featured}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, featured: checked }))}
                  />
                  <Label htmlFor="featured">Post em Destaque</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="published"
                    checked={formData.published}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, published: checked }))}
                  />
                  <Label htmlFor="published">Publicar</Label>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit">
                  {isEditing ? 'Atualizar' : 'Criar'} Post
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Posts List */}
      <div className="grid gap-4">
        {posts.map((post) => (
          <Card key={post.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{post.title}</h3>
                    {post.featured && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                        Destaque
                      </span>
                    )}
                    <span className={`text-xs px-2 py-1 rounded ${
                      post.published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {post.published ? 'Publicado' : 'Rascunho'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{post.excerpt}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Categoria: {post.category}</span>
                    <span>Autor: {post.author}</span>
                    <span>{post.read_time} min de leitura</span>
                    <span>{new Date(post.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(post)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(post.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {posts.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">Nenhum post encontrado. Crie seu primeiro post!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}