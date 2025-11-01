import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileSpreadsheet, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';
import { z } from 'zod';
import type { KanbanColumn } from '@/hooks/useKanban';

interface ImportExcelDialogProps {
  open: boolean;
  onClose: () => void;
  boardId: string;
  columns: KanbanColumn[];
}

interface ExcelRow {
  municipio: string;
  escola: string;
  endereco: string;
  localizacao: string;
  linksTexto: string;
  dataInstalacao: string;
  periodo: string;
  provedorLocal: string;
  telefone: string;
  descricao: string;
}

export function ImportExcelDialog({ open, onClose, boardId, columns }: ImportExcelDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<ExcelRow[]>([]);
  const { toast } = useToast();

  // Helpers to detect column indexes by header names and extract cell hyperlinks
  const normalize = (s: any) => (s ?? '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  const detectColumns = (jsonData: any[][]) => {
    const header = (jsonData[0] || []).map((h) => normalize(h));
    const find = (keys: string[]) =>
      keys.map(normalize).map((k) => header.indexOf(k)).find((idx) => idx >= 0) ?? -1;

    // Try exact header match first, then fuzzy contains
    const byContains = (needles: string[]) => {
      const idx = header.findIndex((h) => needles.some((n) => h.includes(n)));
      return idx >= 0 ? idx : -1;
    };

    const municipioIdx = find(['municipio']) ?? byContains(['municip']);
    const escolaIdx = find(['escola']) ?? byContains(['escola']);
    const enderecoIdx = find(['endereco', 'endereço']) ?? byContains(['ender']);
    const localizacaoIdx = find(['localizacao', 'localização']) ?? byContains(['localiz']);
    const linksIdx = find(['links']) ?? byContains(['link']);
    const dataIdx = find(['data instalacao', 'data instalação', 'data']) ?? byContains(['data']);
    const descricaoIdx = find(['descricao', 'descrição']) ?? byContains(['descr']);
    const periodoIdx = find(['periodo', 'período']) ?? byContains(['period']);
    const provedorIdx = find(['provedor']) ?? byContains(['proved']);
    const telefoneIdx = find(['telefone']) ?? byContains(['telefon', 'fone']);

    return {
      municipioIdx,
      escolaIdx,
      enderecoIdx,
      localizacaoIdx,
      linksIdx,
      dataIdx,
      descricaoIdx,
      periodoIdx,
      provedorIdx,
      telefoneIdx,
    };
  };

  const getHyperlinkAt = (worksheet: XLSX.WorkSheet, rowIndex: number, colIndex: number) => {
    if (colIndex == null || colIndex < 0) return null;
    // jsonData rowIndex is 0-based; worksheet rows are 1-based in A1 notation, but we will use encode_cell with 0-based
    const address = XLSX.utils.encode_cell({ c: colIndex, r: rowIndex });
    const cell = (worksheet as any)[address];
    const url = cell?.l?.Target || cell?.l?.target || null;
    return url || null;
  };


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

      // Auto-detect column indices based on headers
      const cols = detectColumns(jsonData);

      // Skip header row, get first 5 rows for preview
      const rows: ExcelRow[] = [];
      for (let i = 1; i < Math.min(6, jsonData.length); i++) {
        const row = jsonData[i];
        if (row && row.length >= 1) {
          const escolaName = cols.escolaIdx >= 0 ? row[cols.escolaIdx] : '';
          if (escolaName) {
            rows.push({
              municipio: cols.municipioIdx >= 0 ? row[cols.municipioIdx] || '' : '',
              escola: escolaName,
              endereco: cols.enderecoIdx >= 0 ? row[cols.enderecoIdx] || '' : '',
              localizacao: getHyperlinkAt(worksheet, i, cols.localizacaoIdx) || (cols.localizacaoIdx >= 0 ? row[cols.localizacaoIdx] || '' : ''),
              linksTexto: cols.linksIdx >= 0 ? row[cols.linksIdx] || '' : '',
              dataInstalacao: cols.dataIdx >= 0 ? row[cols.dataIdx] || '' : '',
              descricao: cols.descricaoIdx >= 0 ? row[cols.descricaoIdx] || '' : '',
              periodo: cols.periodoIdx >= 0 ? row[cols.periodoIdx] || '' : '',
              provedorLocal: cols.provedorIdx >= 0 ? row[cols.provedorIdx] || '' : '',
              telefone: cols.telefoneIdx >= 0 ? row[cols.telefoneIdx] || '' : '',
            });
          }
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

      // Auto-detect column indices
      const cols = detectColumns(jsonData);

      // Schema simplificado: apenas os 5 campos que existem na planilha
      const CardInsertSchema = z.object({
        board_id: z.string().uuid(),
        column_id: z.string().uuid(),
        title: z.string().min(1, 'Escola é obrigatória').max(200),
        position: z.number().int().nonnegative(),
        priority: z.enum(['low','medium','high','urgent']),
        municipio: z.string().max(200).nullable().optional(),
        address: z.string().max(500).nullable().optional(),
        localizacao_url: z.string().nullable().optional(),
        links_texto: z.string().max(1000).nullable().optional(),
        // Campos que NÃO existem na planilha (serão null)
        description: z.null(),
        data_instalacao: z.null(),
        periodo: z.null(),
        provedor_local: z.null(),
        telefone: z.null(),
      });
      const cardsToInsert: any[] = [];
      // Skip header row (index 0)
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length < 1) continue;

        const escola = cols.escolaIdx >= 0 ? row[cols.escolaIdx]?.toString().trim() : '';
        if (!escola) continue;

        const municipioName = cols.municipioIdx >= 0 ? row[cols.municipioIdx]?.toString().trim() || '' : '';
        const enderecoVal = cols.enderecoIdx >= 0 ? row[cols.enderecoIdx]?.toString().trim() || '' : '';
        const linkCell = getHyperlinkAt(worksheet, i, cols.localizacaoIdx) || (cols.localizacaoIdx >= 0 ? row[cols.localizacaoIdx]?.toString().trim() || '' : '');

        // Parse date if present - only accept valid dates
        let dataInstalacao = null;
        if (cols.dataIdx >= 0 && row[cols.dataIdx]) {
          try {
            const dateValue = row[cols.dataIdx];
            if (typeof dateValue === 'number') {
              // Excel serial date
              const excelDate = XLSX.SSF.parse_date_code(dateValue);
              dataInstalacao = `${excelDate.y}-${String(excelDate.m).padStart(2, '0')}-${String(excelDate.d).padStart(2, '0')}`;
            } else if (typeof dateValue === 'string') {
              // Try to parse string as date
              const dateStr = dateValue.toString().trim();
              // Check if it matches common date formats (DD/MM/YYYY, YYYY-MM-DD, etc.)
              const dateRegex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$|^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/;
              if (dateRegex.test(dateStr)) {
                // Try to create a valid date
                const parsedDate = new Date(dateStr);
                if (!isNaN(parsedDate.getTime())) {
                  dataInstalacao = parsedDate.toISOString().split('T')[0];
                }
              }
            }
          } catch (e) {
            console.error('Error parsing date:', e);
            // dataInstalacao remains null
          }
        }

        // Clean link text: ignore numeric-only/"0" and build Google Maps fallback when needed
        const cleanText = (v: any) => {
          const s = (v ?? '').toString().trim();
          if (!s || s === '0') return null;
          return s;
        };

        let localizacaoUrl = linkCell && /^https?:/i.test(linkCell) ? linkCell : null;
        if (!localizacaoUrl) {
          const query = enderecoVal || `${escola} ${municipioName}`.trim();
          localizacaoUrl = query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : null;
        }

        cardsToInsert.push({
          board_id: boardId,
          column_id: selectedColumn,
          title: escola,
          position: i - 1,
          priority: 'medium' as const,
          // Apenas os 5 campos que existem na planilha
          municipio: municipioName || null,
          address: enderecoVal || null,
          localizacao_url: localizacaoUrl,
          links_texto: cleanText(cols.linksIdx >= 0 ? row[cols.linksIdx] : null),
          // Campos que NÃO existem (serão preenchidos manualmente depois)
          description: null,
          data_instalacao: null,
          periodo: null,
          provedor_local: null,
          telefone: null,
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

      // Validate and filter invalid rows (security)
      const parsedResults = cardsToInsert.map((c, idx) => ({
        idx,
        result: CardInsertSchema.safeParse(c),
        card: c,
      }));
      const validCardsToInsert = parsedResults
        .filter((p) => p.result.success)
        .map((p) => (p.result as any).data);
      const invalidCount = cardsToInsert.length - validCardsToInsert.length;

      // Log erros de validação no console para debug
      if (invalidCount > 0) {
        console.warn('Cards rejeitados na validação:');
        parsedResults
          .filter((p) => !p.result.success)
          .forEach((p) => {
            console.warn(`Linha ${p.idx + 1}:`, p.result.error?.issues, p.card);
          });
      }

      if (validCardsToInsert.length === 0) {
        toast({
          title: 'Nenhum dado válido',
          description: 'Todos os registros foram rejeitados. Verifique o console para detalhes.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }
      if (invalidCount > 0) {
        toast({
          title: 'Importação parcial',
          description: `${invalidCount} linhas ignoradas (veja console)`,
        });
      }

      const { error } = await supabase
        .from('kanban_cards' as any)
        .insert(validCardsToInsert);

      if (error) throw error;

      toast({
        title: 'Importação concluída',
        description: `${validCardsToInsert.length} cards importados com sucesso!`,
      });

      // Log audit event (non-blocking)
      try {
        await supabase.functions.invoke('kanban-audit', {
          body: {
            board_id: boardId,
            action: 'card_created',
            metadata: { imported_count: validCardsToInsert.length, source: 'excel_import' },
          },
        });
      } catch (auditErr) {
        console.warn('kanban-audit failed:', auditErr);
      }

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
                variant={file ? "default" : "outline"}
                className="w-full"
                onClick={() => document.getElementById('excel-file')?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                {file ? file.name : 'Selecionar arquivo Excel'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Formato esperado: Município, Escola, Endereço, Localização (link), Links. Os demais campos serão preenchidos manualmente.
            </p>
          </div>

          {previewData.length > 0 && (
            <div className="space-y-2">
              <Label>Pré-visualização (primeiras 5 linhas)</Label>
              <div className="border rounded-md p-3 bg-muted/20 max-h-48 overflow-y-auto space-y-2">
                {previewData.map((row, idx) => (
                  <div key={idx} className="text-xs border-b pb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                      <span className="font-medium">{row.municipio} - {row.escola}</span>
                    </div>
                    <div className="ml-5 text-muted-foreground space-y-0.5">
                      {row.endereco && <div>📍 {row.endereco}</div>}
                      {row.linksTexto && <div>🔗 {row.linksTexto}</div>}
                      {row.provedorLocal && <div>👤 {row.provedorLocal}</div>}
                    </div>
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
              className={!file || !selectedColumn ? "opacity-50 cursor-not-allowed" : ""}
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
