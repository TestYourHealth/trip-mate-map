import { useState, useCallback, useRef, useEffect } from 'react';
import Map, { MapRef, RouteInfo } from '@/components/Map';
import TripPanel from '@/components/TripPanel';
import TopSearchBar from '@/components/TopSearchBar';
import DriverNavigationView from '@/components/DriverNavigationView';
import CompassIndicator from '@/components/CompassIndicator';
import QuickActions from '@/components/QuickActions';
import OnboardingTour from '@/components/OnboardingTour';
import RouteDebugPanel from '@/components/RouteDebugPanel';
import WeatherWidget from '@/components/WeatherWidget';
import { NavigationStep } from '@/components/NavigationPanel';
import { VehicleConfig } from '@/types/vehicle';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useAutoDetectLocation } from '@/hooks/useAutoDetectLocation';
import { useMapTheme } from '@/hooks/useMapTheme';
import { Trip } from '@/pages/TripHistory';

const Index = () => {
  // Auto-detect location for fuel prices on first visit
  useAutoDetectLocation();
  
  const mapRef = useRef<MapRef>(null);
  const isMobile = useIsMobile();
  const mapTileTheme = useMapTheme();
  const [showPanel, setShowPanel] = useState(true);
  const [isPanelExpanded, setIsPanelExpanded] = useState(true);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [waypoints, setWaypoints] = useState<string[]>([]);
  // Get default vehicle from localStorage
  const getDefaultVehicleConfig = (): VehicleConfig => {
    try {
      const vehiclesData = localStorage.getItem('vehicles');
      const fuelPricesData = localStorage.getItem('fuelPrices');
      
      const vehicles = vehiclesData ? JSON.parse(vehiclesData) : [];
      const fuelPrices = fuelPricesData ? JSON.parse(fuelPricesData) : { petrol: 105, diesel: 92, cng: 85, electric: 8 };
      
      const defaultVehicle = vehicles.find((v: any) => v.isDefault) || vehicles[0];
      
      if (defaultVehicle) {
        return {
          fuelType: defaultVehicle.fuelType,
          fuelPrice: fuelPrices[defaultVehicle.fuelType] || (defaultVehicle.fuelType === 'electric' ? 8 : 105),
          mileage: defaultVehicle.mileage,
        };
      }
    } catch (e) {
      console.warn('Error reading vehicle config:', e);
    }
    return { fuelType: 'petrol', fuelPrice: 105, mileage: 15 };
  };

  const [vehicleConfig, setVehicleConfig] = useState<VehicleConfig>(getDefaultVehicleConfig);

  // Sync vehicleConfig when localStorage changes (from other tabs or settings pages)
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'vehicles' || event.key === 'fuelPrices') {
        setVehicleConfig(getDefaultVehicleConfig());
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Also check for updates when component mounts or regains focus
  useEffect(() => {
    const handleFocus = () => {
      setVehicleConfig(getDefaultVehicleConfig());
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);
  const [isCalculating, setIsCalculating] = useState(false);
  const [routes, setRoutes] = useState<RouteInfo[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [tripData, setTripData] = useState<{
    distance: number;
    duration: number;
    fuelCost: number;
    tollCost: number;
    totalCost: number;
  } | null>(null);

  // Navigation state
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigationSteps, setNavigationSteps] = useState<NavigationStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const lastOffRouteWarning = useRef<number>(0);
  const [isLocating, setIsLocating] = useState(false);
  const [mapRotation, setMapRotation] = useState(0);

  // GPS tracking
  const { 
    position, 
    isTracking, 
    startTracking, 
    stopTracking, 
    getCurrentPosition,
    error: geoError,
    compassHeading
  } = useGeolocation();

  // Trip history persistence
  const [tripHistory, setTripHistory] = useLocalStorage<Trip[]>('tripHistory', []);

  // Update map with user location (including speed and accuracy)
  useEffect(() => {
    if (position && mapRef.current) {
      mapRef.current.updateUserLocation(
        position.lat, 
        position.lng, 
        position.heading, 
        position.speed,
        position.accuracy
      );
    }
  }, [position]);

  // Show geolocation errors
  useEffect(() => {
    if (geoError) {
      toast.error(geoError);
    }
  }, [geoError]);

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Define stopNavigation before it's used in the useEffect below
  const stopNavigation = useCallback(() => {
    setIsNavigating(false);
    setShowPanel(true);
    stopTracking(); // Stop GPS tracking
  }, [stopTracking]);

  // Auto-advance navigation based on GPS position
  useEffect(() => {
    if (!isNavigating || !position || navigationSteps.length === 0) return;

    const routeCoords = mapRef.current?.getRouteCoordinates();
    if (!routeCoords || routeCoords.length === 0) return;

    // Find the closest point on the route
    let minDistance = Infinity;
    let closestIndex = 0;

    routeCoords.forEach((coord, index) => {
      const distance = calculateDistance(position.lat, position.lng, coord.lat, coord.lng);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    // Calculate progress through route (0 to 1)
    const progress = closestIndex / routeCoords.length;
    
    // Map progress to navigation steps
    const targetStepIndex = Math.min(
      Math.floor(progress * navigationSteps.length),
      navigationSteps.length - 1
    );

    if (targetStepIndex > currentStepIndex) {
      setCurrentStepIndex(targetStepIndex);
      
      // Announce step change
      if (targetStepIndex === navigationSteps.length - 1) {
        toast.success('🎉 You have reached your destination!');
        // Save trip to history
        if (tripData && origin && destination) {
          const newTrip: Trip = {
            id: Date.now().toString(),
            origin: origin.split(',')[0],
            destination: destination.split(',')[0],
            distance: tripData.distance,
            duration: tripData.duration,
            cost: tripData.totalCost,
            date: new Date().toISOString(),
          };
          setTripHistory(prev => [newTrip, ...prev]);
        }
        stopNavigation();
      }
    }

    // Check if user is off route (more than 150m away) with 30s cooldown
    const now = Date.now();
    if (minDistance > 150 && now - lastOffRouteWarning.current > 30000) {
      lastOffRouteWarning.current = now;
      toast.warning('आप route से दूर हैं। कृपया route पर वापस आएं।', { id: 'off-route' });
    }
  }, [position, isNavigating, navigationSteps, currentStepIndex, tripData, origin, destination, setTripHistory, stopNavigation]);

  const updateTripData = useCallback((route: RouteInfo) => {
    // Calculate fuel cost based on fuel type
    // Electric: distance / km per kWh * price per kWh
    // Others: distance / km per liter * price per liter
    let fuelCost: number;
    if (vehicleConfig.fuelType === 'electric') {
      // For electric, mileage is km/kWh
      fuelCost = (route.distance / vehicleConfig.mileage) * vehicleConfig.fuelPrice;
    } else {
      // For petrol/diesel/cng, mileage is km/L or km/kg
      fuelCost = (route.distance / vehicleConfig.mileage) * vehicleConfig.fuelPrice;
    }
    
    // Electric vehicles don't pay tolls based on fuel (some toll exemptions), but we'll still estimate
    const tollCost = route.distance * 1.5;
    
    setTripData({
      distance: route.distance,
      duration: route.duration,
      fuelCost: Math.round(fuelCost),
      tollCost: Math.round(tollCost),
      totalCost: Math.round(fuelCost + tollCost),
    });
  }, [vehicleConfig]);

  const handleLocateMe = useCallback(async () => {
    setIsLocating(true);
    try {
      const pos = await getCurrentPosition();
      mapRef.current?.updateUserLocation(pos.lat, pos.lng, pos.heading);
      mapRef.current?.centerOnUser();
      startTracking();
      toast.success('Live GPS started!');
    } catch (error) {
      toast.error('Could not get your location');
    } finally {
      setIsLocating(false);
    }
  }, [getCurrentPosition, startTracking]);

  const useCurrentLocation = useCallback(async () => {
    setIsLocating(true);
    try {
      const pos = await getCurrentPosition();
      // Reverse geocode to get address
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.lat}&lon=${pos.lng}`,
        { headers: { 'User-Agent': 'TripMate/1.0' } }
      );
      const data = await response.json();
      const address = data.display_name?.split(',').slice(0, 3).join(',') || 'Current Location';
      setOrigin(address);
      mapRef.current?.updateUserLocation(pos.lat, pos.lng, pos.heading);
      startTracking();
      toast.success('Starting from your current location');
    } catch (error) {
      toast.error('Could not get your location');
    } finally {
      setIsLocating(false);
    }
  }, [getCurrentPosition, startTracking]);

  const calculateTrip = useCallback(async (overrideOrigin?: string, overrideDestination?: string) => {
    let tripOrigin = overrideOrigin || origin;
    const tripDestination = overrideDestination || destination;
    if (!tripOrigin || !tripDestination) return;
    
    setIsCalculating(true);
    
    try {
      // If origin is generic "Current Location", resolve to actual GPS address
      if (tripOrigin === 'Current Location') {
        try {
          const pos = await getCurrentPosition();
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.lat}&lon=${pos.lng}`,
            { headers: { 'User-Agent': 'TripMate/1.0' } }
          );
          const data = await response.json();
          tripOrigin = data.display_name?.split(',').slice(0, 3).join(',') || `${pos.lat},${pos.lng}`;
          setOrigin(tripOrigin);
        } catch {
          toast.error('Location detect nahi ho paya. Please manually enter origin.');
          setIsCalculating(false);
          return;
        }
      }

      const validWaypoints = waypoints.filter(w => w.trim() !== '');
      const result = await mapRef.current?.showRoute(tripOrigin, tripDestination, validWaypoints);
      
      if (result && result.routes.length > 0) {
        setRoutes(result.routes);
        setSelectedRouteIndex(0);
        updateTripData(result.routes[0]);
        
        // Convert instructions to navigation steps
        if (result.instructions && result.instructions.length > 0) {
          const steps: NavigationStep[] = result.instructions.map((inst) => ({
            instruction: inst.text,
            distance: inst.distance,
            type: getStepType(inst.type, inst.modifier)
          }));
          setNavigationSteps(steps);
        }
        
        if (result.routes.length > 1) {
          toast.success(`${result.routes.length} routes found! Select your preferred route.`);
        } else {
          toast.success('Route calculated successfully!');
        }

        // On mobile, collapse the panel after calculating
        if (isMobile) {
          setIsPanelExpanded(false);
        }
      } else {
        toast.error('Route nahi mil paya. Locations check karo ya thodi der me retry karo.');
      }
    } catch (error) {
      console.error('calculateTrip error:', error);
      toast.error('Route calculation me error. Internet check karo.');
    } finally {
      setIsCalculating(false);
    }
  }, [origin, destination, waypoints, updateTripData, isMobile, getCurrentPosition]);

  const getStepType = (type: string, modifier?: string): NavigationStep['type'] => {
    if (type === 'DestinationReached' || type === 'WaypointReached') return 'destination';
    if (type === 'Head' || type === 'Depart') return 'start';
    
    if (modifier) {
      if (modifier.includes('left')) return modifier.includes('slight') ? 'slight-left' : 'left';
      if (modifier.includes('right')) return modifier.includes('slight') ? 'slight-right' : 'right';
    }
    
    return 'straight';
  };

  const handleRouteSelect = useCallback((index: number) => {
    setSelectedRouteIndex(index);
    mapRef.current?.selectRoute(index);
    if (routes[index]) {
      updateTripData(routes[index]);
    }
  }, [routes, updateTripData]);

  const startNavigation = useCallback(() => {
    if (tripData && navigationSteps.length > 0) {
      setIsNavigating(true);
      setCurrentStepIndex(0);
      setShowPanel(false);
      startTracking(); // Start GPS tracking
      mapRef.current?.centerOnUser();
      toast.success('Navigation started! GPS tracking is active.');
    }
  }, [tripData, navigationSteps, startTracking]);

  const clearTrip = useCallback(() => {
    mapRef.current?.clearRoute();
    setTripData(null);
    setRoutes([]);
    setSelectedRouteIndex(0);
    setOrigin('');
    setDestination('');
    setWaypoints([]);
    setNavigationSteps([]);
    setIsNavigating(false);
    setCurrentStepIndex(0);
    stopTracking();
  }, [stopTracking]);

  return (
    <div className="h-full w-full relative">
      {/* Onboarding Tour */}
      <OnboardingTour />

      {/* Route geocoding debug panel */}
      {!isNavigating && <RouteDebugPanel />}

      {/* Map Background - Full Screen */}
      <div className="absolute inset-0 z-0">
        <Map 
          ref={mapRef} 
          isNavigating={isNavigating} 
          heading={isNavigating ? (compassHeading ?? position?.heading ?? null) : null}
          onRotationChange={setMapRotation}
          tileTheme={mapTileTheme}
        />
      </div>

      {/* Full-Screen Driver Navigation View (when navigating) */}
      {isNavigating && (
        <DriverNavigationView
          steps={navigationSteps}
          currentStepIndex={currentStepIndex}
          remainingDistance={tripData && navigationSteps.length > 0 ? Math.max(0, tripData.distance * ((navigationSteps.length - currentStepIndex) / navigationSteps.length)) : 0}
          estimatedTime={tripData && navigationSteps.length > 0 ? Math.max(0, tripData.duration * ((navigationSteps.length - currentStepIndex) / navigationSteps.length)) : 0}
          speed={position?.speed ?? null}
          isMuted={isMuted}
          onClose={stopNavigation}
          onToggleMute={() => setIsMuted(!isMuted)}
          onCenterUser={() => mapRef.current?.centerOnUser()}
        />
      )}

      {/* Top Header Bar - visible when not navigating */}
      {!isNavigating && (
        <TopSearchBar
          origin={origin}
          destination={destination}
          onOriginChange={setOrigin}
          onDestinationChange={setDestination}
          onCalculate={calculateTrip}
          isCalculating={isCalculating}
          hasRoute={!!tripData}
          getCurrentPosition={getCurrentPosition}
          onLocateMe={handleLocateMe}
          isLocating={isLocating}
          tripHistory={tripHistory}
        />
      )}

      {/* Compass + Weather - visible when not navigating */}
      {!isNavigating && (
        <div className="absolute bottom-24 left-3 z-[100] md:bottom-6 flex flex-col gap-3">
          <WeatherWidget
            lat={position?.lat}
            lng={position?.lng}
            compact
          />
          <CompassIndicator 
            heading={mapRotation} 
            onResetNorth={() => mapRef.current?.resetNorth()}
          />
        </div>
      )}

      {/* Quick Action Buttons - right side */}
      {!isNavigating && (
        <div className="absolute bottom-24 right-3 z-[100] md:bottom-6">
          <QuickActions
            userPosition={position ? { lat: position.lat, lng: position.lng } : null}
            onShowNearbyMarkers={(places, color) => mapRef.current?.showNearbyMarkers(places, color)}
            onClearNearbyMarkers={() => mapRef.current?.clearNearbyMarkers()}
            onNavigateToPlace={async (name, lat, lng) => {
              mapRef.current?.clearNearbyMarkers();
              setDestination(name);
              
              let currentOrigin = origin;
              if (!currentOrigin) {
                setIsLocating(true);
                try {
                  const pos = await getCurrentPosition();
                  const response = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.lat}&lon=${pos.lng}`,
                    { headers: { 'User-Agent': 'TripMate/1.0' } }
                  );
                  const data = await response.json();
                  currentOrigin = data.display_name?.split(',').slice(0, 3).join(',') || 'Current Location';
                  setOrigin(currentOrigin);
                  mapRef.current?.updateUserLocation(pos.lat, pos.lng, pos.heading);
                  startTracking();
                } catch {
                  toast.error('Could not get your location');
                  setIsLocating(false);
                  return;
                } finally {
                  setIsLocating(false);
                }
              }
              // Use override params to avoid stale closure
              await calculateTrip(currentOrigin, name);
            }}
          />
        </div>
      )}

      {/* Trip Details Panel - Desktop (only show after route calculation) */}
      {!isMobile && tripData && !isNavigating && (
        <div className="absolute bottom-6 right-4 z-[100]">
          <TripPanel
            origin={origin}
            destination={destination}
            waypoints={waypoints}
            vehicleConfig={vehicleConfig}
            routes={routes}
            selectedRouteIndex={selectedRouteIndex}
            navigationSteps={navigationSteps}
            onOriginChange={setOrigin}
            onDestinationChange={setDestination}
            onWaypointsChange={setWaypoints}
            onVehicleConfigChange={setVehicleConfig}
            onRouteSelect={handleRouteSelect}
            onCalculate={calculateTrip}
            onClear={clearTrip}
            onStartNavigation={startNavigation}
            tripData={tripData}
            isCalculating={isCalculating}
            isMobile={false}
            onUseCurrentLocation={useCurrentLocation}
            isLocating={isLocating}
          />
        </div>
      )}

      {/* Trip Details Panel - Mobile (Bottom Sheet) - only show after route calculation */}
      {isMobile && tripData && !isNavigating && (
        <div className="absolute bottom-0 left-0 right-0 z-[100]">
          <TripPanel
            origin={origin}
            destination={destination}
            waypoints={waypoints}
            vehicleConfig={vehicleConfig}
            routes={routes}
            selectedRouteIndex={selectedRouteIndex}
            navigationSteps={navigationSteps}
            onOriginChange={setOrigin}
            onDestinationChange={setDestination}
            onWaypointsChange={setWaypoints}
            onVehicleConfigChange={setVehicleConfig}
            onRouteSelect={handleRouteSelect}
            onCalculate={calculateTrip}
            onClear={clearTrip}
            onStartNavigation={startNavigation}
            tripData={tripData}
            isCalculating={isCalculating}
            isMobile={true}
            isExpanded={isPanelExpanded}
            onToggleExpand={() => setIsPanelExpanded(!isPanelExpanded)}
            onUseCurrentLocation={useCurrentLocation}
            isLocating={isLocating}
          />
        </div>
      )}

      {/* Quick Stats Footer - Desktop only */}
      {!isMobile && tripData && !isNavigating && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[100]">
          <div className="glass-card rounded-full px-6 py-3 flex items-center gap-5 animate-slide-up">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground text-xs">Distance</span>
              <span className="font-bold text-sm text-foreground">{tripData.distance} km</span>
            </div>
            <div className="w-px h-5 bg-border/50" />
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground text-xs">Time</span>
              <span className="font-bold text-sm text-foreground">{tripData.duration} hrs</span>
            </div>
            <div className="w-px h-5 bg-border/50" />
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground text-xs">Cost</span>
              <span className="font-bold text-sm text-primary">₹{tripData.totalCost}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
