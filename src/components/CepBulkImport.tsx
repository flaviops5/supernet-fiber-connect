import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Upload, Download, FileSpreadsheet, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { JsonObject } from '@/types/common.types';

interface ImportDetail {
  line: number;
  error: string;
  data?: JsonObject;
}

interface ImportResult {
  success: number;
  errors: number;
  details: ImportDetail[];
}

const CepBulkImport = () => {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      const validTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];

      if (validTypes.includes(selectedFile.type) || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
        setResult(null);
      } else {
        toast.error('Formato de arquivo não suportado. Use CSV ou Excel (.xlsx)');
      }
    }
  };

  const downloadTemplate = () => {
    const csvContent = `cep_start,cep_end,region_name,coverage_area_name,latitude,longitude,plans,active
70000000,70999999,Asa Norte,Região Central - Brasília,-15.7800,-47.9100,"200MB,500MB,1GB",true
72000000,72999999,Taguatinga Norte,Taguatinga,-15.8300,-48.0500,"100MB,500MB,1GB",true
71000000,71999999,Asa Sul,Região Central - Brasília,-15.7900,-47.9000,"200MB,500MB,1GB",true`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'template-ceps.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const processImport = async () => {
    if (!file) {
      toast.error('Selecione um arquivo primeiro');
      return;
    }

    setImporting(true);
    setProgress(0);
    setResult(null);

    try {
      // Converter arquivo para base64
      const fileContent = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Chamar edge function para processar
      const { data, error } = await supabase.functions.invoke('process-cep-import', {
        body: {
          file: fileContent,
          filename: file.name,
          mimetype: file.type
        }
      });

      if (error) throw error;

      setResult(data);
      
      if (data.errors === 0) {
        toast.success(`Importação concluída! ${data.success} CEPs importados com sucesso.`);
      } else {
        toast.warning(`Importação parcial: ${data.success} sucessos, ${data.errors} erros.`);
      }

    } catch (error) {
      console.error('Erro na importação:', error);
      toast.error('Erro ao processar a importação');
    } finally {
      setImporting(false);
      setProgress(100);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Importação em Lote de CEPs
        </CardTitle>
        <CardDescription>
          Faça upload de uma planilha CSV ou Excel para importar múltiplos CEPs e planos de uma só vez
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Template Download */}
        <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Primeiro, baixe o modelo da planilha
          </h3>
          <p className="text-blue-700 dark:text-blue-300 text-sm mb-3">
            Use nosso template para garantir que os dados estão no formato correto
          </p>
          <Button 
            variant="outline" 
            onClick={downloadTemplate}
            className="text-blue-700 border-blue-300 hover:bg-blue-100"
          >
            <Download className="w-4 h-4 mr-2" />
            Baixar Template CSV
          </Button>
        </div>

        {/* Instruções */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Formato da planilha:</strong>
            <ul className="mt-2 space-y-1 text-xs">
              <li>• <strong>cep_start:</strong> CEP inicial (apenas números)</li>
              <li>• <strong>cep_end:</strong> CEP final (opcional, pode ser igual ao inicial)</li>
              <li>• <strong>region_name:</strong> Nome da região (Ex: "Asa Norte")</li>
              <li>• <strong>coverage_area_name:</strong> Nome da área de cobertura existente</li>
              <li>• <strong>latitude, longitude:</strong> Coordenadas (opcional)</li>
              <li>• <strong>plans:</strong> Planos separados por vírgula (Ex: "200MB,500MB,1GB")</li>
              <li>• <strong>active:</strong> true ou false</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Upload Area */}
        <div className="space-y-4">
          <div 
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              file ? 'border-green-300 bg-green-50 dark:bg-green-950' : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {file ? (
              <div className="space-y-2">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
                <p className="font-medium text-green-700 dark:text-green-300">
                  Arquivo selecionado: {file.name}
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  Tamanho: {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <FileSpreadsheet className="w-12 h-12 text-muted-foreground mx-auto" />
                <p className="font-medium">Clique para selecionar o arquivo</p>
                <p className="text-sm text-muted-foreground">
                  Suporta arquivos CSV e Excel (.xlsx)
                </p>
              </div>
            )}
            
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
            >
              {file ? 'Trocar Arquivo' : 'Selecionar Arquivo'}
            </Button>
          </div>

          {/* Import Button */}
          {file && (
            <div className="space-y-4">
              {importing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Processando...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="w-full" />
                </div>
              )}
              
              <Button 
                onClick={processImport}
                disabled={importing}
                className="w-full"
              >
                {importing ? 'Processando...' : 'Iniciar Importação'}
              </Button>
            </div>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-4">
            <h3 className="font-semibold">Resultado da Importação</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800 dark:text-green-200">
                    Sucessos: {result.success}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                <XCircle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-800 dark:text-red-200">
                    Erros: {result.errors}
                  </p>
                </div>
              </div>
            </div>

            {/* Error Details */}
            {result.details && result.details.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Detalhes dos Erros:</h4>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {result.details.map((detail, index) => (
                    <div key={index} className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-950 rounded text-sm">
                      <Badge variant="outline" className="text-red-600">
                        Linha {detail.line}
                      </Badge>
                      <span className="text-red-700 dark:text-red-300">
                        {detail.error}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CepBulkImport;