import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, MessageSquare, AlertCircle, Filter } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ConversationSearch from './ConversationSearch';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Conversation {
  id: string;
  customer_name: string;
  customer_phone: string;
  channel: string;
  status: string;
  department: string;
  priority: number;
  created_at: string;
  last_message_at: string;
  tags?: string[];
}

interface Props {
  selectedConversation: string | null;
  onSelectConversation: (id: string) => void;
  agentDepartment: string;
}

type FilterType = 'waiting' | 'active' | 'my' | 'all';

const channelIcons = {
  whatsapp: '📱',
  facebook: '📘',
  instagram: '📷',
  chatbot: '🤖',
  email: '✉️'
};

const statusLabels = {
  waiting: 'Aguardando',
  active: 'Em atendimento',
  paused: 'Pausado',
  resolved: 'Resolvido',
  transferred: 'Transferido'
};

export default function ConversationQueue({ selectedConversation, onSelectConversation, agentDepartment }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filter, setFilter] = useState<FilterType>('waiting');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    loadConversations();
    loadTags();

    const channel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        () => {
          loadConversations();
          loadTags();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentDepartment, filter, searchQuery, selectedTags]);

  const loadTags = async () => {
    const { data } = await supabase
      .from('conversations')
      .select('tags');
    
    if (data) {
      const uniqueTags = new Set<string>();
      data.forEach(conv => {
        (conv.tags || []).forEach((tag: string) => uniqueTags.add(tag));
      });
      setAllTags(Array.from(uniqueTags).sort());
    }
  };

  const loadConversations = async () => {
    let query = supabase
      .from('conversations')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (filter === 'my') {
      const { data: { user } } = await supabase.auth.getUser();
      query = query.eq('assigned_agent_id', user?.id);
    } else if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    // Filter by department if set
    if (agentDepartment && filter === 'waiting') {
      query = query.or(`department.eq.${agentDepartment},department.is.null`);
    }

    // Search query usando full-text search
    if (searchQuery) {
      query = query.textSearch('search_vector', searchQuery, {
        type: 'websearch',
        config: 'portuguese'
      });
    }

    // Filter by tags
    if (selectedTags.length > 0) {
      query = query.overlaps('tags', selectedTags);
    }

    const { data, error } = await query.limit(100);

    if (error) {
      console.error('Error loading conversations:', error);
      return;
    }

    setConversations(data || []);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const getTimeAgo = (date: string) => {
    return formatDistanceToNow(new Date(date), {
      addSuffix: true,
      locale: ptBR
    });
  };

  return (
    <Card className="h-full flex flex-col shadow-lg border-border/50 bg-gradient-to-br from-blue-50 via-blue-100/50 to-background dark:from-blue-950/20 dark:via-blue-900/10 dark:to-background">
      <CardHeader className="pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Fila de Atendimento
          </CardTitle>
          
          {allTags.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Tags
                  {selectedTags.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1">
                      {selectedTags.length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Filtrar por Tags</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {allTags.map(tag => (
                  <DropdownMenuCheckboxItem
                    key={tag}
                    checked={selectedTags.includes(tag)}
                    onCheckedChange={() => toggleTag(tag)}
                  >
                    {tag}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <ConversationSearch onSearch={handleSearch} />
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden flex flex-col p-0">
        <Tabs value={filter} onValueChange={(value) => setFilter(value as FilterType)} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-4 mx-4">
            <TabsTrigger value="waiting" className="text-xs">Aguardando</TabsTrigger>
            <TabsTrigger value="active" className="text-xs">Ativas</TabsTrigger>
            <TabsTrigger value="my" className="text-xs">Minhas</TabsTrigger>
            <TabsTrigger value="all" className="text-xs">Todas</TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="flex-1 overflow-y-auto px-4 mt-2">
            <div className="space-y-2">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => onSelectConversation(conv.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all hover:shadow-md ${
                    selectedConversation === conv.id
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border/50 hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-lg">{channelIcons[conv.channel as keyof typeof channelIcons]}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{conv.customer_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{conv.customer_phone}</p>
                      </div>
                    </div>
                    {conv.priority > 0 && (
                      <AlertCircle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-xs">
                        {statusLabels[conv.status as keyof typeof statusLabels]}
                      </Badge>
                      {conv.tags && conv.tags.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {conv.tags[0]}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {getTimeAgo(conv.last_message_at || conv.created_at)}
                    </div>
                  </div>
                </button>
              ))}

              {conversations.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma conversa nesta fila</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
