import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Plus, Edit, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import CepManagement from './CepManagement';

interface CoverageArea {
  id: string;
  name: string;
  region_code: string;
  color: string;
  coordinates: unknown;
  active: boolean;
}

const CoverageManagement = () => {
  const [areas, setAreas] = useState<CoverageArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingArea, setEditingArea] = useState<CoverageArea | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    region_code: '',
    color: '#3b82f6',
    coordinates: '',
    active: true
  });

  const predefinedColors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
    '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
  ];

  const sampleCoordinates = `[
  [-15.7942, -47.8822],
  [-15.7950, -47.8830],  
  [-15.7960, -47.8825],
  [-15.7955, -47.8815]
]`;

  const resetForm = () => {
    setFormData({
      name: '',
      region_code: '',
      color: '#3b82f6',
      coordinates: '',
      active: true
    });
    setEditingArea(null);
    setShowForm(false);
  };

  useEffect(() => {
    loadCoverageAreas();
  }, []);

  const loadCoverageAreas = async () => {
    try {
      const { data, error } = await supabase
        .from('coverage_areas')
        .select('*')
        .order('name');

      if (error) throw error;
      setAreas(data || []);
    } catch (error) {
      console.error('Error loading coverage areas:', error);
      toast.error('Erro ao carregar áreas de cobertura');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveArea = async () => {
    if (!formData.name || !formData.coordinates) {
      toast.error('Nome e coordenadas são obrigatórios');
      return;
    }

    try {
      // Validar JSON das coordenadas
      let coordinates;
      try {
        coordinates = JSON.parse(formData.coordinates);
        if (!Array.isArray(coordinates)) {
          throw new Error('Coordenadas devem ser um array');
        }
      } catch (e) {
        toast.error('Formato de coordenadas inválido. Use formato JSON: [[-15.7942, -47.8822], ...]');
        return;
      }

      const areaData = {
        name: formData.name,
        region_code: formData.region_code || formData.name.toUpperCase().replace(/\s/g, '_'),
        color: formData.color,
        coordinates: coordinates,
        active: formData.active
      };

      if (editingArea) {
        // Atualizar área existente
        const { error } = await supabase
          .from('coverage_areas')
          .update(areaData)
          .eq('id', editingArea.id);

        if (error) throw error;
        toast.success('Área atualizada com sucesso!');
      } else {
        // Criar nova área
        const { error } = await supabase
          .from('coverage_areas')
          .insert([areaData]);

        if (error) throw error;
        toast.success('Área criada com sucesso!');
      }

      resetForm();
      loadCoverageAreas();
    } catch (error) {
      console.error('Error saving area:', error);
      toast.error('Erro ao salvar área');
    }
  };

  const handleEditArea = (area: CoverageArea) => {
    setEditingArea(area);
    setFormData({
      name: area.name,
      region_code: area.region_code,
      color: area.color,
      coordinates: JSON.stringify(area.coordinates, null, 2),
      active: area.active
    });
    setShowForm(true);
  };

  const handleDeleteArea = async (areaId: string, areaName: string) => {
    if (!confirm(`Tem certeza que deseja excluir a área "${areaName}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('coverage_areas')
        .delete()
        .eq('id', areaId);

      if (error) throw error;
      
      toast.success('Área excluída com sucesso!');
      loadCoverageAreas();
    } catch (error) {
      console.error('Error deleting area:', error);
      toast.error('Erro ao excluir área');
    }
  };

  const toggleAreaActive = async (areaId: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('coverage_areas')
        .update({ active: !currentActive })
        .eq('id', areaId);

      if (error) throw error;
      
      setAreas(areas.map(area => 
        area.id === areaId 
          ? { ...area, active: !currentActive }
          : area
      ));
      
      toast.success(`Área ${!currentActive ? 'ativada' : 'desativada'} com sucesso!`);
    } catch (error) {
      console.error('Error updating area:', error);
      toast.error('Erro ao atualizar área');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Cobertura</h1>
          <p className="text-muted-foreground">
            Configure áreas geográficas de cobertura e gerencie CEPs
          </p>
        </div>
      </div>

      <Tabs defaultValue="areas" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="areas">Áreas de Cobertura</TabsTrigger>
          <TabsTrigger value="ceps">Gestão de CEPs</TabsTrigger>
        </TabsList>

        <TabsContent value="areas" className="space-y-6">
          {/* Botão para adicionar nova área */}
          <div className="flex justify-end">
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Área
            </Button>
          </div>

          {/* Formulário de área */}
          {showForm && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingArea ? 'Editar Área de Cobertura' : 'Nova Área de Cobertura'}
                </CardTitle>
                <CardDescription>
                  Configure uma nova área geográfica para cobertura de serviços
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Nome da Área *</label>
                    <Input
                      placeholder="Ex: SIG Norte"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Código da Região</label>
                    <Input
                      placeholder="Ex: SIG_NORTE"
                      value={formData.region_code}
                      onChange={(e) => setFormData({ ...formData, region_code: e.target.value })}
                    />
                    <small className="text-muted-foreground">
                      Deixe vazio para gerar automaticamente
                    </small>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Cor da Área</label>
                  <div className="flex gap-2 mt-2">
                    {predefinedColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`w-8 h-8 rounded-full border-2 ${
                          formData.color === color ? 'border-gray-900' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setFormData({ ...formData, color })}
                      />
                    ))}
                    <Input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-20 h-8 p-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Coordenadas do Polígono *</label>
                  <textarea
                    className="w-full h-32 p-3 border rounded-md font-mono text-sm"
                    placeholder={sampleCoordinates}
                    value={formData.coordinates}
                    onChange={(e) => setFormData({ ...formData, coordinates: e.target.value })}
                  />
                  <small className="text-muted-foreground">
                    Formato JSON: Array de pontos [latitude, longitude]. Use ferramentas como{' '}
                    <a 
                      href="https://geojson.io" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      geojson.io
                    </a> para gerar coordenadas.
                  </small>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="active"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="active" className="text-sm">Área ativa</label>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSaveArea}>
                    {editingArea ? 'Atualizar' : 'Criar'} Área
                  </Button>
                  <Button variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lista de áreas */}
          <Card>
            <CardHeader>
              <CardTitle>Áreas Cadastradas ({areas.length})</CardTitle>
              <CardDescription>
                Gerencie as áreas geográficas de cobertura no mapa
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">Carregando áreas de cobertura...</p>
              ) : areas.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-2">Nenhuma área de cobertura cadastrada</p>
                  <Button onClick={() => setShowForm(true)} variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Criar primeira área
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {areas.map((area) => (
                    <div
                      key={area.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <div 
                          className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                          style={{ backgroundColor: area.color }}
                        />
                        <div>
                          <h3 className="font-semibold">{area.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Código: {area.region_code}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {Array.isArray(area.coordinates) ? area.coordinates.length : 0} pontos
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge 
                          variant={area.active ? "default" : "secondary"}
                          className="cursor-pointer"
                          onClick={() => toggleAreaActive(area.id, area.active)}
                        >
                          {area.active ? 'Ativa' : 'Inativa'}
                        </Badge>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditArea(area)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteArea(area.id, area.name)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ceps" className="space-y-6">
          <CepManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CoverageManagement;