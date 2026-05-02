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

export interface NearbyPlace {
  lat: number;
  lng: number;
  name: string;
  address: string;
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
  showNearbyMarkers: (places: NearbyPlace[], color?: string) => void;
  clearNearbyMarkers: () => void;
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
  const nearbyMarkers = useRef<L.Marker[]>([]);
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

  // Safe counter-rotation of markers to prevent transform corruption
  const counterRotateMarkers = (wrapper: HTMLElement, degrees: number) => {
    const markerElements = wrapper.querySelectorAll('.leaflet-marker-icon, .leaflet-popup');
    markerElements.forEach((el) => {
      const htmlEl = el as HTMLElement;
      // Store Leaflet's original transform separately, only modify rotation
      const baseTransform = htmlEl.style.transform?.replace(/\s*rotate\([^)]*\)/g, '').trim() || '';
      htmlEl.style.transform = degrees === 0 ? baseTransform : `${baseTransform} rotate(${degrees}deg)`;
    });
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

              // Add traffic-colored segments overlay on the primary route
              const coords = routeCoordinates.current;
              if (coords && coords.length > 10 && map.current) {
                clearAlternateLines();
                const segmentSize = Math.max(5, Math.floor(coords.length / 6));
                const trafficColors = ['#22c55e', '#22c55e', '#eab308', '#22c55e', '#ef4444', '#22c55e']; // simulated
                const hour = new Date().getHours();
                const isRush = (hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 20);

                for (let i = 0; i < coords.length - 1; i += segmentSize) {
                  const end = Math.min(i + segmentSize + 1, coords.length);
                  const segment = coords.slice(i, end);
                  const segIndex = Math.floor(i / segmentSize);
                  // During rush hours, some segments turn yellow/red
                  const color = isRush ? (trafficColors[segIndex % trafficColors.length]) : '#22c55e';
                  
                  const line = L.polyline(segment, {
                    color,
                    weight: 7,
                    opacity: 0.7,
                    className: 'traffic-overlay'
                  }).addTo(map.current!);
                  alternateRouteLines.current.push(line);
                }
              }
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
        try {
          const control = routingControl.current as any;
          // Try multiple internal API patterns (varies by LRM version)
          if (control._routes && control._routes[index] && typeof control._updateLines === 'function') {
            control._selectedRoute = index;
            control._updateLines({ route: control._routes[index], alternatives: control._routes });
          } else if (typeof control.route === 'function') {
            // Fallback: re-route to force visual update
            control.spliceWaypoints(0, 0); // no-op splice triggers redraw
          }
          
          // Update route coordinates for the selected route
          if (control._routes && control._routes[index]?.coordinates) {
            routeCoordinates.current = control._routes[index].coordinates.map(
              (coord: any) => L.latLng(coord.lat, coord.lng)
            );
          }
        } catch (e) {
          console.warn('Route selection visual update failed:', e);
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
      
      const rotation = -headingDeg;
      currentRotation.current = rotation;
      mapWrapper.current.style.transform = `rotate(${rotation}deg)`;
      
      // Counter-rotate markers using data attribute to avoid transform corruption
      counterRotateMarkers(mapWrapper.current, headingDeg);
    },
    resetNorth: () => {
      setManualRotation(0);
      onRotationChange?.(0);
      currentRotation.current = 0;
      if (mapWrapper.current) {
        mapWrapper.current.style.transform = 'rotate(0deg)';
        counterRotateMarkers(mapWrapper.current, 0);
      }
    },
    getRotation: () => {
      return manualRotationRef.current;
    },
    showNearbyMarkers: (places: NearbyPlace[], color = '#ef4444') => {
      if (!map.current) return;
      // Clear existing nearby markers
      nearbyMarkers.current.forEach(m => m.remove());
      nearbyMarkers.current = [];
      
      const bounds = L.latLngBounds([]);
      places.forEach((place, i) => {
        const marker = L.marker([place.lat, place.lng], {
          icon: L.divIcon({
            className: 'nearby-marker',
            html: `<div style="
              width: 32px; height: 32px;
              background: ${color}; border: 3px solid white;
              border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.35);
              display: flex; align-items: center; justify-content: center;
              font-size: 14px; font-weight: bold; color: white;
            ">${i + 1}</div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          })
        }).addTo(map.current!);
        
        marker.bindPopup(`<b>${place.name}</b><br/><small>${place.address}</small>`, {
          className: 'nearby-popup'
        });
        
        nearbyMarkers.current.push(marker);
        bounds.extend([place.lat, place.lng]);
      });
      
      // Also include user position in bounds if available
      if (userMarker.current) {
        bounds.extend(userMarker.current.getLatLng());
      }
      
      if (bounds.isValid()) {
        map.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }
    },
    clearNearbyMarkers: () => {
      nearbyMarkers.current.forEach(m => m.remove());
      nearbyMarkers.current = [];
    }
  }));

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = L.map(mapContainer.current, {
      center: [20.5937, 78.9629], // Center of India
      zoom: 5,
      zoomControl: false,
    });

    // Theme-aware tile layer from CartoDB
    const isRetina = window.devicePixelRatio > 1;
    const suffix = isRetina ? '@2x' : '';
    const initialTileUrl = tileTheme === 'dark'
      ? `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}${suffix}.png`
      : `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}${suffix}.png`;
    
    tileLayerRef.current = L.tileLayer(initialTileUrl, {
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
      userMarker.current = null;
      userAccuracyCircle.current = null;
      tileLayerRef.current = null;
      routeCoordinates.current = null;
      routesData.current = [];
    };
  }, []);

  // Switch tile layer when theme changes
  useEffect(() => {
    if (!map.current || !tileLayerRef.current) return;
    const isRetina = window.devicePixelRatio > 1;
    const suffix = isRetina ? '@2x' : '';
    const newUrl = tileTheme === 'dark'
      ? `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}${suffix}.png`
      : `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}${suffix}.png`;
    tileLayerRef.current.setUrl(newUrl);
  }, [tileTheme]);

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
      const normalizedHeading = ((heading % 360) + 360) % 360;
      const rotation = -normalizedHeading;
      currentRotation.current = rotation;
      mapWrapper.current.style.transform = `rotate(${rotation}deg)`;
      counterRotateMarkers(mapWrapper.current, normalizedHeading);
    } else if (!isNavigating && mapWrapper.current) {
      mapWrapper.current.style.transform = 'rotate(0deg)';
      currentRotation.current = 0;
      counterRotateMarkers(mapWrapper.current, 0);
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
      mapWrapper.current.style.transform = `rotate(${-rotationDeg}deg)`;
      currentRotation.current = -rotationDeg;
      counterRotateMarkers(mapWrapper.current, rotationDeg);
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

// Pre-pick cache shared with LocationAutocomplete: when a user picks a suggestion
// we already have lat/lon — store it here so we don't re-geocode (which often
// fails due to rate limits or string mismatches).
function getPrePickedCoords(query: string): { lat: number; lng: number } | null {
  try {
    const raw = sessionStorage.getItem('pickedCoords');
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, { lat: number; lng: number }>;
    const key = query.toLowerCase().trim();
    return map[key] || null;
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, {
      headers: { 'User-Agent': 'TripMate/1.0', 'Accept': 'application/json' },
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

// Geocode using Nominatim with: pre-pick cache → memory cache → India search → global fallback → retry
async function geocodeLocation(query: string): Promise<{ lat: number; lng: number } | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;
  const cacheKey = trimmed.toLowerCase();

  // 1. User already picked this from autocomplete? Use those coords directly.
  const prePicked = getPrePickedCoords(trimmed);
  if (prePicked) {
    geocodingCache[cacheKey] = prePicked;
    return prePicked;
  }

  // 2. In-memory cache
  if (cacheKey in geocodingCache) return geocodingCache[cacheKey];

  // 3. Build progressively-relaxed query variants (helps when full address fails)
  const variants: string[] = [trimmed];
  const parts = trimmed.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length > 1) variants.push(parts.slice(0, 2).join(', '));
  if (parts.length > 0) variants.push(parts[0]);

  const tryFetch = async (q: string, global = false): Promise<{ lat: number; lng: number } | null> => {
    const cc = global ? '' : '&countrycodes=in';
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}${cc}&limit=1`;
    try {
      const res = await fetchWithTimeout(url, 8000);
      if (!res.ok) return null;
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
    } catch (e) {
      // network/abort/timeout — caller decides retry
    }
    return null;
  };

  // Try each variant (India scoped first)
  for (const v of variants) {
    const r = await tryFetch(v, false);
    if (r) {
      geocodingCache[cacheKey] = r;
      return r;
    }
  }
  // Global fallback
  for (const v of variants) {
    const r = await tryFetch(v, true);
    if (r) {
      geocodingCache[cacheKey] = r;
      return r;
    }
  }
  // One delayed retry to dodge transient rate limit
  await new Promise(r => setTimeout(r, 800));
  const last = await tryFetch(trimmed, false);
  if (last) {
    geocodingCache[cacheKey] = last;
    return last;
  }
  return null;
}

export default Map;
