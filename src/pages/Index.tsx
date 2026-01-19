import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Crosshair, Loader2 } from 'lucide-react';
import Map, { MapRef, RouteInfo } from '@/components/Map';
import TripPanel from '@/components/TripPanel';
import DriverNavigationView from '@/components/DriverNavigationView';
import { NavigationStep } from '@/components/NavigationPanel';
import { VehicleConfig } from '@/types/vehicle';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Trip } from '@/pages/TripHistory';

const Index = () => {
  const mapRef = useRef<MapRef>(null);
  const isMobile = useIsMobile();
  const [showPanel, setShowPanel] = useState(true);
  const [isPanelExpanded, setIsPanelExpanded] = useState(true);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [waypoints, setWaypoints] = useState<string[]>([]);
  const [vehicleConfig, setVehicleConfig] = useState<VehicleConfig>({
    fuelType: 'petrol',
    fuelPrice: 105,
    mileage: 15,
  });
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
  const [isLocating, setIsLocating] = useState(false);

  // GPS tracking
  const { 
    position, 
    isTracking, 
    startTracking, 
    stopTracking, 
    getCurrentPosition,
    error: geoError 
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

    // Check if user is off route (more than 100m away)
    if (minDistance > 100) {
      toast.warning('You seem to be off route. Recalculating...', { id: 'off-route' });
    }
  }, [position, isNavigating, navigationSteps, currentStepIndex]);

  const updateTripData = useCallback((route: RouteInfo) => {
    const fuelCost = (route.distance / vehicleConfig.mileage) * vehicleConfig.fuelPrice;
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
      toast.success('Location found!');
    } catch (error) {
      toast.error('Could not get your location');
    } finally {
      setIsLocating(false);
    }
  }, [getCurrentPosition]);

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
      toast.success('Starting from your current location');
    } catch (error) {
      toast.error('Could not get your location');
    } finally {
      setIsLocating(false);
    }
  }, [getCurrentPosition]);

  const calculateTrip = useCallback(async () => {
    if (!origin || !destination) return;
    
    setIsCalculating(true);
    
    try {
      const validWaypoints = waypoints.filter(w => w.trim() !== '');
      const result = await mapRef.current?.showRoute(origin, destination, validWaypoints);
      
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
        toast.error('Could not find route. Please check the locations.');
      }
    } catch (error) {
      toast.error('Error calculating route');
    } finally {
      setIsCalculating(false);
    }
  }, [origin, destination, waypoints, updateTripData, isMobile]);

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

  const stopNavigation = useCallback(() => {
    setIsNavigating(false);
    setShowPanel(true);
    stopTracking(); // Stop GPS tracking
  }, [stopTracking]);

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
      {/* Map Background - Full Screen */}
      <div className="absolute inset-0 z-0">
        <Map ref={mapRef} />
      </div>

      {/* Full-Screen Driver Navigation View (when navigating) */}
      {isNavigating && (
        <DriverNavigationView
          steps={navigationSteps}
          currentStepIndex={currentStepIndex}
          totalDistance={tripData?.distance || 0}
          remainingDistance={tripData ? tripData.distance * ((navigationSteps.length - currentStepIndex) / navigationSteps.length) : 0}
          estimatedTime={tripData ? tripData.duration * ((navigationSteps.length - currentStepIndex) / navigationSteps.length) : 0}
          speed={position?.speed ?? null}
          accuracy={position?.accuracy ?? null}
          isTracking={isTracking}
          isMuted={isMuted}
          onClose={stopNavigation}
          onToggleMute={() => setIsMuted(!isMuted)}
          onCenterUser={() => mapRef.current?.centerOnUser()}
        />
      )}

      {/* Floating action button - visible when not navigating */}
      {!isNavigating && (
        <div className="absolute top-4 right-4 z-[100] flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleLocateMe}
            disabled={isLocating}
            className="animate-fade-in bg-background shadow-md"
          >
            {isLocating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Crosshair className="w-5 h-5" />
            )}
          </Button>
        </div>
      )}

      {/* Trip Planning Panel - Desktop */}
      {!isMobile && showPanel && !isNavigating && (
        <div className="absolute top-4 right-16 z-[100]">
          <TripPanel
            origin={origin}
            destination={destination}
            waypoints={waypoints}
            vehicleConfig={vehicleConfig}
            routes={routes}
            selectedRouteIndex={selectedRouteIndex}
            navigationSteps={navigationSteps}
            isNavigating={isNavigating}
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

      {/* Trip Planning Panel - Mobile (Bottom Sheet) */}
      {isMobile && !isNavigating && (
        <div className="absolute bottom-0 left-0 right-0 z-[100]">
          <TripPanel
            origin={origin}
            destination={destination}
            waypoints={waypoints}
            vehicleConfig={vehicleConfig}
            routes={routes}
            selectedRouteIndex={selectedRouteIndex}
            navigationSteps={navigationSteps}
            isNavigating={isNavigating}
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

      {/* Quick Stats Footer - Desktop only, when not navigating */}
      {!isMobile && tripData && !isNavigating && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[100]">
          <div className="bg-background rounded-full px-6 py-3 flex items-center gap-6 animate-slide-up shadow-lg border">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">Distance:</span>
              <span className="font-bold text-foreground">{tripData.distance} km</span>
            </div>
            <div className="w-px h-6 bg-border" />
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">Total Cost:</span>
              <span className="font-bold text-primary">₹{tripData.totalCost}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
