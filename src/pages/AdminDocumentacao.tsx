import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { FileText, Database, Code2, Brain } from "lucide-react";
import { KnowledgeBaseTab } from "@/components/documentation/KnowledgeBaseTab";
import { TechnicalDocsTab } from "@/components/documentation/TechnicalDocsTab";
import { OmnichannelCodesTab } from "@/components/documentation/OmnichannelCodesTab";
import KnowledgeManagement from "@/components/KnowledgeManagement";

const AdminDocumentacao = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Central de Documentação</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie toda a documentação do sistema em um só lugar
          </p>
        </div>
      </div>

      <Card className="p-6">
        <Tabs defaultValue="knowledge" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
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
          </TabsList>

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
        </Tabs>
      </Card>
    </div>
  );
};

export default AdminDocumentacao;