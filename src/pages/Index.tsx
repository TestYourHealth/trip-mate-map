import React, { useState, useCallback, useRef, useEffect } from 'react';
import { MapPin, Menu, X } from 'lucide-react';
import Map, { MapRef, RouteInfo } from '@/components/Map';
import TripPanel from '@/components/TripPanel';
import NavigationPanel, { NavigationStep } from '@/components/NavigationPanel';
import { VehicleConfig } from '@/components/VehicleSettings';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

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
      toast.success('Navigation started! Follow the directions.');
    }
  }, [tripData, navigationSteps]);

  const stopNavigation = useCallback(() => {
    setIsNavigating(false);
    setShowPanel(true);
  }, []);

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
  }, []);

  // Auto-advance navigation steps (simulation)
  useEffect(() => {
    if (!isNavigating || navigationSteps.length === 0) return;

    const interval = setInterval(() => {
      setCurrentStepIndex(prev => {
        if (prev < navigationSteps.length - 1) {
          return prev + 1;
        }
        toast.success('You have reached your destination!');
        stopNavigation();
        return prev;
      });
    }, 8000); // Advance every 8 seconds for demo

    return () => clearInterval(interval);
  }, [isNavigating, navigationSteps.length, stopNavigation]);

  return (
    <div className="h-screen w-screen overflow-hidden relative">
      {/* Map Background */}
      <Map ref={mapRef} />

      {/* Navigation Panel (when active) */}
      {isNavigating && (
        <NavigationPanel
          steps={navigationSteps}
          currentStepIndex={currentStepIndex}
          totalDistance={tripData?.distance || 0}
          remainingDistance={tripData ? tripData.distance * ((navigationSteps.length - currentStepIndex) / navigationSteps.length) : 0}
          estimatedTime={tripData ? tripData.duration * ((navigationSteps.length - currentStepIndex) / navigationSteps.length) : 0}
          isActive={isNavigating}
          isMuted={isMuted}
          onClose={stopNavigation}
          onToggleMute={() => setIsMuted(!isMuted)}
        />
      )}

      {/* Header - Hidden during navigation */}
      {!isNavigating && (
        <header className="absolute top-0 left-0 right-0 z-10 p-4 safe-area-top">
          <div className="flex items-center justify-between">
            <div className="glass-panel rounded-2xl px-4 py-3 flex items-center gap-3 animate-fade-in">
              <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <span className="text-lg font-bold text-foreground">Trip Mate</span>
            </div>

            {!isMobile && (
              <Button 
                variant="glass" 
                size="icon"
                onClick={() => setShowPanel(!showPanel)}
                className="animate-fade-in"
              >
                {showPanel ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            )}
          </div>
        </header>
      )}

      {/* Trip Planning Panel - Desktop */}
      {!isMobile && showPanel && !isNavigating && (
        <div className="absolute top-24 right-4 z-10">
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
          />
        </div>
      )}

      {/* Trip Planning Panel - Mobile (Bottom Sheet) */}
      {isMobile && !isNavigating && (
        <div className="absolute bottom-0 left-0 right-0 z-10">
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
          />
        </div>
      )}

      {/* Quick Stats Footer - Desktop only, when not navigating */}
      {!isMobile && tripData && !isNavigating && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
          <div className="glass-panel rounded-full px-6 py-3 flex items-center gap-6 animate-slide-up">
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
