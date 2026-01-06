import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapProps {
  accessToken: string;
}

const Map: React.FC<MapProps> = ({ accessToken }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || !accessToken) return;

    mapboxgl.accessToken = accessToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-98.5795, 39.8283], // Center of USA
      zoom: 4,
      pitch: 45,
      bearing: -10,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'bottom-right'
    );

    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true,
        showUserHeading: true
      }),
      'bottom-right'
    );

    map.current.on('load', () => {
      setIsLoaded(true);
      
      map.current?.setFog({
        color: 'hsl(220, 20%, 10%)',
        'high-color': 'hsl(220, 30%, 15%)',
        'horizon-blend': 0.1,
        'space-color': 'hsl(220, 30%, 5%)',
        'star-intensity': 0.15,
      });
    });

    return () => {
      map.current?.remove();
    };
  }, [accessToken]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="absolute inset-0" />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-muted-foreground text-sm">Loading map...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Map;
