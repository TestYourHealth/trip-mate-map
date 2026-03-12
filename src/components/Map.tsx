import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
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
  setMapRotation: (heading: number | null) => void;
  resetNorth: () => void;
  getRotation: () => number;
}

interface MapProps {
  isNavigating?: boolean;
  heading?: number | null;
  onRotationChange?: (rotation: number) => void;
  tileTheme?: 'light' | 'dark';
}

const Map = forwardRef<MapRef, MapProps>(({ isNavigating = false, heading = null, onRotationChange, tileTheme = 'light' }, ref) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapWrapper = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const routingControl = useRef<L.Routing.Control | null>(null);
  const markers = useRef<L.Marker[]>([]);
  const userMarker = useRef<L.Marker | null>(null);
  const userAccuracyCircle = useRef<L.Circle | null>(null);
  const alternateRouteLines = useRef<L.Polyline[]>([]);
  const selectedRouteIndex = useRef<number>(0);
  const routesData = useRef<RouteInfo[]>([]);
  const routeCoordinates = useRef<L.LatLng[] | null>(null);
  const currentRotation = useRef<number>(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  
  // Two-finger rotation state
  const [manualRotation, _setManualRotation] = useState(0);
  const manualRotationRef = useRef(0);
  const setManualRotation = (val: number) => {
    manualRotationRef.current = val;
    _setManualRotation(val);
  };

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
        // Geocode all locations in parallel for faster loading
        const geocodePromises = [
          geocodeLocation(origin),
          geocodeLocation(destination),
          ...waypoints.filter(wp => wp.trim()).map(wp => geocodeLocation(wp))
        ];
        
        const results = await Promise.all(geocodePromises);
        const originCoords = results[0];
        const destCoords = results[1];
        const waypointCoords = results.slice(2).filter((c): c is { lat: number; lng: number } => c !== null);
        
        if (!originCoords || !destCoords) return null;

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

      const rotation = typeof heading === 'number' && !isNaN(heading) ? heading : 0;
      const accuracyRadius = Math.min(Math.max(accuracy || 50, 10), 200);
      
      // Blue dot icon for when NOT navigating
      const createBlueDotIcon = () => {
        return L.divIcon({
          className: 'user-location-marker',
          html: `
            <div style="position:relative;width:22px;height:22px;">
              <div style="
                position:absolute;inset:0;
                background:rgba(66,133,244,0.15);
                border-radius:50%;
                animation:blueDotPulse 2s ease-out infinite;
              "></div>
              <div style="
                position:absolute;top:3px;left:3px;
                width:16px;height:16px;
                background:#4285f4;
                border:3px solid white;
                border-radius:50%;
                box-shadow:0 1px 4px rgba(0,0,0,0.3);
              "></div>
            </div>
            <style>
              @keyframes blueDotPulse {
                0% { transform:scale(1); opacity:1; }
                100% { transform:scale(2.5); opacity:0; }
              }
            </style>
          `,
          iconSize: [22, 22],
          iconAnchor: [11, 11]
        });
      };

      // Navigation arrow icon for when navigating
      const createNavigationIcon = (rot: number) => {
        return L.divIcon({
          className: 'user-location-marker',
          html: `
            <div style="position:relative;width:48px;height:48px;">
              <div style="
                position:absolute;inset:0;
                transform:rotate(${rot}deg);
                transform-origin:center;
                transition:transform 0.3s ease-out;
              ">
                <svg viewBox="0 0 48 48" style="width:100%;height:100%;filter:drop-shadow(0 2px 6px rgba(66,133,244,0.5));">
                  <defs>
                    <linearGradient id="navArrowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style="stop-color:#5c9aff"/>
                      <stop offset="50%" style="stop-color:#4285f4"/>
                      <stop offset="100%" style="stop-color:#2b6dd6"/>
                    </linearGradient>
                  </defs>
                  <circle cx="24" cy="24" r="20" fill="white"/>
                  <circle cx="24" cy="24" r="16" fill="url(#navArrowGrad)"/>
                  <path d="M24 10 L31 28 L24 23 L17 28 Z" fill="white"/>
                </svg>
              </div>
            </div>
          `,
          iconSize: [48, 48],
          iconAnchor: [24, 24]
        });
      };

      const icon = isNavigating ? createNavigationIcon(rotation) : createBlueDotIcon();
      
      if (userMarker.current) {
        userMarker.current.setLatLng([lat, lng]);
        userMarker.current.setIcon(icon);
      } else {
        userMarker.current = L.marker([lat, lng], {
          icon,
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
          color: 'rgba(66, 133, 244, 0.6)',
          fillColor: 'rgba(66, 133, 244, 0.1)',
          fillOpacity: 0.15,
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
        // Reset rotation when exiting navigation
        if (mapWrapper.current) {
          mapWrapper.current.style.transform = 'rotate(0deg)';
          currentRotation.current = 0;
        }
      }
    },
    setMapRotation: (headingDeg: number | null) => {
      if (!mapWrapper.current || headingDeg === null) return;
      
      // Rotate map opposite to heading so "up" is always direction of travel
      const rotation = -headingDeg;
      currentRotation.current = rotation;
      mapWrapper.current.style.transform = `rotate(${rotation}deg)`;
      
      // Counter-rotate markers so they stay upright
      const markerElements = mapWrapper.current.querySelectorAll('.leaflet-marker-icon, .leaflet-popup');
      markerElements.forEach((el) => {
        (el as HTMLElement).style.transform = `${(el as HTMLElement).style.transform?.replace(/rotate\([^)]*\)/, '') || ''} rotate(${headingDeg}deg)`;
      });
    },
    resetNorth: () => {
      setManualRotation(0);
      onRotationChange?.(0);
      currentRotation.current = 0;
      if (mapWrapper.current) {
        mapWrapper.current.style.transform = 'rotate(0deg)';
        // Reset marker rotations
        const markerElements = mapWrapper.current.querySelectorAll('.leaflet-marker-icon, .leaflet-popup');
        markerElements.forEach((el) => {
          const htmlEl = el as HTMLElement;
          htmlEl.style.transform = htmlEl.style.transform?.replace(/rotate\([^)]*\)/g, '').trim() || '';
        });
      }
    },
    getRotation: () => {
      return manualRotationRef.current;
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
    // Use @2x retina tiles only on high DPI displays to save bandwidth
    const isRetina = window.devicePixelRatio > 1;
    const tileUrl = isRetina 
      ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png';
    
    L.tileLayer(tileUrl, {
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

  // Rotate map based on heading during navigation
  useEffect(() => {
    if (isNavigating && heading !== null && !isNaN(heading) && mapWrapper.current) {
      // Normalize heading to 0-360 range
      const normalizedHeading = ((heading % 360) + 360) % 360;
      const rotation = -normalizedHeading;
      currentRotation.current = rotation;
      mapWrapper.current.style.transform = `rotate(${rotation}deg)`;
      
      // Counter-rotate all markers and popups so they stay upright
      const markerElements = mapWrapper.current.querySelectorAll('.leaflet-marker-icon, .leaflet-popup');
      markerElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        // Remove any existing rotate transform and add new one
        const currentTransform = htmlEl.style.transform?.replace(/rotate\([^)]*\)/g, '').trim() || '';
        htmlEl.style.transform = `${currentTransform} rotate(${normalizedHeading}deg)`;
      });
    } else if (!isNavigating && mapWrapper.current) {
      mapWrapper.current.style.transform = 'rotate(0deg)';
      currentRotation.current = 0;
      
      // Reset marker rotations
      const markerElements = mapWrapper.current.querySelectorAll('.leaflet-marker-icon, .leaflet-popup');
      markerElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.transform = htmlEl.style.transform?.replace(/rotate\([^)]*\)/g, '').trim() || '';
      });
    }
  }, [heading, isNavigating]);

  // Two-finger twist rotation gesture (Google/Apple Maps style)
  useEffect(() => {
    if (!mapContainer.current) return;

    const container = mapContainer.current;

    const normalizeDelta = (deg: number) => {
      // convert any delta to the shortest path (-180..180) to avoid jump near 360/0 boundary
      let d = ((deg % 360) + 360) % 360;
      if (d > 180) d -= 360;
      return d;
    };

    const getAngle = (touch1: Touch, touch2: Touch): number => {
      const dx = touch2.clientX - touch1.clientX;
      const dy = touch2.clientY - touch1.clientY;
      return (Math.atan2(dy, dx) * 180) / Math.PI;
    };

    const lastAngle = { current: null as number | null };

    const applyRotation = (rotationDeg: number) => {
      if (!mapWrapper.current || isNavigating) return;

      // Rotate map opposite to the dial so it feels like Google Maps
      mapWrapper.current.style.transform = `rotate(${-rotationDeg}deg)`;
      currentRotation.current = -rotationDeg;

      // Counter-rotate markers/popup DOM so they stay upright
      const markerElements = mapWrapper.current.querySelectorAll('.leaflet-marker-icon, .leaflet-popup');
      markerElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        const base = htmlEl.style.transform?.replace(/rotate\([^)]*\)/g, '').trim() || '';
        htmlEl.style.transform = `${base} rotate(${rotationDeg}deg)`;
      });
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        lastAngle.current = getAngle(e.touches[0], e.touches[1]);

        // Remove smoothing while user is actively rotating (prevents laggy feel)
        if (mapWrapper.current) {
          mapWrapper.current.style.transition = 'none';
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || lastAngle.current === null || isNavigating) return;

      const currentAngle = getAngle(e.touches[0], e.touches[1]);
      const delta = normalizeDelta(currentAngle - lastAngle.current);
      lastAngle.current = currentAngle;

      const next = ((manualRotationRef.current + delta) % 360 + 360) % 360;
      setManualRotation(next);
      onRotationChange?.(next);
      applyRotation(next);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        lastAngle.current = null;

        // Restore smoothing after gesture
        if (mapWrapper.current) {
          mapWrapper.current.style.transition = '';
        }
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isNavigating, onRotationChange]);

  return (
    <div className="h-full w-full relative overflow-hidden">
      {/* Wrapper for rotation - 200% size to fully hide corners at any rotation angle */}
      <div 
        ref={mapWrapper}
        className="absolute transition-transform duration-200 ease-out"
        style={{
          width: '200%',
          height: '200%',
          top: '-50%',
          left: '-50%',
        }}
      >
        <div 
          ref={mapContainer} 
          className="h-full w-full [&_.leaflet-pane]:z-[1] [&_.leaflet-control]:z-[1]" 
        />
      </div>
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

// Geocoding cache to avoid repeated API calls
const geocodingCache: Record<string, { lat: number; lng: number }> = {};

// Geocode using Nominatim (free OpenStreetMap geocoding) with caching
async function geocodeLocation(query: string): Promise<{ lat: number; lng: number } | null> {
  const cacheKey = query.toLowerCase().trim();
  
  // Check cache first
  if (cacheKey in geocodingCache) {
    return geocodingCache[cacheKey];
  }

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
      const result = {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
      // Cache the result
      geocodingCache[cacheKey] = result;
      return result;
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

export default Map;
