import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, RefreshCw, Calendar, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface MonitoringLog {
  id: string;
  source: string;
  level: string;
  message: string;
  context: Record<string, unknown> | null;
  duration_ms: number | null;
  created_at: string;
  created_by: string | null;
}

const MonitoringLogs = () => {
  const [logs, setLogs] = useState<MonitoringLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sources, setSources] = useState<string[]>([]);
  const { toast } = useToast();

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("monitoring_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      // Filtros
      if (sourceFilter !== "all") {
        query = query.eq("source", sourceFilter);
      }

      if (levelFilter !== "all") {
        query = query.eq("level", levelFilter);
      }

      if (startDate) {
        query = query.gte("created_at", new Date(startDate).toISOString());
      }

      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        query = query.lte("created_at", endDateTime.toISOString());
      }

      if (searchText) {
        query = query.ilike("message", `%${searchText}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      setLogs((data || []).map(log => ({
        ...log,
        context: log.context as Record<string, unknown>
      })));

      // Extrair sources únicos
      const uniqueSources = [...new Set((data || []).map((log) => log.source))];
      setSources(uniqueSources);
    } catch (error) {
      console.error("Erro ao buscar logs:", error);
      toast({
        title: "Erro ao carregar logs",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [sourceFilter, levelFilter, startDate, endDate]);

  const getLevelBadgeVariant = (level: string) => {
    switch (level) {
      case "INFO":
        return "default";
      case "WARN":
        return "secondary";
      case "ERROR":
        return "destructive";
      default:
        return "outline";
    }
  };

  const clearFilters = () => {
    setSearchText("");
    setSourceFilter("all");
    setLevelFilter("all");
    setStartDate("");
    setEndDate("");
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Logs de Monitoramento</h1>
          <p className="text-muted-foreground">
            Visualização centralizada de logs do sistema
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
              <label className="text-sm font-medium">Buscar mensagem</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Digite para buscar..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchLogs()}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Filtro de origem */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Origem</label>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as origens" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as origens</SelectItem>
                  {sources.map((source) => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro de nível */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Severidade</label>
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os níveis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os níveis</SelectItem>
                  <SelectItem value="INFO">INFO</SelectItem>
                  <SelectItem value="WARN">WARN</SelectItem>
                  <SelectItem value="ERROR">ERROR</SelectItem>
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
            {logs.length} log{logs.length !== 1 ? "s" : ""} encontrado{logs.length !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Data/Hora</TableHead>
                  <TableHead className="w-[100px]">Nível</TableHead>
                  <TableHead className="w-[200px]">Origem</TableHead>
                  <TableHead>Mensagem</TableHead>
                  <TableHead className="w-[100px] text-right">Duração</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      Carregando logs...
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhum log encontrado com os filtros selecionados
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs">
                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getLevelBadgeVariant(log.level)}>
                          {log.level}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.source}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-sm">{log.message}</p>
                          {Object.keys(log.context || {}).length > 0 && (
                            <details className="text-xs text-muted-foreground">
                              <summary className="cursor-pointer hover:text-foreground">
                                Ver contexto
                              </summary>
                              <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                                {JSON.stringify(log.context, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {log.duration_ms ? `${log.duration_ms}ms` : "-"}
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
