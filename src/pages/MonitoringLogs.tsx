import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, RefreshCw, Calendar, Filter, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { BackButton } from "@/components/BackButton";

interface MonitoringLog {
  id: string;
  log_timestamp: string;
  level: string;
  message: string;
  context: string;
  correlation_id: string | null;
  environment: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

const MonitoringLogs = () => {
  const [logs, setLogs] = useState<MonitoringLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<MonitoringLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [contextFilter, setContextFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [contexts, setContexts] = useState<string[]>([]);
  const { toast } = useToast();

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("monitoring_logs")
        .select("*")
        .order("log_timestamp", { ascending: false })
        .limit(500);

      // Filtros
      if (contextFilter !== "all") {
        query = query.eq("context", contextFilter);
      }

      if (levelFilter !== "all") {
        query = query.eq("level", levelFilter);
      }

      if (startDate) {
        query = query.gte("log_timestamp", new Date(startDate).toISOString());
      }

      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        query = query.lte("log_timestamp", endDateTime.toISOString());
      }

      if (searchText) {
        query = query.or(`message.ilike.%${searchText}%,context.ilike.%${searchText}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      const transformedLogs = (data || []).map(log => ({
        ...log,
        metadata: (log.metadata as Record<string, unknown>) || {},
      })) as MonitoringLog[];

      setLogs(transformedLogs);
      setFilteredLogs(transformedLogs);

      // Extrair contexts únicos
      const uniqueContexts = [...new Set(transformedLogs.map((log) => log.context))];
      setContexts(uniqueContexts);
    } catch (error: unknown) {
      console.error("Erro ao buscar logs:", error);
      toast({
        title: "Erro ao carregar logs",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [contextFilter, levelFilter, startDate, endDate]);

  const getLevelVariant = (level: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (level.toLowerCase()) {
      case "info":
        return "default";
      case "warn":
        return "secondary";
      case "error":
        return "destructive";
      case "debug":
        return "outline";
      default:
        return "outline";
    }
  };

  const clearFilters = () => {
    setSearchText("");
    setContextFilter("all");
    setLevelFilter("all");
    setStartDate("");
    setEndDate("");
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <BackButton />
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Logs Unificados</h1>
          <p className="text-muted-foreground">
            Sistema de logging centralizado - Frontend + Edge Functions
          </p>
        </div>
        <Button onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Busca por texto */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Mensagem ou contexto..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchLogs()}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Filtro de contexto */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Contexto</label>
              <Select value={contextFilter} onValueChange={setContextFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os contextos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os contextos</SelectItem>
                  {contexts.map((ctx) => (
                    <SelectItem key={ctx} value={ctx}>
                      {ctx}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro de nível */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Nível</label>
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os níveis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os níveis</SelectItem>
                  <SelectItem value="debug">Debug</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warn">Warn</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Data inicial */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Data inicial</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Data final */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Data final</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={fetchLogs} variant="default">
              <Search className="mr-2 h-4 w-4" />
              Aplicar Filtros
            </Button>
            <Button onClick={clearFilters} variant="outline">
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de logs */}
      <Card>
        <CardHeader>
          <CardTitle>
            {filteredLogs.length} log{filteredLogs.length !== 1 ? "s" : ""} encontrado{filteredLogs.length !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Timestamp</TableHead>
                  <TableHead className="w-[100px]">Nível</TableHead>
                  <TableHead className="w-[200px]">Contexto</TableHead>
                  <TableHead>Mensagem</TableHead>
                  <TableHead className="w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      Carregando logs...
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhum log encontrado com os filtros selecionados
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs">
                        {format(new Date(log.log_timestamp), 'dd/MM/yyyy HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getLevelVariant(log.level)}>
                          {log.level.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{log.context}</TableCell>
                      <TableCell className="max-w-md truncate">{log.message}</TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Detalhes do Log</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <p className="text-sm font-medium">Timestamp</p>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(log.log_timestamp), 'dd/MM/yyyy HH:mm:ss')}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm font-medium">Context</p>
                                <p className="text-sm text-muted-foreground">{log.context}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium">Correlation ID</p>
                                <p className="text-sm text-muted-foreground font-mono">
                                  {log.correlation_id || 'N/A'}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm font-medium">Environment</p>
                                <p className="text-sm text-muted-foreground">{log.environment || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium">Message</p>
                                <p className="text-sm text-muted-foreground">{log.message}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium">Metadata</p>
                                <pre className="mt-2 rounded-lg bg-muted p-4 text-xs overflow-auto max-h-96">
                                  {JSON.stringify(log.metadata, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MonitoringLogs;
