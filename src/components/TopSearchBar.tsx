import React, { useEffect, useState } from 'react';
import { MapPin, Navigation, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LocationAutocomplete from './LocationAutocomplete';
import { cn } from '@/lib/utils';

interface TopSearchBarProps {
  origin: string;
  destination: string;
  onOriginChange: (value: string) => void;
  onDestinationChange: (value: string) => void;
  onCalculate: () => void;
  isCalculating: boolean;
  hasRoute: boolean;
  getCurrentPosition: () => Promise<{ lat: number; lng: number; heading: number | null }>;
}

const TopSearchBar: React.FC<TopSearchBarProps> = ({
  origin,
  destination,
  onOriginChange,
  onDestinationChange,
  onCalculate,
  isCalculating,
  hasRoute,
  getCurrentPosition
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [hasAutoLocated, setHasAutoLocated] = useState(false);

  // Auto-detect current location on mount
  useEffect(() => {
    if (hasAutoLocated || origin) return;
    
    const getLocation = async () => {
      setIsGettingLocation(true);
      try {
        const pos = await getCurrentPosition();
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.lat}&lon=${pos.lng}`,
          { headers: { 'User-Agent': 'TripMate/1.0' } }
        );
        const data = await response.json();
        const address = data.display_name?.split(',').slice(0, 2).join(',') || 'Current Location';
        onOriginChange(address);
        setHasAutoLocated(true);
      } catch (error) {
        console.warn('Could not auto-detect location:', error);
        onOriginChange('📍 Current Location');
        setHasAutoLocated(true);
      } finally {
        setIsGettingLocation(false);
      }
    };

    getLocation();
  }, [getCurrentPosition, onOriginChange, hasAutoLocated, origin]);

  const handleSearch = () => {
    if (origin && destination) {
      onCalculate();
    }
  };

  return (
    <div className="absolute top-16 left-4 right-4 z-[150] md:left-1/2 md:-translate-x-1/2 md:max-w-lg md:right-auto md:w-full">
      <div className="bg-background rounded-2xl shadow-xl border overflow-hidden">
        {/* Collapsed view - just destination search */}
        {!isExpanded && (
          <div className="p-3">
            {/* From indicator */}
            <button
              onClick={() => setIsExpanded(true)}
              className="w-full flex items-center gap-3 px-3 py-2 mb-2 rounded-xl bg-muted/50 text-left"
            >
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                {isGettingLocation ? (
                  <Loader2 className="w-4 h-4 text-green-500 animate-spin" />
                ) : (
                  <MapPin className="w-4 h-4 text-green-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">From</p>
                <p className="text-sm font-medium text-foreground truncate">
                  {isGettingLocation ? 'Getting location...' : (origin || 'Your location')}
                </p>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </button>

            {/* Destination search */}
            <div className="flex gap-2">
              <div className="flex-1">
                <LocationAutocomplete
                  value={destination}
                  onChange={onDestinationChange}
                  placeholder="कहां जाना है?"
                  icon={<MapPin className="w-4 h-4 text-red-500" />}
                  className="h-12"
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={!origin || !destination || isCalculating}
                className="h-12 px-4"
              >
                {isCalculating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Navigation className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Expanded view - both origin and destination */}
        {isExpanded && (
          <div className="p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Route Plan करें</h3>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setIsExpanded(false)}
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2">
              {/* Origin */}
              <div className="relative">
                <LocationAutocomplete
                  value={origin}
                  onChange={onOriginChange}
                  placeholder="Starting point"
                  icon={<MapPin className="w-4 h-4 text-green-500" />}
                  className="h-12"
                />
              </div>

              {/* Connector line */}
              <div className="flex items-center pl-5">
                <div className="w-0.5 h-4 bg-border ml-1.5" />
              </div>

              {/* Destination */}
              <LocationAutocomplete
                value={destination}
                onChange={onDestinationChange}
                placeholder="Destination"
                icon={<MapPin className="w-4 h-4 text-red-500" />}
                className="h-12"
              />

              {/* Search button */}
              <Button
                onClick={handleSearch}
                disabled={!origin || !destination || isCalculating}
                className="w-full h-12 mt-2"
                variant="glow"
              >
                {isCalculating ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Route ढूंढ रहा है...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Navigation className="w-5 h-5" />
                    Route ढूंढें
                  </span>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopSearchBar;
