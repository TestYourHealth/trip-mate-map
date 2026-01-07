import React, { useState, useCallback, useRef } from 'react';
import { MapPin, Menu, X } from 'lucide-react';
import Map, { MapRef } from '@/components/Map';
import TripPanel from '@/components/TripPanel';
import { VehicleConfig } from '@/components/VehicleSettings';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const Index = () => {
  const mapRef = useRef<MapRef>(null);
  const [showPanel, setShowPanel] = useState(true);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [waypoints, setWaypoints] = useState<string[]>([]);
  const [vehicleConfig, setVehicleConfig] = useState<VehicleConfig>({
    fuelType: 'petrol',
    fuelPrice: 105,
    mileage: 15,
  });
  const [isCalculating, setIsCalculating] = useState(false);
  const [tripData, setTripData] = useState<{
    distance: number;
    duration: number;
    fuelCost: number;
    tollCost: number;
    totalCost: number;
  } | null>(null);

  const calculateTrip = useCallback(async () => {
    if (!origin || !destination) return;
    
    setIsCalculating(true);
    
    try {
      // Filter out empty waypoints
      const validWaypoints = waypoints.filter(w => w.trim() !== '');
      const result = await mapRef.current?.showRoute(origin, destination, validWaypoints);
      
      if (result) {
        const fuelCost = (result.distance / vehicleConfig.mileage) * vehicleConfig.fuelPrice;
        
        // Estimate toll cost (approximately ₹1.5 per km on highways)
        const tollCost = result.distance * 1.5;
        
        setTripData({
          distance: result.distance,
          duration: result.duration,
          fuelCost: Math.round(fuelCost),
          tollCost: Math.round(tollCost),
          totalCost: Math.round(fuelCost + tollCost),
        });
        
        toast.success('Route calculated successfully!');
      } else {
        toast.error('Could not find route. Please check the locations.');
      }
    } catch (error) {
      toast.error('Error calculating route');
    } finally {
      setIsCalculating(false);
    }
  }, [origin, destination, waypoints, vehicleConfig]);

  const clearTrip = useCallback(() => {
    mapRef.current?.clearRoute();
    setTripData(null);
    setOrigin('');
    setDestination('');
    setWaypoints([]);
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden relative">
      {/* Map Background */}
      <Map ref={mapRef} />

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-10 p-4">
        <div className="flex items-center justify-between">
          <div className="glass-panel rounded-2xl px-4 py-3 flex items-center gap-3 animate-fade-in">
            <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <span className="text-lg font-bold text-foreground">Trip Mate</span>
          </div>

          <Button 
            variant="glass" 
            size="icon"
            onClick={() => setShowPanel(!showPanel)}
            className="animate-fade-in"
          >
            {showPanel ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </header>

      {/* Trip Planning Panel */}
      {showPanel && (
        <div className="absolute top-24 right-4 z-10 max-h-[calc(100vh-120px)] overflow-y-auto">
          <TripPanel
            origin={origin}
            destination={destination}
            waypoints={waypoints}
            vehicleConfig={vehicleConfig}
            onOriginChange={setOrigin}
            onDestinationChange={setDestination}
            onWaypointsChange={setWaypoints}
            onVehicleConfigChange={setVehicleConfig}
            onCalculate={calculateTrip}
            onClear={clearTrip}
            tripData={tripData}
            isCalculating={isCalculating}
          />
        </div>
      )}

      {/* Quick Stats Footer */}
      {tripData && (
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
