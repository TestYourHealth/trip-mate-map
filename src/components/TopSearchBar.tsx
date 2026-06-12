import React, { useEffect, useState, useCallback } from 'react';
import { Search, Loader2, X, Menu, Crosshair, Car, Fuel, Clock, Settings, HelpCircle, MapPin, Mic, MicOff, BarChart3 } from 'lucide-react';
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
        // Cache position for auto-theme sun calculation
        try { sessionStorage.setItem('lastKnownPos', JSON.stringify({ lat: pos.lat, lng: pos.lng })); } catch {}
        setHasAutoLocated(true);
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
  const handleDestinationSelect = (value: string, details?: PickedPlaceDetails) => {
    if (details) onDestinationPlacePicked?.(details);
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
    { label: 'Trip Analytics', path: '/analytics', icon: BarChart3 },
    { label: 'Settings', path: '/settings', icon: Settings },
    { label: 'Help', path: '/help', icon: HelpCircle },
  ];

  return (
    <div className="absolute top-3 left-3 right-3 z-[150] animate-slide-down">
      {/* Ambient glow halo behind the bar */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -inset-2 rounded-full blur-2xl transition-opacity duration-500",
          isFocused ? "opacity-60" : "opacity-0"
        )}
        style={{ background: "radial-gradient(60% 60% at 50% 50%, hsl(var(--primary) / 0.35), transparent 70%)" }}
      />

      {/* Unified search card */}
      <div className={cn(
        "relative flex items-center gap-0 rounded-full transition-all duration-300",
        "glass-card border-white/40 dark:border-white/10",
        "shadow-[0_8px_28px_-8px_hsl(var(--primary)/0.25)]",
        isFocused
          ? "shadow-[0_12px_40px_-8px_hsl(var(--primary)/0.45)] ring-1 ring-primary/40 scale-[1.005]"
          : "hover:shadow-[0_10px_32px_-8px_hsl(var(--primary)/0.35)]"
      )}>
        {/* Subtle gradient sheen (clipped to card shape) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60 rounded-full overflow-hidden"
          style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.06), transparent 40%, hsl(var(--primary-glow) / 0.05))" }}
        />


        {/* Hamburger Menu */}
        <Sheet>
          <SheetTrigger asChild>
            <button
              className="relative flex-shrink-0 p-3 pl-3.5 text-muted-foreground hover:text-primary transition-all duration-200 hover:bg-primary/5 rounded-l-full active:scale-90"
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
        <div className="h-6 w-px bg-border/60" />

        {/* Search input area */}
        <div className="relative flex-1 min-w-0 flex items-center pl-3">
          {isGettingLocation || isCalculating ? (
            <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0 mr-2" />
          ) : (
            <Search className={cn(
              "w-4 h-4 flex-shrink-0 mr-2 transition-colors duration-200",
              isFocused ? "text-primary" : "text-muted-foreground/60"
            )} />
          )}
          <LocationAutocomplete
            value={destination}
            onChange={onDestinationChange}
            onSelect={handleDestinationSelect}
            placeholder="Where to?"
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="border-0 bg-transparent shadow-none focus-visible:ring-0 h-11 text-sm font-medium placeholder:text-muted-foreground/50 placeholder:font-normal"
          />
          {destination && (
            <button
              onClick={handleClear}
              className="flex-shrink-0 p-1.5 mr-1 rounded-full hover:bg-muted active:scale-90 transition-all animate-scale-in"
              aria-label="Clear destination"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}

          {/* Voice search button */}
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

        {/* Vertical divider */}
        <div className="h-6 w-px bg-border/60" />

        {/* Locate me button */}
        <button
          onClick={onLocateMe}
          disabled={isLocating}
          className={cn(
            "relative flex-shrink-0 p-3 pr-3.5 transition-all duration-200 disabled:opacity-50 rounded-r-full active:scale-90",
            "text-primary hover:bg-primary/10"
          )}
          aria-label="Find my location"
        >
          {isLocating ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Crosshair className="w-5 h-5 drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]" />
          )}
        </button>
      </div>

      {/* Current location pill + Weather */}
      <div className="mt-2.5 ml-4 flex items-center gap-2 flex-wrap">
        {origin && (
          <div className="group inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground glass-card rounded-full px-3 py-1.5 hover:text-foreground transition-all animate-fade-in cursor-default">
            <span className="relative flex h-2 w-2">
              {!isGettingLocation && (
                <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-70 animate-ping" />
              )}
              <span className={cn(
                "relative inline-flex rounded-full h-2 w-2",
                isGettingLocation ? "bg-warning" : "bg-primary"
              )} />
            </span>
            <span className="truncate max-w-[180px]">
              {isGettingLocation ? 'Locating you…' : origin}
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