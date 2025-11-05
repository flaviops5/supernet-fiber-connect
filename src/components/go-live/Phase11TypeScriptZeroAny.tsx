import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Loader2,
  FileCode,
  Code2,
  FileType,
  Wrench,
  Zap,
  TrendingUp,
  Shield,
  Target,
  CheckCheck
} from "lucide-react";

interface FileCategory {
  name: string;
  path: string;
  totalFiles: number;
  filesWithAny: number;
  anyCount: number;
  status: 'pending' | 'in-progress' | 'completed';
  icon: React.ComponentType<{ className?: string }>;
}

export function Phase11TypeScriptZeroAny() {
  const [analyzing, setAnalyzing] = useState(false);
  const [categories, setCategories] = useState<FileCategory[]>([
    {
      name: "Components",
      path: "src/components/",
      totalFiles: 0,
      filesWithAny: 0,
      anyCount: 0,
      status: "pending",
      icon: FileCode
    },
    {
      name: "Hooks",
      path: "src/hooks/",
      totalFiles: 0,
      filesWithAny: 0,
      anyCount: 0,
      status: "pending",
      icon: Code2
    },
    {
      name: "Utils",
      path: "src/utils/",
      totalFiles: 0,
      filesWithAny: 0,
      anyCount: 0,
      status: "pending",
      icon: Wrench
    },
    {
      name: "Types",
      path: "src/types/",
      totalFiles: 0,
      filesWithAny: 0,
      anyCount: 0,
      status: "pending",
      icon: FileType
    }
  ]);

  const { toast } = useToast();

  // Simular análise de arquivos (em produção, seria um script real)
  const analyzeCodebase = async () => {
    setAnalyzing(true);
    
    toast({
      title: "🔍 Analisando Codebase",
      description: "Procurando por tipos 'any' no frontend..."
    });

    // Simular análise com dados mockados
    await new Promise(resolve => setTimeout(resolve, 2000));

    setCategories([
      {
        name: "Components",
        path: "src/components/",
        totalFiles: 127,
        filesWithAny: 18,
        anyCount: 34,
        status: "pending",
        icon: FileCode
      },
      {
        name: "Hooks",
        path: "src/hooks/",
        totalFiles: 12,
        filesWithAny: 3,
        anyCount: 7,
        status: "pending",
        icon: Code2
      },
      {
        name: "Utils",
        path: "src/utils/",
        totalFiles: 8,
        filesWithAny: 2,
        anyCount: 5,
        status: "pending",
        icon: Wrench
      },
      {
        name: "Types",
        path: "src/types/",
        totalFiles: 5,
        filesWithAny: 0,
        anyCount: 0,
        status: "completed",
        icon: FileType
      }
    ]);

    setAnalyzing(false);

    toast({
      title: "✅ Análise Concluída",
      description: "46 ocorrências de 'any' encontradas em 23 arquivos"
    });
  };

  const getTotalAny = () => {
    return categories.reduce((sum, cat) => sum + cat.anyCount, 0);
  };

  const getTotalFiles = () => {
    return categories.reduce((sum, cat) => sum + cat.totalFiles, 0);
  };

  const getCompletionPercentage = () => {
    const totalWithAny = categories.reduce((sum, cat) => sum + cat.filesWithAny, 0);
    const completed = categories.filter(cat => cat.status === 'completed').length;
    if (totalWithAny === 0) return 100;
    return (completed / categories.length) * 100;
  };

  const getCategoryIcon = (category: FileCategory) => {
    const Icon = category.icon;
    return <Icon className="w-5 h-5" />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="bg-success text-success-foreground">Completo</Badge>;
      case "in-progress":
        return <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Em Progresso</Badge>;
      default:
        return <Badge variant="outline">Pendente</Badge>;
    }
  };

  const bestPractices = [
    {
      title: "Use Interfaces e Types",
      description: "Defina interfaces explícitas ao invés de 'any'",
      example: "interface User { id: string; name: string; }"
    },
    {
      title: "Unknown ao invés de Any",
      description: "Use 'unknown' para casos onde o tipo é realmente desconhecido",
      example: "const data: unknown = await fetchData();"
    },
    {
      title: "Generics",
      description: "Use tipos genéricos para funções reutilizáveis",
      example: "function getValue<T>(obj: T, key: keyof T): T[key]"
    },
    {
      title: "Type Guards",
      description: "Implemente guards para validação de tipos em runtime",
      example: "function isUser(obj: any): obj is User { return 'id' in obj; }"
    },
    {
      title: "Utility Types",
      description: "Aproveite utility types do TypeScript",
      example: "Partial<T>, Pick<T, K>, Omit<T, K>, Record<K, T>"
    }
  ];

  const eslintConfig = `{
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unsafe-assignment": "warn",
    "@typescript-eslint/no-unsafe-member-access": "warn",
    "@typescript-eslint/no-unsafe-call": "warn",
    "@typescript-eslint/no-unsafe-return": "warn"
  }
}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">FASE 11: TypeScript Zero-Any Frontend</h2>
          <p className="text-muted-foreground mt-2">
            Eliminar tipos 'any' e melhorar type safety no frontend
          </p>
        </div>
        <Button 
          onClick={analyzeCodebase}
          disabled={analyzing}
          size="lg"
          className="gap-2"
        >
          {analyzing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Analisando...
            </>
          ) : (
            <>
              <Target className="w-5 h-5" />
              Analisar Codebase
            </>
          )}
        </Button>
      </div>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>Fase Pós-Live - Melhoria Contínua</AlertTitle>
        <AlertDescription>
          Esta fase é executada APÓS o sistema estar em produção. O objetivo é melhorar a 
          qualidade do código e type safety sem impactar operações.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Progresso da Eliminação
          </CardTitle>
          <CardDescription>
            {getTotalAny()} ocorrências de 'any' em {categories.reduce((sum, cat) => sum + cat.filesWithAny, 0)} arquivos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Progress value={getCompletionPercentage()} className="h-3" />
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Progresso: {getCompletionPercentage().toFixed(0)}%</span>
              <span>{getTotalFiles()} arquivos totais analisados</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="categories" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="categories">
            <FileCode className="w-4 h-4 mr-2" />
            Categorias
          </TabsTrigger>
          <TabsTrigger value="best-practices">
            <CheckCheck className="w-4 h-4 mr-2" />
            Boas Práticas
          </TabsTrigger>
          <TabsTrigger value="config">
            <Wrench className="w-4 h-4 mr-2" />
            Configuração
          </TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-4">
          {categories.map((category) => (
            <Card key={category.name} className={
              category.status === 'completed' ? 'border-success/50' :
              category.status === 'in-progress' ? 'border-primary/50' : ''
            }>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getCategoryIcon(category)}
                    <div>
                      <CardTitle className="text-lg">{category.name}</CardTitle>
                      <CardDescription>{category.path}</CardDescription>
                    </div>
                  </div>
                  {getStatusBadge(category.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Arquivos Totais</p>
                    <p className="text-2xl font-bold">{category.totalFiles}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Com 'any'</p>
                    <p className={`text-2xl font-bold ${
                      category.filesWithAny === 0 ? 'text-success' : 'text-warning'
                    }`}>
                      {category.filesWithAny}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Total 'any'</p>
                    <p className={`text-2xl font-bold ${
                      category.anyCount === 0 ? 'text-success' : 'text-destructive'
                    }`}>
                      {category.anyCount}
                    </p>
                  </div>
                </div>

                {category.status === 'pending' && category.anyCount > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        setCategories(prev => prev.map(cat =>
                          cat.name === category.name 
                            ? { ...cat, status: 'in-progress' as const }
                            : cat
                        ));
                        toast({
                          title: `🚀 Iniciando ${category.name}`,
                          description: `Refatorando ${category.anyCount} ocorrências de 'any'`
                        });
                      }}
                    >
                      <Zap className="w-4 h-4" />
                      Iniciar Refatoração
                    </Button>
                  </div>
                )}

                {category.status === 'completed' && (
                  <Alert className="mt-4 border-success/50 bg-success/10">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <AlertDescription className="text-success">
                      Categoria 100% type-safe! Zero 'any' encontrados.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="best-practices" className="space-y-4">
          {bestPractices.map((practice, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  {practice.title}
                </CardTitle>
                <CardDescription>{practice.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-3 rounded-lg text-sm overflow-x-auto">
                  <code>{practice.example}</code>
                </pre>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-primary" />
                Configuração ESLint
              </CardTitle>
              <CardDescription>
                Adicionar regras estritas ao .eslintrc.json para prevenir uso de 'any'
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                <code>{eslintConfig}</code>
              </pre>
              
              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Ativar Modo Estrito</AlertTitle>
                <AlertDescription className="mt-2">
                  <p className="text-sm">
                    Após eliminar todos os 'any', ative estas regras no ESLint para prevenir
                    regressões. Isso garantirá que nenhum novo 'any' seja introduzido no código.
                  </p>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Benefícios da Tipagem Estrita</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {[
                  "✅ Autocomplete 100% funcional na IDE",
                  "✅ Detecção de erros em tempo de desenvolvimento",
                  "✅ Refatoração mais segura e confiável",
                  "✅ Documentação implícita no código",
                  "✅ Performance melhorada da IDE",
                  "✅ Menos bugs em produção"
                ].map((benefit, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
