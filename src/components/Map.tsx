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

export interface RouteInstruction {
  text: string;
  distance: number;
  type: string;
  modifier?: string;
}

export interface RouteResult {
  routes: RouteInfo[];
  instructions: RouteInstruction[];
}

export interface MapRef {
  showRoute: (origin: string, destination: string, waypoints?: string[]) => Promise<RouteResult | null>;
  selectRoute: (index: number) => void;
  clearRoute: () => void;
  updateUserLocation: (lat: number, lng: number, heading?: number | null, speed?: number | null, accuracy?: number) => void;
  centerOnUser: () => void;
  getRouteCoordinates: () => L.LatLng[] | null;
  setNavigationMode: (isNavigating: boolean) => void;
}

interface MapProps {
  isNavigating?: boolean;
}

const Map = forwardRef<MapRef, MapProps>(({ isNavigating = false }, ref) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const routingControl = useRef<L.Routing.Control | null>(null);
  const markers = useRef<L.Marker[]>([]);
  const userMarker = useRef<L.Marker | null>(null);
  const userAccuracyCircle = useRef<L.Circle | null>(null);
  const alternateRouteLines = useRef<L.Polyline[]>([]);
  const selectedRouteIndex = useRef<number>(0);
  const routesData = useRef<RouteInfo[]>([]);
  const routeCoordinates = useRef<L.LatLng[] | null>(null);
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

            // Extract instructions from the first route
            const instructions: RouteInstruction[] = [];
            if (e.routes[0] && e.routes[0].instructions) {
              e.routes[0].instructions.forEach((inst: any) => {
                instructions.push({
                  text: inst.text || 'Continue',
                  distance: inst.distance || 0,
                  type: inst.type || 'Straight',
                  modifier: inst.modifier
                });
              });
            }

            // Store route coordinates for proximity checking
            if (e.routes[0] && e.routes[0].coordinates) {
              routeCoordinates.current = e.routes[0].coordinates.map(
                (coord: any) => L.latLng(coord.lat, coord.lng)
              );
            }

            routesData.current = routes;
            resolve({ routes, instructions });
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
      routeCoordinates.current = null;
    },
    updateUserLocation: (lat: number, lng: number, heading?: number | null, speed?: number | null, accuracy?: number) => {
      if (!map.current) return;

      const rotation = heading !== null && heading !== undefined ? heading : 0;
      const speedKmh = speed !== null && speed !== undefined ? Math.round(speed * 3.6) : 0;
      const hasSpeed = speedKmh > 0;
      const accuracyRadius = accuracy || 50;
      
      // Google Maps style icon with navigation arrow and speed popup
      const createNavigationIcon = (rot: number, spd: number, showSpeed: boolean) => {
        return L.divIcon({
          className: 'user-location-marker',
          html: `
            <div class="gps-marker-container" style="
              position: relative;
              width: 60px;
              height: 80px;
              transform: translate(-30px, -60px);
            ">
              <!-- Speed Popup (Google Maps style) -->
              ${showSpeed ? `
              <div class="speed-popup" style="
                position: absolute;
                top: -8px;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border: 2px solid #4ade80;
                border-radius: 12px;
                padding: 4px 10px;
                box-shadow: 0 4px 20px rgba(74, 222, 128, 0.3), 0 0 0 1px rgba(255,255,255,0.1);
                white-space: nowrap;
                z-index: 10;
                animation: fadeInScale 0.3s ease-out;
              ">
                <div style="
                  font-size: 16px;
                  font-weight: 700;
                  color: #4ade80;
                  text-align: center;
                  line-height: 1.2;
                  text-shadow: 0 0 10px rgba(74, 222, 128, 0.5);
                ">${spd}</div>
                <div style="
                  font-size: 8px;
                  font-weight: 600;
                  color: rgba(255,255,255,0.7);
                  text-align: center;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                ">km/h</div>
              </div>
              ` : ''}
              
              <!-- Navigation Arrow (Google Maps blue arrow style) -->
              <div class="nav-arrow-wrapper" style="
                position: absolute;
                bottom: 0;
                left: 50%;
                transform: translateX(-50%) rotate(${rot}deg);
                transform-origin: center center;
                width: 44px;
                height: 44px;
                transition: transform 0.3s ease-out;
              ">
                <svg viewBox="0 0 44 44" style="width: 100%; height: 100%; filter: drop-shadow(0 2px 8px rgba(66, 133, 244, 0.5));">
                  <!-- Outer glow -->
                  <defs>
                    <radialGradient id="arrowGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" style="stop-color:#4285f4;stop-opacity:0.4" />
                      <stop offset="100%" style="stop-color:#4285f4;stop-opacity:0" />
                    </radialGradient>
                    <linearGradient id="arrowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style="stop-color:#5c9aff" />
                      <stop offset="50%" style="stop-color:#4285f4" />
                      <stop offset="100%" style="stop-color:#2b6dd6" />
                    </linearGradient>
                  </defs>
                  
                  <!-- Pulsing outer ring -->
                  <circle cx="22" cy="22" r="20" fill="url(#arrowGlow)" style="animation: pulseRing 2s ease-out infinite;" />
                  
                  <!-- White border circle -->
                  <circle cx="22" cy="22" r="18" fill="white" />
                  
                  <!-- Blue inner circle -->
                  <circle cx="22" cy="22" r="15" fill="url(#arrowGradient)" />
                  
                  <!-- Navigation arrow pointing UP (will be rotated by wrapper) -->
                  <path d="M22 10 L28 26 L22 22 L16 26 Z" fill="white" />
                </svg>
              </div>
            </div>
          `,
          iconSize: [60, 80],
          iconAnchor: [30, 80]
        });
      };
      
      // Create or update user marker
      if (userMarker.current) {
        userMarker.current.setLatLng([lat, lng]);
        // Update the icon with new rotation and speed
        userMarker.current.setIcon(createNavigationIcon(rotation, speedKmh, hasSpeed));
      } else {
        userMarker.current = L.marker([lat, lng], {
          icon: createNavigationIcon(rotation, speedKmh, hasSpeed),
          zIndexOffset: 1000
        }).addTo(map.current);
      }

      // Update or create accuracy circle
      if (userAccuracyCircle.current) {
        userAccuracyCircle.current.setLatLng([lat, lng]);
        userAccuracyCircle.current.setRadius(accuracyRadius);
      } else {
        userAccuracyCircle.current = L.circle([lat, lng], {
          radius: accuracyRadius,
          color: 'rgba(66, 133, 244, 0.8)',
          fillColor: 'rgba(66, 133, 244, 0.15)',
          fillOpacity: 0.2,
          weight: 2
        }).addTo(map.current);
      }
    },
    centerOnUser: () => {
      if (map.current && userMarker.current) {
        const latlng = userMarker.current.getLatLng();
        map.current.setView(latlng, 17, { animate: true });
      }
    },
    getRouteCoordinates: () => {
      return routeCoordinates.current;
    },
    setNavigationMode: (navigating: boolean) => {
      if (!map.current) return;
      
      const container = map.current.getContainer();
      const zoomControl = container.querySelector('.leaflet-control-zoom');
      const attribution = container.querySelector('.leaflet-control-attribution');
      
      if (navigating) {
        // Hide controls during navigation
        if (zoomControl) (zoomControl as HTMLElement).style.display = 'none';
        if (attribution) (attribution as HTMLElement).style.display = 'none';
        // Zoom in for navigation
        if (userMarker.current) {
          const latlng = userMarker.current.getLatLng();
          map.current.setView(latlng, 17, { animate: true });
        }
      } else {
        // Show controls when not navigating
        if (zoomControl) (zoomControl as HTMLElement).style.display = '';
        if (attribution) (attribution as HTMLElement).style.display = '';
      }
    }
  }));

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = L.map(mapContainer.current, {
      center: [20.5937, 78.9629], // Center of India
      zoom: 5,
      zoomControl: false,
    });

    // Light theme tile layer from CartoDB
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
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
      // Force map to recalculate size after container is properly sized
      setTimeout(() => {
        map.current?.invalidateSize();
      }, 100);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Handle navigation mode changes
  useEffect(() => {
    if (!map.current) return;
    
    const container = map.current.getContainer();
    const zoomControl = container.querySelector('.leaflet-control-zoom');
    const attribution = container.querySelector('.leaflet-control-attribution');
    
    if (isNavigating) {
      if (zoomControl) (zoomControl as HTMLElement).style.display = 'none';
      if (attribution) (attribution as HTMLElement).style.display = 'none';
    } else {
      if (zoomControl) (zoomControl as HTMLElement).style.display = '';
      if (attribution) (attribution as HTMLElement).style.display = '';
    }
  }, [isNavigating]);

  return (
    <div className="h-full w-full relative">
      <div 
        ref={mapContainer} 
        className="h-full w-full [&_.leaflet-pane]:z-[1] [&_.leaflet-control]:z-[1]" 
      />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-background z-[2]">
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
