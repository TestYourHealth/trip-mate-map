import React from 'react';
import { MapPin, Navigation, Fuel, DollarSign, Clock, Car, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import VehicleSettings, { VehicleConfig } from './VehicleSettings';
import WaypointInput from './WaypointInput';
import RouteSelector from './RouteSelector';
import { RouteInfo } from './Map';

interface TripPanelProps {
  origin: string;
  destination: string;
  waypoints: string[];
  vehicleConfig: VehicleConfig;
  routes: RouteInfo[];
  selectedRouteIndex: number;
  onOriginChange: (value: string) => void;
  onDestinationChange: (value: string) => void;
  onWaypointsChange: (waypoints: string[]) => void;
  onVehicleConfigChange: (config: VehicleConfig) => void;
  onRouteSelect: (index: number) => void;
  onCalculate: () => void;
  onClear: () => void;
  tripData: {
    distance: number;
    duration: number;
    fuelCost: number;
    tollCost: number;
    totalCost: number;
  } | null;
  isCalculating: boolean;
}

const TripPanel: React.FC<TripPanelProps> = ({
  origin,
  destination,
  waypoints,
  vehicleConfig,
  routes,
  selectedRouteIndex,
  onOriginChange,
  onDestinationChange,
  onWaypointsChange,
  onVehicleConfigChange,
  onRouteSelect,
  onCalculate,
  onClear,
  tripData,
  isCalculating
}) => {
  const selectedRoute = routes[selectedRouteIndex];

  return (
    <div className="glass-panel rounded-2xl p-5 w-full max-w-sm animate-slide-in-right">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <Navigation className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Trip Plan करें</h2>
          <p className="text-xs text-muted-foreground">Real-time traffic के साथ</p>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
          <Input
            placeholder="Starting point (e.g., Delhi)"
            value={origin}
            onChange={(e) => onOriginChange(e.target.value)}
            className="pl-10 bg-muted/50 border-0 focus-visible:ring-primary"
          />
        </div>
        
        <div className="relative flex items-center">
          <div className="absolute left-5 w-0.5 h-full bg-border" />
        </div>

        <WaypointInput waypoints={waypoints} onWaypointsChange={onWaypointsChange} />

        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
          <Input
            placeholder="Destination (e.g., Mumbai)"
            value={destination}
            onChange={(e) => onDestinationChange(e.target.value)}
            className="pl-10 bg-muted/50 border-0 focus-visible:ring-primary"
          />
        </div>
      </div>

      <div className="mb-4">
        <VehicleSettings config={vehicleConfig} onConfigChange={onVehicleConfigChange} />
      </div>

      <div className="flex gap-2 mb-5">
        <Button 
          onClick={onCalculate}
          disabled={!origin || !destination || isCalculating}
          variant="glow"
          className="flex-1"
        >
          {isCalculating ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              Calculating...
            </span>
          ) : (
            'Navigate करें'
          )}
        </Button>
        
        {tripData && (
          <Button 
            onClick={onClear}
            variant="glass"
            size="icon"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        )}
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
            <div className={`rounded-xl p-3 ${
              selectedRoute.trafficLevel === 'low' ? 'bg-green-500/10 border border-green-500/30' :
              selectedRoute.trafficLevel === 'moderate' ? 'bg-amber-500/10 border border-amber-500/30' :
              'bg-red-500/10 border border-red-500/30'
            }`}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  selectedRoute.trafficLevel === 'low' ? 'bg-green-500 animate-pulse' :
                  selectedRoute.trafficLevel === 'moderate' ? 'bg-amber-500 animate-pulse' :
                  'bg-red-500 animate-pulse'
                }`} />
                <span className={`text-sm font-medium ${
                  selectedRoute.trafficLevel === 'low' ? 'text-green-500' :
                  selectedRoute.trafficLevel === 'moderate' ? 'text-amber-500' :
                  'text-red-500'
                }`}>
                  {selectedRoute.trafficLevel === 'low' ? 'Light Traffic - Good to go!' :
                   selectedRoute.trafficLevel === 'moderate' ? 'Moderate Traffic - Some delays expected' :
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
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <DollarSign className="w-3.5 h-3.5" />
              <span className="text-xs">Cost Breakdown</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Fuel className="w-3.5 h-3.5" /> {vehicleConfig.fuelType.charAt(0).toUpperCase() + vehicleConfig.fuelType.slice(1)} (₹{vehicleConfig.fuelPrice}/{vehicleConfig.fuelType === 'cng' ? 'kg' : 'L'}, {vehicleConfig.mileage}km/L)
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
        </div>
      )}
    </div>
  );
};

export default TripPanel;
