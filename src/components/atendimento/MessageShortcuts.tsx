import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Zap, Search, Image as ImageIcon, Video, Volume2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MessageShortcut {
  id: string;
  title: string;
  shortcut_key: string;
  message_text: string | null;
  media_id: string | null;
  media?: {
    file_url: string;
    file_type: string;
    thumbnail_url: string | null;
  };
}

interface Props {
  onSelectShortcut: (shortcut: MessageShortcut) => void;
  department: string;
}

export default function MessageShortcuts({ onSelectShortcut, department }: Props) {
  const [shortcuts, setShortcuts] = useState<MessageShortcut[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      loadShortcuts();
    }
  }, [open, department]);

  const loadShortcuts = async () => {
    const { data } = await supabase
      .from('message_shortcuts')
      .select(`
        *,
        media:media_repository(file_url, file_type, thumbnail_url)
      `)
      .eq('is_active', true)
      .contains('department', [department])
      .order('display_order');

    if (data) {
      setShortcuts(data);
    }
  };

  const filteredShortcuts = shortcuts.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.shortcut_key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'image':
      case 'gif':
        return <ImageIcon className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'audio':
        return <Volume2 className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const handleSelect = async (shortcut: MessageShortcut) => {
    // Increment usage count
    await supabase
      .from('message_shortcuts')
      .update({ usage_count: (shortcut.usage_count || 0) + 1 })
      .eq('id', shortcut.id);

    onSelectShortcut(shortcut);
    setOpen(false);
    setSearchQuery('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Zap className="h-4 w-4" />
          Atalhos
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar atalho..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8"
            />
          </div>

          <ScrollArea className="h-72">
            <div className="space-y-2">
              {filteredShortcuts.map((shortcut) => (
                <button
                  key={shortcut.id}
                  onClick={() => handleSelect(shortcut)}
                  className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{shortcut.title}</p>
                      <Badge variant="secondary" className="text-xs mt-1">
                        {shortcut.shortcut_key}
                      </Badge>
                    </div>
                    {shortcut.media && (
                      <div className="text-primary">
                        {getMediaIcon(shortcut.media.file_type)}
                      </div>
                    )}
                  </div>
                  {shortcut.message_text && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {shortcut.message_text}
                    </p>
                  )}
                </button>
              ))}

              {filteredShortcuts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Nenhum atalho encontrado
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}