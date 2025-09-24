import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in Leaflet with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Dados de exemplo das áreas de cobertura (substitua pelos seus dados reais)
const coverageAreas = [
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

const MapUpdater = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, 12);
  }, [map, center]);

  return null;
};

interface InteractiveMapProps {
  selectedLocation?: [number, number];
}

const InteractiveMap = ({ selectedLocation }: InteractiveMapProps) => {
  const defaultCenter: [number, number] = [-15.7942, -47.8822];
  const mapCenter = selectedLocation || defaultCenter;

  return (
    <div className="w-full h-96 rounded-lg overflow-hidden shadow-lg border border-border">
      <MapContainer
        center={mapCenter}
        zoom={11}
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {selectedLocation && <MapUpdater center={selectedLocation} />}
        
        {coverageAreas.map((area) => (
          <Polygon
            key={area.id}
            positions={area.coordinates as [number, number][]}
            pathOptions={{
              fillColor: area.color,
              fillOpacity: 0.3,
              color: area.color,
              weight: 2,
              opacity: 0.8
            }}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold text-foreground mb-2">{area.name}</h3>
                <p className="text-sm text-muted-foreground mb-2">Planos disponíveis:</p>
                <div className="flex flex-wrap gap-1">
                  {area.plans.map((plan) => (
                    <span
                      key={plan}
                      className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md"
                    >
                      {plan}
                    </span>
                  ))}
                </div>
              </div>
            </Popup>
          </Polygon>
        ))}
      </MapContainer>
    </div>
  );
};

export default InteractiveMap;