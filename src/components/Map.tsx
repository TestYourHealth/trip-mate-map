import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';

export interface RouteInfo {
  distance: number;
  duration: number;
  name: string;
  isAlternate: boolean;
  trafficLevel: 'low' | 'moderate' | 'heavy';
}

export interface MapRef {
  showRoute: (origin: string, destination: string, waypoints?: string[]) => Promise<RouteInfo[] | null>;
  selectRoute: (index: number) => void;
  clearRoute: () => void;
}

const Map = forwardRef<MapRef>((_, ref) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const routingControl = useRef<L.Routing.Control | null>(null);
  const markers = useRef<L.Marker[]>([]);
  const alternateRouteLines = useRef<L.Polyline[]>([]);
  const selectedRouteIndex = useRef<number>(0);
  const routesData = useRef<RouteInfo[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const clearMarkers = () => {
    markers.current.forEach(m => m.remove());
    markers.current = [];
  };

  const clearAlternateLines = () => {
    alternateRouteLines.current.forEach(line => line.remove());
    alternateRouteLines.current = [];
  };

  // Simulate traffic levels based on time and route
  const getTrafficLevel = (routeIndex: number): 'low' | 'moderate' | 'heavy' => {
    const hour = new Date().getHours();
    const isRushHour = (hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 20);
    
    if (routeIndex === 0) {
      return isRushHour ? 'moderate' : 'low';
    } else if (routeIndex === 1) {
      return isRushHour ? 'heavy' : 'moderate';
    }
    return 'moderate';
  };

  const getRouteColor = (trafficLevel: 'low' | 'moderate' | 'heavy', isSelected: boolean) => {
    if (!isSelected) return '#6b7280'; // gray for unselected
    switch (trafficLevel) {
      case 'low': return '#22c55e'; // green
      case 'moderate': return '#f59e0b'; // amber
      case 'heavy': return '#ef4444'; // red
      default: return '#14b8a6'; // teal
    }
  };

  useImperativeHandle(ref, () => ({
    showRoute: async (origin: string, destination: string, waypoints: string[] = []) => {
      if (!map.current) return null;

      // Clear existing route and markers
      if (routingControl.current) {
        map.current.removeControl(routingControl.current);
        routingControl.current = null;
      }
      clearMarkers();
      clearAlternateLines();
      routesData.current = [];
      selectedRouteIndex.current = 0;

      try {
        // Geocode all locations
        const originCoords = await geocodeLocation(origin);
        const destCoords = await geocodeLocation(destination);
        
        if (!originCoords || !destCoords) return null;

        // Geocode waypoints
        const waypointCoords: { lat: number; lng: number }[] = [];
        for (const wp of waypoints) {
          if (wp.trim()) {
            const coords = await geocodeLocation(wp);
            if (coords) waypointCoords.push(coords);
          }
        }

        // Build all waypoints array for routing
        const allWaypoints = [
          L.latLng(originCoords.lat, originCoords.lng),
          ...waypointCoords.map(c => L.latLng(c.lat, c.lng)),
          L.latLng(destCoords.lat, destCoords.lng)
        ];

        return new Promise((resolve) => {
          const control = L.Routing.control({
            waypoints: allWaypoints,
            routeWhileDragging: false,
            showAlternatives: true,
            addWaypoints: false,
            fitSelectedRoutes: true,
            show: false,
            altLineOptions: {
              styles: [
                { color: '#6b7280', opacity: 0.5, weight: 5 },
                { color: '#9ca3af', opacity: 0.3, weight: 3 }
              ],
              extendToWaypoints: true,
              missingRouteTolerance: 0
            },
            lineOptions: {
              styles: [
                { color: '#22c55e', opacity: 0.8, weight: 6 },
                { color: '#16a34a', opacity: 1, weight: 4 }
              ],
              extendToWaypoints: true,
              missingRouteTolerance: 0
            }
          } as L.Routing.RoutingControlOptions);

          // Add origin marker (green)
          const originMarker = L.marker([originCoords.lat, originCoords.lng], {
            icon: L.divIcon({
              className: 'custom-marker',
              html: `<div style="
                width: 24px;
                height: 24px;
                background: #22c55e;
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              "></div>`,
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            })
          }).addTo(map.current!);
          markers.current.push(originMarker);

          // Add waypoint markers (amber)
          waypointCoords.forEach((coords, index) => {
            const wpMarker = L.marker([coords.lat, coords.lng], {
              icon: L.divIcon({
                className: 'custom-marker',
                html: `<div style="
                  width: 20px;
                  height: 20px;
                  background: #f59e0b;
                  border: 3px solid white;
                  border-radius: 50%;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 10px;
                  font-weight: bold;
                  color: white;
                ">${index + 1}</div>`,
                iconSize: [20, 20],
                iconAnchor: [10, 10]
              })
            }).addTo(map.current!);
            markers.current.push(wpMarker);
          });

          // Add destination marker (red)
          const destMarker = L.marker([destCoords.lat, destCoords.lng], {
            icon: L.divIcon({
              className: 'custom-marker',
              html: `<div style="
                width: 24px;
                height: 24px;
                background: #ef4444;
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              "></div>`,
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            })
          }).addTo(map.current!);
          markers.current.push(destMarker);

          control.addTo(map.current!);
          routingControl.current = control;

          control.on('routesfound', (e: L.Routing.RoutingResultEvent) => {
            const routes: RouteInfo[] = e.routes.map((route, index) => {
              const distance = Math.round(route.summary.totalDistance / 1000);
              const duration = Math.round((route.summary.totalTime / 3600) * 10) / 10;
              const trafficLevel = getTrafficLevel(index);
              
              // Add time based on traffic
              const trafficMultiplier = trafficLevel === 'heavy' ? 1.4 : trafficLevel === 'moderate' ? 1.2 : 1;
              const adjustedDuration = Math.round(duration * trafficMultiplier * 10) / 10;
              
              return {
                distance,
                duration: adjustedDuration,
                name: index === 0 ? 'Fastest Route' : `Alternative ${index}`,
                isAlternate: index > 0,
                trafficLevel
              };
            });

            routesData.current = routes;
            resolve(routes);
          });

          control.on('routingerror', () => {
            clearMarkers();
            resolve(null);
          });
        });
      } catch (error) {
        console.error('Routing error:', error);
        return null;
      }
    },
    selectRoute: (index: number) => {
      if (routingControl.current && routesData.current[index]) {
        selectedRouteIndex.current = index;
        // The routing control will handle the visual update
        const control = routingControl.current as any;
        if (control._routes && control._routes[index]) {
          control._selectedRoute = index;
          control._updateLines({ route: control._routes[index], alternatives: control._routes });
        }
      }
    },
    clearRoute: () => {
      if (map.current && routingControl.current) {
        map.current.removeControl(routingControl.current);
        routingControl.current = null;
      }
      clearMarkers();
      clearAlternateLines();
      routesData.current = [];
    }
  }));

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = L.map(mapContainer.current, {
      center: [20.5937, 78.9629], // Center of India
      zoom: 5,
      zoomControl: false,
    });

    // Dark theme tile layer from CartoDB
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map.current);

    // Add zoom control to bottom right
    L.control.zoom({
      position: 'bottomright',
    }).addTo(map.current);

    map.current.whenReady(() => {
      setIsLoaded(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  return (
    <div className="absolute inset-0 z-0">
      <div ref={mapContainer} className="absolute inset-0" />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-background z-[1]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-muted-foreground text-sm">Loading map...</span>
          </div>
        </div>
      )}
    </div>
  );
});

Map.displayName = 'Map';

// Geocode using Nominatim (free OpenStreetMap geocoding)
async function geocodeLocation(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=1`,
      {
        headers: {
          'User-Agent': 'TripMate/1.0'
        }
      }
    );
    const data = await response.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

export default Map;
