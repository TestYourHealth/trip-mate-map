import React, { useEffect, useState, useCallback } from 'react';
import { Search, Loader2, X, Menu, Crosshair, Car, Fuel, Clock, Settings, HelpCircle, MapPin, Mic, MicOff, BarChart3, Satellite, ArrowUpDown, Circle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LocationAutocomplete, { PickedPlaceDetails } from './LocationAutocomplete';
import FavoriteLocations from './FavoriteLocations';
import SmartSuggestions from './SmartSuggestions';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Trip } from '@/pages/TripHistory';
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
  tripHistory?: Trip[];
  onDestinationPlacePicked?: (details: PickedPlaceDetails) => void;
  onOriginPlacePicked?: (details: PickedPlaceDetails) => void;
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
  isLocating = false,
  tripHistory = [],
  onDestinationPlacePicked,
  onOriginPlacePicked,
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
        setTimeout(() => onCalculate(origin, transcript), 100);
      }
    };

    recognition.start();
  }, [origin, onDestinationChange, onCalculate]);

  const detectCurrentLocation = useCallback(async () => {
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
      try { sessionStorage.setItem('lastKnownPos', JSON.stringify({ lat: pos.lat, lng: pos.lng })); } catch {}
      setHasAutoLocated(true);
      return address;
    } catch (error) {
      console.warn('Could not auto-detect location:', error);
      onOriginChange('Current Location');
      setHasAutoLocated(true);
      return 'Current Location';
    } finally {
      setIsGettingLocation(false);
    }
  }, [getCurrentPosition, onOriginChange]);

  // Auto-detect current location on mount (only when From is empty)
  useEffect(() => {
    if (hasAutoLocated || origin) return;
    detectCurrentLocation();
  }, [detectCurrentLocation, hasAutoLocated, origin]);

  // Auto-calculate when destination is selected
  const handleDestinationSelect = (value: string, details?: PickedPlaceDetails) => {
    if (details) onDestinationPlacePicked?.(details);
    if (origin && value && !isCalculating) {
      setTimeout(() => onCalculate(origin, value), 100);
    }
  };

  const handleOriginSelect = (value: string, details?: PickedPlaceDetails) => {
    if (details) onOriginPlacePicked?.(details);
    if (value && destination && !isCalculating) {
      setTimeout(() => onCalculate(value, destination), 100);
    }
  };

  const handleSwap = () => {
    const from = origin;
    const to = destination;
    onOriginChange(to);
    onDestinationChange(from);
    if (from && to && !isCalculating) {
      setTimeout(() => onCalculate(to, from), 100);
    }
  };

  const handleUseMyLocation = async () => {
    const address = await detectCurrentLocation();
    if (address && destination && !isCalculating) {
      setTimeout(() => onCalculate(address, destination), 100);
    }
    onLocateMe?.();
  };

  const handleClear = () => {
    onDestinationChange('');
  };

  const menuItems = [
    { label: 'Vehicle Settings', path: '/settings/vehicle', icon: Car },
    { label: 'Fuel Prices', path: '/settings/fuel', icon: Fuel },
    { label: 'Trip History', path: '/history', icon: Clock },
    { label: 'Trip Analytics', path: '/analytics', icon: BarChart3 },
    { label: 'Settings', path: '/settings', icon: Settings },
    { label: 'GPS Smoke Test', path: '/diagnostics/gps', icon: Satellite },
    { label: 'Help', path: '/help', icon: HelpCircle },
  ];

  return (
    <div className="absolute top-3 left-3 right-3 z-[150] animate-slide-down">
      {/* Ambient glow halo behind the bar */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -inset-2 rounded-3xl blur-2xl transition-opacity duration-500",
          isFocused ? "opacity-60" : "opacity-0"
        )}
        style={{ background: "radial-gradient(60% 60% at 50% 50%, hsl(var(--primary) / 0.35), transparent 70%)" }}
      />

      {/* Unified search card */}
      <div className={cn(
        "relative flex items-stretch rounded-3xl transition-all duration-300",
        "glass-card border-white/40 dark:border-white/10",
        "shadow-[0_8px_28px_-8px_hsl(var(--primary)/0.25)]",
        isFocused
          ? "shadow-[0_12px_40px_-8px_hsl(var(--primary)/0.45)] ring-1 ring-primary/40"
          : "hover:shadow-[0_10px_32px_-8px_hsl(var(--primary)/0.35)]"
      )}>
        {/* Subtle gradient sheen (clipped to card shape) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60 rounded-3xl overflow-hidden"
          style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.06), transparent 40%, hsl(var(--primary-glow) / 0.05))" }}
        />

        {/* Hamburger Menu */}
        <Sheet>
          <SheetTrigger asChild>
            <button
              className="relative flex-shrink-0 px-3 text-muted-foreground hover:text-primary transition-all duration-200 hover:bg-primary/5 rounded-l-3xl active:scale-90"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 border-r border-border/50" aria-describedby={undefined}>
            <SheetHeader>
              <SheetTitle className="text-left text-xl font-extrabold tracking-tight">
                <span className="gradient-text">TripMate</span>
              </SheetTitle>
            </SheetHeader>
            <nav className="mt-6 flex flex-col gap-1">
              {menuItems.map((item, i) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  style={{ animationDelay: `${i * 40}ms` }}
                  className="w-full flex items-center gap-3 text-left px-3 py-3 rounded-xl hover:bg-primary/10 hover:translate-x-0.5 transition-all duration-200 text-foreground text-sm group animate-fade-in"
                >
                  <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-muted/60 group-hover:bg-primary/15 transition-colors">
                    <item.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </span>
                  <span className="font-medium group-hover:text-primary transition-colors">{item.label}</span>
                </button>
              ))}
            </nav>
          </SheetContent>
        </Sheet>

        {/* Vertical divider */}
        <div className="my-3 w-px bg-border/60" />

        {/* Two-row search area */}
        <div className="relative flex-1 min-w-0">
          {/* FROM row */}
          <div className="flex items-center pl-3 pr-1">
            {isGettingLocation ? (
              <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0 mr-2" />
            ) : (
              <Circle className="w-3.5 h-3.5 flex-shrink-0 mr-2.5 ml-0.5 text-primary fill-primary/30" />
            )}
            <LocationAutocomplete
              value={origin}
              onChange={onOriginChange}
              onSelect={handleOriginSelect}
              placeholder="Going from?"
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className="border-0 bg-transparent shadow-none focus-visible:ring-0 h-10 text-sm font-medium placeholder:text-muted-foreground/50 placeholder:font-normal"
            />
            <button
              onClick={handleUseMyLocation}
              disabled={isLocating || isGettingLocation}
              className="flex-shrink-0 p-2 rounded-full text-primary hover:bg-primary/10 disabled:opacity-50 active:scale-90 transition-all"
              aria-label="Use my current location"
            >
              {isLocating || isGettingLocation ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Crosshair className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Divider + swap */}
          <div className="relative flex items-center pl-8 pr-12">
            <div className="h-px flex-1 bg-border/60" />
            <button
              onClick={handleSwap}
              className="absolute right-2 -translate-y-0 p-1.5 rounded-full glass-card text-muted-foreground hover:text-primary active:scale-90 transition-all z-10"
              aria-label="Swap from and to locations"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* TO row */}
          <div className="flex items-center pl-3 pr-1">
            {isCalculating ? (
              <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0 mr-2" />
            ) : (
              <MapPin className={cn(
                "w-4 h-4 flex-shrink-0 mr-2 transition-colors duration-200",
                isFocused ? "text-primary" : "text-muted-foreground/60"
              )} />
            )}
            <LocationAutocomplete
              value={destination}
              onChange={onDestinationChange}
              onSelect={handleDestinationSelect}
              placeholder="Going to?"
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className="border-0 bg-transparent shadow-none focus-visible:ring-0 h-10 text-sm font-medium placeholder:text-muted-foreground/50 placeholder:font-normal"
            />
            {destination && (
              <button
                onClick={handleClear}
                className="flex-shrink-0 p-1.5 rounded-full hover:bg-muted active:scale-90 transition-all animate-scale-in"
                aria-label="Clear destination"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
            <button
              onClick={startVoiceSearch}
              className={cn(
                "relative flex-shrink-0 p-2 rounded-full transition-all duration-200 active:scale-90",
                isListening
                  ? "bg-destructive/15 text-destructive"
                  : "text-muted-foreground hover:text-primary hover:bg-primary/10"
              )}
              aria-label="Voice search"
            >
              {isListening && (
                <span className="absolute inset-0 rounded-full bg-destructive/30 animate-ping" />
              )}
              {isListening ? <MicOff className="relative w-4 h-4" /> : <Mic className="relative w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Favorite Locations */}
      <div className="mt-2 ml-1">
        <FavoriteLocations
          onSelect={(address) => {
            onDestinationChange(address);
            if (origin && address) {
              setTimeout(() => onCalculate(origin, address), 100);
            }
          }}
          compact
        />
      </div>

      {/* Smart Suggestions - AI-like predictions */}
      {tripHistory.length > 0 && !destination && (
        <div className="mt-1.5 ml-1">
          <SmartSuggestions
            tripHistory={tripHistory}
            onSelect={(dest) => {
              onDestinationChange(dest);
              if (origin && dest) {
                setTimeout(() => onCalculate(origin, dest), 100);
              }
            }}
            compact
          />
        </div>
      )}
    </div>
  );
};

export default TopSearchBar;
