import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Upload, Trash2, Image, Video, Volume2, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MediaItem {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_type: string;
  file_size: number | null;
  thumbnail_url: string | null;
  tags: string[];
  usage_count: number;
  created_at: string;
}

export default function MediaRepositoryManager() {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadMedia();
  }, []);

  const loadMedia = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('media_repository')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (data) {
      setMediaItems(data);
    }
    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `media/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('campaign-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('campaign-media')
        .getPublicUrl(filePath);

      // Determine file type
      let fileType = 'image';
      if (file.type.startsWith('video/')) fileType = 'video';
      else if (file.type.startsWith('audio/')) fileType = 'audio';
      else if (file.name.toLowerCase().endsWith('.gif')) fileType = 'gif';

      // Insert into database
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase
        .from('media_repository')
        .insert({
          title: file.name,
          file_url: publicUrl,
          file_type: fileType,
          file_size: file.size,
          created_by: user?.id
        });

      toast({
        title: 'Mídia enviada',
        description: 'Arquivo adicionado ao repositório com sucesso.',
      });

      loadMedia();
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Erro no upload',
        description: 'Não foi possível enviar o arquivo.',
        variant: 'destructive',
      });
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await supabase
        .from('media_repository')
        .update({ is_active: false })
        .eq('id', id);

      toast({
        title: 'Mídia removida',
        description: 'Item removido do repositório.',
      });

      loadMedia();
    } catch (error) {
      console.error('Error deleting media:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o item.',
        variant: 'destructive',
      });
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'audio':
        return <Volume2 className="h-4 w-4" />;
      default:
        return <Image className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Repositório de Mídias</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Label htmlFor="file-upload" className="cursor-pointer">
            <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
              {uploadingFile ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Enviar Mídia
            </div>
            <Input
              id="file-upload"
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploadingFile}
              accept="image/*,video/*,audio/*,.gif"
            />
          </Label>
          <p className="text-sm text-muted-foreground">
            Imagens, vídeos, áudios e GIFs
          </p>
        </div>

        <ScrollArea className="h-96">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mediaItems.map((item) => (
              <div key={item.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getIcon(item.file_type)}
                    <div>
                      <p className="font-medium text-sm">{item.title}</p>
                      <Badge variant="secondary" className="text-xs mt-1">
                        {item.file_type}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                {item.file_type === 'image' || item.file_type === 'gif' ? (
                  <img
                    src={item.file_url}
                    alt={item.title}
                    className="w-full h-32 object-cover rounded"
                  />
                ) : (
                  <div className="w-full h-32 bg-muted rounded flex items-center justify-center">
                    {getIcon(item.file_type)}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Usos: {item.usage_count}</span>
                  {item.file_size && (
                    <span>{(item.file_size / 1024 / 1024).toFixed(2)} MB</span>
                  )}
                </div>
              </div>
            ))}

            {mediaItems.length === 0 && !loading && (
              <div className="col-span-2 text-center py-12 text-muted-foreground">
                Nenhuma mídia no repositório
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}