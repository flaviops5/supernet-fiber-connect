import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

// Dados de exemplo das áreas de cobertura (substitua pelos seus dados reais)
type LatLngTuple = [number, number];
interface CoverageArea {
  id: number;
  name: string;
  coordinates: LatLngTuple[];
  color: string;
  plans: string[];
}

const coverageAreas: CoverageArea[] = [
  {
    id: 1,
    name: 'Setor de Indústria Gráfica - SIG',
    coordinates: [
      [-15.7900, -47.8900],
      [-15.7900, -47.8800],
      [-15.7980, -47.8800],
      [-15.7980, -47.8900]
    ],
    color: '#3b82f6',
    plans: ['100MB', '200MB', '500MB', '1GB']
  },
  {
    id: 2,
    name: 'Região Central - Brasília',
    coordinates: [
      [-15.7800, -47.9200],
      [-15.7800, -47.9000],
      [-15.8000, -47.9000],
      [-15.8000, -47.9200]
    ],
    color: '#10b981',
    plans: ['200MB', '500MB', '1GB']
  },
  {
    id: 3,
    name: 'Taguatinga',
    coordinates: [
      [-15.8300, -48.0600],
      [-15.8300, -48.0400],
      [-15.8500, -48.0400],  
      [-15.8500, -48.0600]
    ],
    color: '#f59e0b',
    plans: ['100MB', '500MB', '1GB']
  }
];

interface InteractiveMapProps {
  selectedLocation?: [number, number];
}

const InteractiveMap = ({ selectedLocation }: InteractiveMapProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const defaultCenter: [number, number] = [-15.7942, -47.8822];

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

      // Coverage polygons
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

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

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
