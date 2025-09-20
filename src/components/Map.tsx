import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const Map = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map
    mapboxgl.accessToken = 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-47.8822, -15.7942], // Brasília coordinates
      zoom: 15,
    });

    // Add marker for company location
    new mapboxgl.Marker({
      color: '#f48120'
    })
    .setLngLat([-47.8822, -15.7942])
    .setPopup(
      new mapboxgl.Popup({ offset: 25 })
        .setHTML('<div class="text-center"><strong>SUPERNET FIBRA</strong><br>Setor de Industria Gráfica (SIG), 25<br>Brasília, DF</div>')
    )
    .addTo(map.current);

    // Add navigation controls
    map.current.addControl(
      new mapboxgl.NavigationControl(),
      'top-right'
    );

    // Cleanup
    return () => {
      map.current?.remove();
    };
  }, []);

  return (
    <div className="w-full h-64 rounded-lg overflow-hidden shadow-sm">
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
};

export default Map;