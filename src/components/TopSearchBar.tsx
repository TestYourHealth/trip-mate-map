import React, { useEffect, useState } from 'react';
import { Search, Loader2, X, Menu, Crosshair } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LocationAutocomplete from './LocationAutocomplete';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface TopSearchBarProps {
  origin: string;
  destination: string;
  onOriginChange: (value: string) => void;
  onDestinationChange: (value: string) => void;
  onCalculate: () => void;
  isCalculating: boolean;
  hasRoute: boolean;
  getCurrentPosition: () => Promise<{ lat: number; lng: number; heading: number | null }>;
  onLocateMe?: () => void;
  isLocating?: boolean;
}

const TopSearchBar: React.FC<TopSearchBarProps> = ({
  origin,
  destination,
  onOriginChange,
  onDestinationChange,
  onCalculate,
  isCalculating,
  hasRoute,
  getCurrentPosition,
  onLocateMe,
  isLocating = false
}) => {
  const navigate = useNavigate();
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

  // Auto-calculate when destination is selected (not on every keystroke)
  const handleDestinationSelect = (value: string) => {
    if (origin && value && !isCalculating) {
      setTimeout(() => {
        onCalculate();
      }, 300);
    }
  };

  const handleClear = () => {
    onDestinationChange('');
  };

  const menuItems = [
    { label: 'Vehicle Settings', path: '/settings/vehicle' },
    { label: 'Fuel Prices', path: '/settings/fuel' },
    { label: 'Trip History', path: '/history' },
    { label: 'Settings', path: '/settings' },
    { label: 'Help', path: '/help' },
  ];

  return (
    <div className="absolute top-4 left-4 right-4 z-[150]">
      {/* Header row: Hamburger + Search + Location */}
      <div className="flex items-center gap-2">
        {/* Hamburger Menu */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="flex-shrink-0 bg-background/95 backdrop-blur-xl shadow-lg border"
            >
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72" aria-describedby={undefined}>
            <SheetHeader>
              <SheetTitle className="text-left">TripMate</SheetTitle>
            </SheetHeader>
            <nav className="mt-6 flex flex-col gap-1">
              {menuItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="w-full text-left px-4 py-3 rounded-lg hover:bg-muted transition-colors text-foreground"
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </SheetContent>
        </Sheet>

        {/* Search Bar */}
        <div 
          className={cn(
            "flex-1 bg-background/95 backdrop-blur-xl rounded-2xl shadow-lg border transition-all duration-300",
            isFocused ? "ring-2 ring-primary/30" : ""
          )}
        >
          <div className="flex items-center gap-2 px-3 py-2">
            {/* Search icon or loading indicator */}
            <div className="flex-shrink-0">
              {isGettingLocation || isCalculating ? (
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
              ) : (
                <Search className="w-4 h-4 text-muted-foreground" />
              )}
            </div>

            {/* Destination input */}
            <div className="flex-1 min-w-0">
              <LocationAutocomplete
                value={destination}
                onChange={onDestinationChange}
                onSelect={handleDestinationSelect}
                placeholder="कहां जाना है?"
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className="border-0 bg-transparent shadow-none focus-visible:ring-0 h-9 text-sm placeholder:text-muted-foreground/70"
              />
            </div>

            {/* Clear button */}
            {destination && (
              <button
                onClick={handleClear}
                className="flex-shrink-0 p-1 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                aria-label="Clear destination"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Current Location Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={onLocateMe}
          disabled={isLocating}
          className="flex-shrink-0 bg-background/95 backdrop-blur-xl shadow-lg border"
          aria-label="Find my location"
        >
          {isLocating ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Crosshair className="w-5 h-5" />
          )}
        </Button>
      </div>

      {/* Current location indicator - below the header */}
      {origin && (
        <div className="mt-2 px-14">
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm rounded-full px-3 py-1.5 w-fit">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="truncate max-w-[200px]">
              {isGettingLocation ? 'Locating...' : origin}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopSearchBar;
