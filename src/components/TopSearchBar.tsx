import React, { useEffect, useState } from 'react';
import { Search, Loader2, X } from 'lucide-react';
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
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [hasAutoLocated, setHasAutoLocated] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

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

  // Auto-calculate when destination is selected
  useEffect(() => {
    if (origin && destination && !hasRoute && !isCalculating) {
      // Small delay to ensure UI updates first
      const timer = setTimeout(() => {
        onCalculate();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [destination, origin, hasRoute, isCalculating, onCalculate]);

  const handleClear = () => {
    onDestinationChange('');
  };

  return (
    <div className="absolute top-16 left-4 right-4 z-[150] md:left-1/2 md:-translate-x-1/2 md:max-w-md md:right-auto md:w-full">
      {/* Apple Maps style search bar */}
      <div 
        className={cn(
          "bg-background/95 backdrop-blur-xl rounded-2xl shadow-xl border transition-all duration-300",
          isFocused ? "ring-2 ring-primary/30" : ""
        )}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Search icon or loading indicator */}
          <div className="flex-shrink-0">
            {isGettingLocation || isCalculating ? (
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            ) : (
              <Search className="w-5 h-5 text-muted-foreground" />
            )}
          </div>

          {/* Destination input */}
          <div className="flex-1 min-w-0">
            <LocationAutocomplete
              value={destination}
              onChange={onDestinationChange}
              placeholder="कहां जाना है?"
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className="border-0 bg-transparent shadow-none focus-visible:ring-0 h-10 text-base placeholder:text-muted-foreground/70"
            />
          </div>

          {/* Clear button */}
          {destination && (
            <button
              onClick={handleClear}
              className="flex-shrink-0 p-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors"
              aria-label="Clear destination"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Current location indicator - subtle bottom section */}
        {origin && (
          <div className="px-4 pb-3 pt-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="truncate">
                {isGettingLocation ? 'Locating...' : `From: ${origin}`}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopSearchBar;
