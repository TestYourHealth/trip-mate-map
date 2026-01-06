import React from 'react';
import { MapPin, Navigation, Fuel, DollarSign, Clock, Car, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface TripPanelProps {
  origin: string;
  destination: string;
  onOriginChange: (value: string) => void;
  onDestinationChange: (value: string) => void;
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
  onOriginChange,
  onDestinationChange,
  onCalculate,
  onClear,
  tripData,
  isCalculating
}) => {
  return (
    <div className="glass-panel rounded-2xl p-5 w-full max-w-sm animate-slide-in-right">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <Navigation className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Trip Plan करें</h2>
          <p className="text-xs text-muted-foreground">Cost instantly calculate करें</p>
        </div>
      </div>

      <div className="space-y-3 mb-5">
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
          <div className="absolute left-5 w-0.5 h-8 bg-border -top-5" />
        </div>

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

      {tripData && (
        <div className="space-y-3 animate-fade-in">
          <div className="h-px bg-border" />
          
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
                  <Fuel className="w-3.5 h-3.5" /> Fuel (₹105/L, 15km/L)
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
