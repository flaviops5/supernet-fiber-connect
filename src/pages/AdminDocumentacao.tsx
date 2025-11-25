import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { FileText, Database, Code2, Brain, Sparkles, Users } from "lucide-react";
import { KnowledgeBaseTab } from "@/components/documentation/KnowledgeBaseTab";
import { TechnicalDocsTab } from "@/components/documentation/TechnicalDocsTab";
import { OmnichannelCodesTab } from "@/components/documentation/OmnichannelCodesTab";
import AgentManagement from "@/components/AgentManagement";
import KnowledgeManagement from "@/components/KnowledgeManagement";
import CorporateAI from "@/components/CorporateAI";
import { BackButton } from "@/components/BackButton";

const AdminDocumentacao = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <BackButton />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Central de Documentação</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie toda a documentação do sistema em um só lugar
          </p>
        </div>
      </div>

      <Card className="p-6">
        <Tabs defaultValue="agents" className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-6">
            <TabsTrigger value="agents" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Agentes
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Base Vetorizada
            </TabsTrigger>
            <TabsTrigger value="kb-management" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Gerenciar KB
            </TabsTrigger>
            <TabsTrigger value="technical" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Docs Técnicas
            </TabsTrigger>
            <TabsTrigger value="omnichannel" className="flex items-center gap-2">
              <Code2 className="h-4 w-4" />
              Códigos Omnichannel
            </TabsTrigger>
            <TabsTrigger value="ai-assistant" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              IA Corporativa
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agents" className="space-y-4">
            <AgentManagement />
          </TabsContent>

          <TabsContent value="knowledge" className="space-y-4">
            <KnowledgeBaseTab />
          </TabsContent>

          <TabsContent value="kb-management" className="space-y-4">
            <KnowledgeManagement />
          </TabsContent>

          <TabsContent value="technical" className="space-y-4">
            <TechnicalDocsTab />
          </TabsContent>

          <TabsContent value="omnichannel" className="space-y-4">
            <OmnichannelCodesTab />
          </TabsContent>

          <TabsContent value="ai-assistant" className="space-y-4">
            <CorporateAI />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default AdminDocumentacao;