import React, { useState, useCallback } from 'react';
import { MapPin, Menu, X } from 'lucide-react';
import Map from '@/components/Map';
import TripPanel from '@/components/TripPanel';
import { Button } from '@/components/ui/button';

const Index = () => {
  const [showPanel, setShowPanel] = useState(true);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [tripData, setTripData] = useState<{
    distance: number;
    duration: number;
    fuelCost: number;
    tollCost: number;
    totalCost: number;
  } | null>(null);

  const calculateTrip = useCallback(() => {
    if (!origin || !destination) return;
    
    setIsCalculating(true);
    
    // Simulate calculation (in production, would use routing API)
    setTimeout(() => {
      const distance = Math.floor(Math.random() * 500) + 100;
      const duration = Math.round((distance / 60) * 10) / 10;
      const fuelPrice = 3.50;
      const mpg = 28;
      const fuelCost = (distance / mpg) * fuelPrice;
      const tollCost = Math.floor(distance / 100) * 5 + Math.random() * 10;
      
      setTripData({
        distance,
        duration,
        fuelCost,
        tollCost: Math.round(tollCost * 100) / 100,
        totalCost: Math.round((fuelCost + tollCost) * 100) / 100,
      });
      
      setIsCalculating(false);
    }, 1500);
  }, [origin, destination]);

  return (
    <div className="h-screen w-screen overflow-hidden relative">
      {/* Map Background */}
      <Map />

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
        <div className="absolute top-24 right-4 z-10">
          <TripPanel
            origin={origin}
            destination={destination}
            onOriginChange={setOrigin}
            onDestinationChange={setDestination}
            onCalculate={calculateTrip}
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
              <span className="font-bold text-foreground">{tripData.distance} mi</span>
            </div>
            <div className="w-px h-6 bg-border" />
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">Total Cost:</span>
              <span className="font-bold text-primary">${tripData.totalCost.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
