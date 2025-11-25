import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Plus, Search, MapPin, Package, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import CepBulkImport from './CepBulkImport';

interface CoverageArea {
  id: string;
  name: string;
  color: string;
}

interface Plan {
  id: string;
  name: string;
  speed: string;
  price: number;
}

interface CepData {
  id: string;
  cep_start: string;
  cep_end: string;
  region_name: string;
  coverage_area_id: string;
  available: boolean;
  coordinates: unknown;
  coverage_area?: CoverageArea;
  plans?: Plan[];
}

const CepManagement = () => {
  const [ceps, setCeps] = useState<CepData[]>([]);
  const [coverageAreas, setCoverageAreas] = useState<CoverageArea[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Formulário para novo CEP
  const [newCep, setNewCep] = useState({
    cep_start: '',
    cep_end: '',
    region_name: '',
    coverage_area_id: '',
    coordinates: '',
    available: true,
    selected_plans: [] as string[]
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Carregar áreas de cobertura
      const { data: areasData } = await supabase
        .from('coverage_areas')
        .select('id, name, color')
        .order('name');

      // Carregar planos
      const { data: plansData } = await supabase
        .from('plans')
        .select('id, name, speed, price')
        .eq('active', true)
        .order('display_order');

      // Carregar CEPs com relacionamentos
      const { data: cepsData } = await supabase
        .from('cep_coverage')
        .select(`
          id,
          cep_start,
          cep_end,
          region_name,
          coverage_area_id,
          available,
          coordinates,
          coverage_areas (
            id,
            name,
            color
          )
        `)
        .order('cep_start');

      // Carregar planos por CEP
      const { data: cepPlansData } = await supabase
        .from('cep_plans')
        .select(`
          cep_coverage_id,
          plans (
            id,
            name,
            speed,
            price
          )
        `);

      // Associar planos aos CEPs
      const cepsWithPlans = cepsData?.map(cep => {
        const cepPlans = cepPlansData
          ?.filter(cp => cp.cep_coverage_id === cep.id)
          .map(cp => cp.plans)
          .filter(Boolean) || [];

        return {
          ...cep,
          coverage_area: cep.coverage_areas,
          plans: cepPlans
        };
      }) || [];

      setCoverageAreas(areasData || []);
      setPlans(plansData || []);
      setCeps(cepsWithPlans);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCep = async () => {
    if (!newCep.cep_start || !newCep.region_name || !newCep.coverage_area_id) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    try {
      // Processar coordenadas se fornecidas
      let coordinates = null;
      if (newCep.coordinates) {
        const [lat, lng] = newCep.coordinates.split(',').map(coord => parseFloat(coord.trim()));
        if (!isNaN(lat) && !isNaN(lng)) {
          coordinates = { x: lng, y: lat };
        }
      }

      // Inserir CEP
      const { data: cepData, error: cepError } = await supabase
        .from('cep_coverage')
        .insert({
          cep_start: newCep.cep_start.replace(/\D/g, ''),
          cep_end: newCep.cep_end.replace(/\D/g, '') || newCep.cep_start.replace(/\D/g, ''),
          region_name: newCep.region_name,
          coverage_area_id: newCep.coverage_area_id,
          coordinates,
          available: newCep.available
        })
        .select()
        .single();

      if (cepError) throw cepError;

      // Inserir planos selecionados
      if (newCep.selected_plans.length > 0) {
        const planInserts = newCep.selected_plans.map(planId => ({
          cep_coverage_id: cepData.id,
          plan_id: planId
        }));

        const { error: plansError } = await supabase
          .from('cep_plans')
          .insert(planInserts);

        if (plansError) throw plansError;
      }

      toast.success('CEP adicionado com sucesso');
      setNewCep({
        cep_start: '',
        cep_end: '',
        region_name: '',
        coverage_area_id: '',
        coordinates: '',
        available: true,
        selected_plans: []
      });
      loadData();
    } catch (error) {
      console.error('Erro ao adicionar CEP:', error);
      toast.error('Erro ao adicionar CEP');
    }
  };

  const handleDeleteCep = async (cepId: string) => {
    try {
      // Remover relacionamentos com planos
      await supabase
        .from('cep_plans')
        .delete()
        .eq('cep_coverage_id', cepId);

      // Remover CEP
      const { error } = await supabase
        .from('cep_coverage')
        .delete()
        .eq('id', cepId);

      if (error) throw error;

      toast.success('CEP removido com sucesso');
      loadData();
    } catch (error) {
      console.error('Erro ao remover CEP:', error);
      toast.error('Erro ao remover CEP');
    }
  };

  const handleToggleAvailable = async (cepId: string, available: boolean) => {
    try {
      const { error } = await supabase
        .from('cep_coverage')
        .update({ available: !available })
        .eq('id', cepId);

      if (error) throw error;

      toast.success('Status atualizado');
      loadData();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const formatCep = (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    return cleanCep.replace(/(\d{5})(\d{3})/, '$1-$2');
  };

  const filteredCeps = ceps.filter(cep => 
    cep.cep_start.includes(searchTerm.replace(/\D/g, '')) ||
    cep.region_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cep.coverage_area?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex justify-center items-center p-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gerenciamento de CEPs</h1>
          <p className="text-muted-foreground">
            Configure a cobertura por CEPs e associe planos disponíveis
          </p>
        </div>
      </div>

      <Tabs defaultValue="manual" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="manual">Cadastro Manual</TabsTrigger>
          <TabsTrigger value="bulk">Importação em Lote</TabsTrigger>
          <TabsTrigger value="list">CEPs Cadastrados</TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="space-y-6">
          {/* Formulário para adicionar novo CEP */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Adicionar Nova Faixa de CEP
              </CardTitle>
              <CardDescription>
                Configure a cobertura por faixas de CEP e associe os planos disponíveis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* ... keep existing form content */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="cep_start">CEP Inicial*</Label>
                  <Input
                    id="cep_start"
                    placeholder="70000-000"
                    value={newCep.cep_start}
                    onChange={(e) => setNewCep({ ...newCep, cep_start: e.target.value })}
                    maxLength={9}
                  />
                </div>

                <div>
                  <Label htmlFor="cep_end">CEP Final</Label>
                  <Input
                    id="cep_end"
                    placeholder="70999-999"
                    value={newCep.cep_end}
                    onChange={(e) => setNewCep({ ...newCep, cep_end: e.target.value })}
                    maxLength={9}
                  />
                  <small className="text-muted-foreground">Deixe vazio para CEP único</small>
                </div>

                <div>
                  <Label htmlFor="region_name">Nome da Região*</Label>
                  <Input
                    id="region_name"
                    placeholder="Ex: Asa Norte"
                    value={newCep.region_name}
                    onChange={(e) => setNewCep({ ...newCep, region_name: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="coverage_area">Área de Cobertura*</Label>
                  <Select 
                    value={newCep.coverage_area_id} 
                    onValueChange={(value) => setNewCep({ ...newCep, coverage_area_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma área" />
                    </SelectTrigger>
                    <SelectContent>
                      {coverageAreas.map((area) => (
                        <SelectItem key={area.id} value={area.id}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: area.color }}
                            />
                            {area.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="coordinates">Coordenadas (Lat, Lng)</Label>
                  <Input
                    id="coordinates"
                    placeholder="-15.7942, -47.8822"
                    value={newCep.coordinates}
                    onChange={(e) => setNewCep({ ...newCep, coordinates: e.target.value })}
                  />
                  <small className="text-muted-foreground">Opcional: latitude, longitude</small>
                </div>
              </div>

              <div>
                <Label>Planos Disponíveis</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                  {plans.map((plan) => (
                    <div key={plan.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`plan-${plan.id}`}
                        checked={newCep.selected_plans.includes(plan.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setNewCep({
                              ...newCep,
                              selected_plans: [...newCep.selected_plans, plan.id]
                            });
                          } else {
                            setNewCep({
                              ...newCep,
                              selected_plans: newCep.selected_plans.filter(id => id !== plan.id)
                            });
                          }
                        }}
                      />
                      <Label htmlFor={`plan-${plan.id}`} className="text-sm">
                        {plan.name} ({plan.speed})
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="available"
                  checked={newCep.available}
                  onCheckedChange={(checked) => setNewCep({ ...newCep, available: !!checked })}
                />
                <Label htmlFor="available">Cobertura ativa</Label>
              </div>

              <Button onClick={handleAddCep} className="w-full md:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar CEP
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-6">
          <CepBulkImport />
        </TabsContent>

        <TabsContent value="list" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                CEPs Cadastrados ({filteredCeps.length})
              </CardTitle>
              <div className="flex gap-2">
                <Input
                  placeholder="Buscar por CEP, região ou área..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-md"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredCeps.map((cep) => (
                  <div 
                    key={cep.id} 
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">
                            {formatCep(cep.cep_start)}
                            {cep.cep_end && cep.cep_end !== cep.cep_start && 
                              ` - ${formatCep(cep.cep_end)}`
                            }
                          </span>
                          <Badge 
                            variant={cep.available ? "default" : "secondary"}
                            className="ml-2"
                          >
                            {cep.available ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {cep.region_name}
                        </p>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: cep.coverage_area?.color }}
                          />
                          <span className="text-sm text-muted-foreground">
                            {cep.coverage_area?.name}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleAvailable(cep.id, cep.available)}
                        >
                          {cep.available ? "Desativar" : "Ativar"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteCep(cep.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {cep.plans && cep.plans.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Planos Disponíveis:</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {cep.plans.map((plan) => (
                            <Badge key={plan.id} variant="outline">
                              {plan.name} - {plan.speed} - R$ {plan.price}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {filteredCeps.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum CEP encontrado
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CepManagement;