import React from 'react';
import { Navigation, Fuel, DollarSign, Clock, Car, RotateCcw, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import VehicleSelector from './VehicleSelector';
import RouteSelector from './RouteSelector';
import DirectionsList from './DirectionsList';
import CitySelector from './CitySelector';

import { RouteInfo } from './Map';
import { NavigationStep } from './NavigationPanel';
import { VehicleConfig } from '@/types/vehicle';
import { cn } from '@/lib/utils';
import { useLocalStorage } from '@/hooks/useLocalStorage';

interface TripPanelProps {
  origin: string;
  destination: string;
  waypoints: string[];
  vehicleConfig: VehicleConfig;
  routes: RouteInfo[];
  selectedRouteIndex: number;
  navigationSteps: NavigationStep[];
  onOriginChange: (value: string) => void;
  onDestinationChange: (value: string) => void;
  onWaypointsChange: (waypoints: string[]) => void;
  onVehicleConfigChange: (config: VehicleConfig) => void;
  onRouteSelect: (index: number) => void;
  onCalculate: () => void;
  onClear: () => void;
  onStartNavigation: () => void;
  onUseCurrentLocation?: () => void;
  tripData: {
    distance: number;
    duration: number;
    fuelCost: number;
    tollCost: number;
    totalCost: number;
  } | null;
  isCalculating: boolean;
  isLocating?: boolean;
  isMobile?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

const TripPanel: React.FC<TripPanelProps> = ({
  origin,
  destination,
  waypoints,
  vehicleConfig,
  routes,
  selectedRouteIndex,
  navigationSteps,
  onOriginChange,
  onDestinationChange,
  onWaypointsChange,
  onVehicleConfigChange,
  onRouteSelect,
  onCalculate,
  onClear,
  onStartNavigation,
  onUseCurrentLocation,
  tripData,
  isCalculating,
  isLocating = false,
  isMobile = false,
  isExpanded = true,
  onToggleExpand
}) => {
  const selectedRoute = routes[selectedRouteIndex];
  const [currentCity] = useLocalStorage('currentCity', '');

  const panelContent = (
    <>
      {/* Header - Always visible */}
      <div 
        className={cn(
          "flex items-center gap-3",
          isMobile ? "pb-4" : "mb-5"
        )}
        onClick={isMobile ? onToggleExpand : undefined}
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-sm">
          <Navigation className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-foreground">Trip Details</h2>
          <p className="text-xs text-muted-foreground">
            {origin.split(',')[0]} → {destination.split(',')[0]}
          </p>
        </div>
        {isMobile && (
          <Button variant="ghost" size="icon-sm" onClick={onToggleExpand} aria-label={isExpanded ? "Collapse panel" : "Expand panel"}>
            {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
          </Button>
        )}
      </div>

      {/* Quick Stats on Mobile (collapsed view) - shown OUTSIDE the expandable div */}
      {isMobile && tripData && !isExpanded && (
        <div className="flex items-center justify-around py-3 border-t border-border">
          <div className="text-center">
            <p className="text-sm font-bold text-foreground">{tripData.distance} km</p>
            <p className="text-xs text-muted-foreground">Distance</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-foreground">{tripData.duration} hrs</p>
            <p className="text-xs text-muted-foreground">Time</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-primary">₹{tripData.totalCost}</p>
            <p className="text-xs text-muted-foreground">Cost</p>
          </div>
        </div>
      )}

      {/* Expandable Content */}
      <div className={cn(
        "transition-all duration-300 overflow-hidden",
        isMobile && !isExpanded ? "max-h-0 opacity-0" : "max-h-[2000px] opacity-100"
      )}>

        {/* Vehicle Selector */}
        <div className="mb-4">
          <VehicleSelector config={vehicleConfig} onConfigChange={onVehicleConfigChange} />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-5">
          <Button 
            onClick={onStartNavigation}
            variant="default"
            className="flex-1 h-14 text-base bg-green-600 hover:bg-green-700 text-white"
          >
            <Navigation className="w-5 h-5 mr-2" />
            Navigation शुरू करें
          </Button>
          <Button 
            onClick={onClear}
            variant="outline"
            size="icon"
            className="h-14 w-14"
            aria-label="Clear trip"
          >
            <RotateCcw className="w-5 h-5" />
          </Button>
        </div>

        {/* Route Selector */}
        {routes.length > 1 && (
          <div className="mb-4 animate-fade-in">
            <RouteSelector
              routes={routes}
              selectedIndex={selectedRouteIndex}
              onSelect={onRouteSelect}
            />
          </div>
        )}

        {tripData && (
          <div className="space-y-3 animate-fade-in">
            <div className="h-px bg-border" />
            
            {/* Traffic Status */}
            {selectedRoute && (
              <div className={cn(
                "rounded-xl p-3",
                selectedRoute.trafficLevel === 'low' ? 'bg-green-500/10 border border-green-500/30' :
                selectedRoute.trafficLevel === 'moderate' ? 'bg-amber-500/10 border border-amber-500/30' :
                'bg-red-500/10 border border-red-500/30'
              )}>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full animate-pulse",
                    selectedRoute.trafficLevel === 'low' ? 'bg-green-500' :
                    selectedRoute.trafficLevel === 'moderate' ? 'bg-amber-500' : 'bg-red-500'
                  )} />
                  <span className={cn(
                    "text-sm font-medium",
                    selectedRoute.trafficLevel === 'low' ? 'text-green-500' :
                    selectedRoute.trafficLevel === 'moderate' ? 'text-amber-500' : 'text-red-500'
                  )}>
                    {selectedRoute.trafficLevel === 'low' ? 'Light Traffic - Good to go!' :
                     selectedRoute.trafficLevel === 'moderate' ? 'Moderate Traffic - Some delays' :
                     'Heavy Traffic - Consider alternate route'}
                  </span>
                </div>
              </div>
            )}
            
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/30 rounded-xl p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Car className="w-3.5 h-3.5" />
                  <span className="text-xs">Distance</span>
                </div>
                <p className="text-lg font-bold text-foreground">{tripData.distance} km</p>
              </div>
              
              <div className="bg-muted/30 rounded-xl p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-xs">Duration</span>
                </div>
                <p className="text-lg font-bold text-foreground">{tripData.duration} hrs</p>
              </div>
            </div>

            <div className="bg-muted/30 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="w-3.5 h-3.5" />
                  <span className="text-xs">Cost Breakdown</span>
                </div>
                {/* City Selector with detected city */}
                <CitySelector compact />
              </div>
              
              {currentCity && (
                <p className="text-xs text-muted-foreground mb-2">
                  Fuel prices for {currentCity}
                </p>
              )}
              
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Fuel className="w-3.5 h-3.5" /> {vehicleConfig.fuelType.charAt(0).toUpperCase() + vehicleConfig.fuelType.slice(1)} (₹{vehicleConfig.fuelPrice}/{vehicleConfig.fuelType === 'cng' ? 'kg' : vehicleConfig.fuelType === 'electric' ? 'kWh' : 'L'})
                    </span>
                    <span className="text-sm font-semibold text-foreground">₹{tripData.fuelCost}</span>
                  </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <DollarSign className="w-3.5 h-3.5" /> Toll (approx)
                  </span>
                  <span className="text-sm font-semibold text-foreground">₹{tripData.tollCost}</span>
                </div>
                
                <div className="h-px bg-border my-2" />
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-foreground">Total</span>
                  <span className="text-xl font-bold text-primary">₹{tripData.totalCost}</span>
                </div>
              </div>
            </div>

            {/* Turn-by-turn Directions */}
            {navigationSteps.length > 0 && (
              <DirectionsList 
                steps={navigationSteps}
                currentStepIndex={0}
              />
            )}
          </div>
        )}
      </div>
    </>
  );

  if (isMobile) {
    return (
      <div className={cn(
        "bg-background/95 backdrop-blur-xl border-t border-border/30 shadow-xl rounded-t-3xl p-5 w-full animate-slide-up-panel safe-area-bottom",
        "max-h-[80vh] overflow-y-auto scrollbar-thin"
      )}>
        {/* Drag Handle */}
        <div className="flex justify-center mb-2">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
        </div>
        {panelContent}
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-5 w-full max-w-sm animate-slide-in-right max-h-[calc(100vh-32px)] overflow-y-auto scrollbar-thin">
      {panelContent}
    </div>
  );
};

export default TripPanel;
