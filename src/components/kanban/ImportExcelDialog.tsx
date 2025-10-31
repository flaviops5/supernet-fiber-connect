import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileSpreadsheet, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';
import type { KanbanColumn } from '@/hooks/useKanban';

interface ImportExcelDialogProps {
  open: boolean;
  onClose: () => void;
  boardId: string;
  columns: KanbanColumn[];
}

interface ExcelRow {
  escola: string;
  endereco: string;
  links: string;
  colunaL: string;
}

export function ImportExcelDialog({ open, onClose, boardId, columns }: ImportExcelDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<ExcelRow[]>([]);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      toast({
        title: 'Formato inválido',
        description: 'Por favor, selecione um arquivo Excel (.xlsx ou .xls)',
        variant: 'destructive',
      });
      return;
    }

    setFile(selectedFile);
    parseExcelFile(selectedFile);
  };

  const parseExcelFile = async (file: File) => {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      // Skip header row, get first 5 rows for preview
      const rows: ExcelRow[] = [];
      for (let i = 1; i < Math.min(6, jsonData.length); i++) {
        const row = jsonData[i];
        if (row && row.length >= 12) {
          rows.push({
            escola: row[2] || '', // Column C (index 2)
            endereco: row[3] || '', // Column D (index 3)
            links: row[8] || '', // Column I (index 8)
            colunaL: row[11] || '', // Column L (index 11)
          });
        }
      }

      setPreviewData(rows);
    } catch (error) {
      console.error('Error parsing Excel:', error);
      toast({
        title: 'Erro ao ler arquivo',
        description: 'Não foi possível processar o arquivo Excel',
        variant: 'destructive',
      });
    }
  };

  const handleImport = async () => {
    if (!file || !selectedColumn) {
      toast({
        title: 'Dados incompletos',
        description: 'Selecione um arquivo e uma coluna de destino',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      const cardsToInsert = [];
      
      // Skip header row (index 0)
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length < 12) continue;

        const escola = row[2]?.toString().trim();
        if (!escola) continue;

        cardsToInsert.push({
          board_id: boardId,
          column_id: selectedColumn,
          title: escola, // Column C
          description: row[11]?.toString().trim() || null, // Column L
          position: i - 1,
          priority: 'medium',
          address: row[3]?.toString().trim() || null, // Column D (Endereço)
          link_info: row[8]?.toString().trim() || null, // Column I (Link)
        });
      }

      if (cardsToInsert.length === 0) {
        toast({
          title: 'Nenhum dado encontrado',
          description: 'O arquivo não contém dados válidos para importar',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from('kanban_cards' as any)
        .insert(cardsToInsert);

      if (error) throw error;

      toast({
        title: 'Importação concluída',
        description: `${cardsToInsert.length} cards importados com sucesso!`,
      });

      setFile(null);
      setPreviewData([]);
      setSelectedColumn('');
      onClose();
    } catch (error: any) {
      console.error('Error importing Excel:', error);
      toast({
        title: 'Erro na importação',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar Excel</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="excel-file">Arquivo Excel</Label>
            <div className="flex items-center gap-2">
              <input
                id="excel-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                variant="outline"
                className="w-full"
                onClick={() => document.getElementById('excel-file')?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                {file ? file.name : 'Selecionar arquivo Excel'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Formato esperado: Colunas C (Escola), D (Endereço), I (Link), L (Descrição)
            </p>
          </div>

          {previewData.length > 0 && (
            <div className="space-y-2">
              <Label>Pré-visualização (primeiras 5 linhas)</Label>
              <div className="border rounded-md p-3 bg-muted/20 max-h-48 overflow-y-auto">
                {previewData.map((row, idx) => (
                  <div key={idx} className="flex items-center gap-2 py-1 text-sm">
                    <Check className="h-3 w-3 text-green-500" />
                    <span className="font-medium">{row.escola}</span>
                    {row.links && (
                      <span className="text-xs text-muted-foreground">
                        - {row.links}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="target-column">Coluna de Destino</Label>
            <Select value={selectedColumn} onValueChange={setSelectedColumn}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a coluna" />
              </SelectTrigger>
              <SelectContent>
                {columns.map((column) => (
                  <SelectItem key={column.id} value={column.id}>
                    {column.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={!file || !selectedColumn || loading}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              {loading ? 'Importando...' : 'Importar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
