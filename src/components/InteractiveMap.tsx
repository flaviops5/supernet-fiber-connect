import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/integrations/supabase/client';

// Fix for default markers in Leaflet with Vite
const initializeLeafletIcons = () => {
  // Avoid errors if called multiple times
  // @ts-expect-error private api
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
};

type LatLngTuple = [number, number];
interface CoverageArea {
  id: string;
  name: string;
  coordinates: LatLngTuple[];
  color: string;
  plans: string[];
}

interface InteractiveMapProps {
  selectedLocation?: [number, number];
}

const InteractiveMap = ({ selectedLocation }: InteractiveMapProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [coverageAreas, setCoverageAreas] = useState<CoverageArea[]>([]);
  const defaultCenter: [number, number] = [-15.7942, -47.8822];

  // Carregar áreas de cobertura do Supabase
  const loadCoverageAreas = async () => {
    try {
      const { data, error } = await supabase
        .from('coverage_areas')
        .select(`
          id,
          name,
          coordinates,
          color,
          cep_coverage (
            cep_plans (
              plans (
                speed
              )
            )
          )
        `)
        .eq('active', true);

      if (error) {
        console.error('Erro ao carregar áreas de cobertura:', error);
        return;
      }

      const areas: CoverageArea[] = data?.map((area) => {
        // Extrair planos únicos das relações
        const plansSet = new Set<string>();
        area.cep_coverage?.forEach((cep: any) => {
          cep.cep_plans?.forEach((cp: any) => {
            if (cp.plans?.speed) {
              plansSet.add(cp.plans.speed);
            }
          });
        });

        return {
          id: area.id,
          name: area.name,
          coordinates: (() => {
            try {
              return JSON.parse(area.coordinates as string) as LatLngTuple[];
            } catch (error) {
              console.error('Error parsing coordinates for area:', area.name, error);
              return [] as LatLngTuple[];
            }
          })(),
          color: area.color,
          plans: Array.from(plansSet)
        };
      }) || [];

      setCoverageAreas(areas);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    }
  };

  // Inicializar mapa primeiro
  useEffect(() => {
    initializeLeafletIcons();

    if (containerRef.current && !mapRef.current) {
      // Create map
      mapRef.current = L.map(containerRef.current, {
        center: selectedLocation || defaultCenter,
        zoom: 11,
        scrollWheelZoom: true,
      });

      // Base layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(mapRef.current);

      // Carregar dados após inicializar o mapa
      loadCoverageAreas();
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Adicionar polígonos quando áreas são carregadas
  useEffect(() => {
    if (mapRef.current && coverageAreas.length > 0) {
      // Limpar polígonos existentes
      mapRef.current.eachLayer((layer) => {
        if (layer instanceof L.Polygon) {
          mapRef.current!.removeLayer(layer);
        }
      });

      // Adicionar novos polígonos
      coverageAreas.forEach((area) => {
        const polygon = L.polygon(area.coordinates as L.LatLngExpression[], {
          color: area.color,
          weight: 2,
          opacity: 0.8,
          fillColor: area.color,
          fillOpacity: 0.3,
        }).addTo(mapRef.current!);

        const plansHtml = area.plans
          .map((p) => `<span style="display:inline-block;margin:2px;padding:4px 6px;border-radius:6px;background:rgba(0,0,0,0.05);color:#111;font-size:12px;">${p}</span>`) 
          .join('');

        polygon.bindPopup(
          `<div style="padding:4px 2px;">
            <div style="font-weight:600;margin-bottom:6px;">${area.name}</div>
            <div style="font-size:12px;color:#555;margin-bottom:4px;">Planos disponíveis:</div>
            <div>${plansHtml}</div>
          </div>`
        );
      });
    }
  }, [coverageAreas]);

  // Update center when selectedLocation changes
  useEffect(() => {
    if (mapRef.current && selectedLocation) {
      mapRef.current.setView(selectedLocation, 12);
      // Optional: add or move a marker to highlight selection
      // L.marker(selectedLocation).addTo(mapRef.current);
    }
  }, [selectedLocation]);

  return (
    <div className="w-full h-96 rounded-lg overflow-hidden shadow-lg border border-border">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
};

export default InteractiveMap;
