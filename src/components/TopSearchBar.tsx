import React, { useEffect, useState, useCallback } from 'react';
import { Search, Loader2, X, Menu, Crosshair, Car, Fuel, Clock, Settings, HelpCircle, MapPin, Mic, MicOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LocationAutocomplete from './LocationAutocomplete';
import FavoriteLocations from './FavoriteLocations';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
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
  onCalculate: (overrideOrigin?: string, overrideDestination?: string) => void;
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
  const [isListening, setIsListening] = useState(false);

  // Voice search using Web Speech API
  const startVoiceSearch = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Voice search is not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'hi-IN';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => {
      setIsListening(false);
      toast.error('Could not hear you. Please try again.');
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onDestinationChange(transcript);
      toast.success(`🎤 "${transcript}"`);
      // Auto-calculate after voice input
      if (origin && transcript) {
        setTimeout(() => onCalculate(), 500);
      }
    };

    recognition.start();
  }, [origin, onDestinationChange, onCalculate]);

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
        onOriginChange('Current Location');
        setHasAutoLocated(true);
      } finally {
        setIsGettingLocation(false);
      }
    };

    getLocation();
  }, [getCurrentPosition, onOriginChange, hasAutoLocated, origin]);

  // Auto-calculate when destination is selected
  const handleDestinationSelect = (value: string) => {
    if (origin && value && !isCalculating) {
      // Pass values directly to avoid stale closure
      setTimeout(() => onCalculate(origin, value), 100);
    }
  };

  const handleClear = () => {
    onDestinationChange('');
  };

  const menuItems = [
    { label: 'Vehicle Settings', path: '/settings/vehicle', icon: Car },
    { label: 'Fuel Prices', path: '/settings/fuel', icon: Fuel },
    { label: 'Trip History', path: '/history', icon: Clock },
    { label: 'Settings', path: '/settings', icon: Settings },
    { label: 'Help', path: '/help', icon: HelpCircle },
  ];

  return (
    <div className="absolute top-3 left-3 right-3 z-[150]">
      {/* Unified search card */}
      <div className={cn(
        "flex items-center gap-0 rounded-full transition-all duration-300",
        "glass-card",
        isFocused && "shadow-lg ring-1 ring-primary/30"
      )}>
        {/* Hamburger Menu */}
        <Sheet>
          <SheetTrigger asChild>
            <button className="flex-shrink-0 p-3 pl-3.5 text-muted-foreground hover:text-foreground transition-colors">
              <Menu className="w-5 h-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72" aria-describedby={undefined}>
            <SheetHeader>
              <SheetTitle className="text-left text-lg font-bold">
                <span className="gradient-text">TripMate</span>
              </SheetTitle>
            </SheetHeader>
            <nav className="mt-6 flex flex-col gap-0.5">
              {menuItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="w-full flex items-center gap-3 text-left px-4 py-3 rounded-xl hover:bg-muted transition-colors text-foreground text-sm group"
                >
                  <item.icon className="w-4.5 h-4.5 text-muted-foreground group-hover:text-primary transition-colors" />
                  {item.label}
                </button>
              ))}
            </nav>
          </SheetContent>
        </Sheet>

        {/* Search input area */}
        <div className="flex-1 min-w-0 flex items-center">
          {isGettingLocation || isCalculating ? (
            <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0 mr-2" />
          ) : (
            <Search className="w-4 h-4 text-muted-foreground/50 flex-shrink-0 mr-2" />
          )}
          <LocationAutocomplete
            value={destination}
            onChange={onDestinationChange}
            onSelect={handleDestinationSelect}
            placeholder="Search destination"
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="border-0 bg-transparent shadow-none focus-visible:ring-0 h-10 text-sm placeholder:text-muted-foreground/40"
          />
          {destination && (
            <button
              onClick={handleClear}
              className="flex-shrink-0 p-1.5 mr-1 rounded-full hover:bg-muted transition-colors"
              aria-label="Clear destination"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}

          {/* Voice search button */}
          <button
            onClick={startVoiceSearch}
            className={cn(
              "flex-shrink-0 p-2 rounded-full transition-all",
              isListening
                ? "bg-destructive/10 text-destructive animate-pulse"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}
            aria-label="Voice search"
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
        </div>

        {/* Locate me button */}
        <button
          onClick={onLocateMe}
          disabled={isLocating}
          className="flex-shrink-0 p-3 pr-3.5 text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
          aria-label="Find my location"
        >
          {isLocating ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Crosshair className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Current location pill + Weather */}
      <div className="mt-2 ml-4 flex items-center gap-2 flex-wrap">
        {origin && (
          <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm rounded-full px-2.5 py-1 shadow-sm border border-border/30">
            <MapPin className="w-3 h-3 text-primary" />
            <span className="truncate max-w-[160px]">
              {isGettingLocation ? 'Locating...' : origin}
            </span>
          </div>
        )}
      </div>

      {/* Favorite Locations */}
      <div className="mt-2 ml-1">
        <FavoriteLocations
          onSelect={(address) => {
            onDestinationChange(address);
            if (origin && address) {
              setTimeout(() => onCalculate(), 300);
            }
          }}
          compact
        />
      </div>
    </div>
  );
};

export default TopSearchBar;