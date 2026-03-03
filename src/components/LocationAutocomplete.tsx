import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Loader2, Search, Clock, Navigation, Star } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface LocationSuggestion {
  display_name: string;
  lat: string;
  lon: string;
  place_id: number;
  type?: string;
  class?: string;
}

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (value: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  className?: string;
  rightElement?: React.ReactNode;
  onFocus?: () => void;
  onBlur?: () => void;
}

// Suggestions cache - shared across all instances
const suggestionsCache: Record<string, LocationSuggestion[]> = {};

// Popular landmarks in India
const POPULAR_PLACES: LocationSuggestion[] = [
  { display_name: 'India Gate, New Delhi', lat: '28.6129', lon: '77.2295', place_id: -1, type: 'landmark' },
  { display_name: 'Gateway of India, Mumbai', lat: '18.9220', lon: '72.8347', place_id: -2, type: 'landmark' },
  { display_name: 'Taj Mahal, Agra', lat: '27.1751', lon: '78.0421', place_id: -3, type: 'landmark' },
  { display_name: 'Hawa Mahal, Jaipur', lat: '26.9239', lon: '75.8267', place_id: -4, type: 'landmark' },
  { display_name: 'Charminar, Hyderabad', lat: '17.3616', lon: '78.4747', place_id: -5, type: 'landmark' },
  { display_name: 'Marine Drive, Mumbai', lat: '18.9432', lon: '72.8235', place_id: -6, type: 'landmark' },
  { display_name: 'Connaught Place, New Delhi', lat: '28.6315', lon: '77.2167', place_id: -7, type: 'landmark' },
  { display_name: 'MG Road, Bangalore', lat: '12.9758', lon: '77.6045', place_id: -8, type: 'landmark' },
];

// Get user's current position (cached)
let cachedUserPosition: { lat: number; lng: number } | null = null;
const getUserPosition = (): Promise<{ lat: number; lng: number } | null> => {
  if (cachedUserPosition) return Promise.resolve(cachedUserPosition);
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        cachedUserPosition = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        resolve(cachedUserPosition);
      },
      () => resolve(null),
      { timeout: 3000, maximumAge: 60000 }
    );
  });
};

// Calculate distance between two points in km
const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  value,
  onChange,
  onSelect,
  placeholder = "Search location...",
  icon,
  className,
  rightElement,
  onFocus: externalOnFocus,
  onBlur: externalOnBlur
}) => {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [nearbySuggestions, setNearbySuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentLocationSearches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved).slice(0, 5));
      } catch {
        setRecentSearches([]);
      }
    }
    // Get user position for nearby sorting
    getUserPosition().then(pos => setUserPos(pos));
  }, []);

  // Save to recent searches
  const saveToRecent = useCallback((location: string) => {
    setRecentSearches(prev => {
      const updated = [location, ...prev.filter(s => s !== location)].slice(0, 5);
      localStorage.setItem('recentLocationSearches', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Sort suggestions by distance from user
  const sortByProximity = useCallback((results: LocationSuggestion[]): LocationSuggestion[] => {
    if (!userPos) return results;
    return [...results].sort((a, b) => {
      const distA = haversineDistance(userPos.lat, userPos.lng, parseFloat(a.lat), parseFloat(a.lon));
      const distB = haversineDistance(userPos.lat, userPos.lng, parseFloat(b.lat), parseFloat(b.lon));
      return distA - distB;
    });
  }, [userPos]);

  // Fetch nearby places
  const fetchNearby = useCallback(async (query: string) => {
    if (!userPos || query.length < 2) {
      setNearbySuggestions([]);
      return;
    }
    const cacheKey = `nearby_${query.toLowerCase().trim()}_${userPos.lat.toFixed(2)}_${userPos.lng.toFixed(2)}`;
    if (cacheKey in suggestionsCache) {
      setNearbySuggestions(suggestionsCache[cacheKey]);
      return;
    }
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&lat=${userPos.lat}&lon=${userPos.lng}&limit=3&bounded=0&addressdetails=0`,
        { headers: { 'User-Agent': 'TripMate/1.0' } }
      );
      const data = await response.json();
      const sorted = sortByProximity(data).slice(0, 3);
      suggestionsCache[cacheKey] = sorted;
      setNearbySuggestions(sorted);
    } catch {
      setNearbySuggestions([]);
    }
  }, [userPos, sortByProximity]);

  // Fetch global suggestions from Nominatim with caching and abort
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    const cacheKey = query.toLowerCase().trim();
    if (cacheKey in suggestionsCache) {
      setSuggestions(sortByProximity(suggestionsCache[cacheKey]));
      setIsLoading(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=6&addressdetails=0`,
        { 
          headers: { 'User-Agent': 'TripMate/1.0', 'Accept': 'application/json' },
          signal: abortControllerRef.current.signal
        }
      );
      if (!response.ok) throw new Error('Network error');
      const data = await response.json();
      suggestionsCache[cacheKey] = data;
      setSuggestions(sortByProximity(data));
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        setSuggestions([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [sortByProximity]);

  // Clear on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  // Debounced search
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(newValue);
      fetchNearby(newValue);
    }, 150);
  }, [onChange, fetchSuggestions, fetchNearby]);

  const handleSelect = useCallback((suggestion: LocationSuggestion) => {
    const displayName = suggestion.display_name.split(',').slice(0, 3).join(',');
    onChange(displayName);
    onSelect?.(displayName);
    saveToRecent(displayName);
    setSuggestions([]);
    setNearbySuggestions([]);
    setShowSuggestions(false);
  }, [onChange, onSelect, saveToRecent]);

  const handleRecentSelect = useCallback((recent: string) => {
    onChange(recent);
    onSelect?.(recent);
    setShowSuggestions(false);
  }, [onChange, onSelect]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter popular places by query
  const matchedPopular = value.length >= 2
    ? POPULAR_PLACES.filter(p => p.display_name.toLowerCase().includes(value.toLowerCase())).slice(0, 3)
    : [];

  // Determine what to show in the idle state (no query typed yet)
  const hasQuery = value.length >= 2;
  const showDropdown = showSuggestions && (
    isLoading || 
    suggestions.length > 0 || 
    nearbySuggestions.length > 0 || 
    matchedPopular.length > 0 || 
    recentSearches.length > 0
  );

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            {icon}
          </div>
        )}
        <Input
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onFocus={() => {
            setShowSuggestions(true);
            externalOnFocus?.();
          }}
          onBlur={() => externalOnBlur?.()}
          placeholder={placeholder}
          className={cn(
            "bg-muted/50 border-0 focus-visible:ring-primary h-12",
            icon && "pl-10",
            rightElement && "pr-12",
            className
          )}
        />
        {rightElement && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            {rightElement}
          </div>
        )}
        {isLoading && (
          <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-xl shadow-lg z-[300] max-h-72 overflow-y-auto animate-fade-in">
          {/* Loading */}
          {isLoading && (
            <div className="px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Searching...
            </div>
          )}

          {/* Nearby places (highest priority when query matches) */}
          {!isLoading && nearbySuggestions.length > 0 && (
            <div className="py-1">
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Navigation className="w-3 h-3" />
                Nearby
              </div>
              {nearbySuggestions.map((s) => (
                <button
                  key={`nearby-${s.place_id}`}
                  onClick={() => handleSelect(s)}
                  className="w-full px-4 py-2.5 text-left hover:bg-muted/50 transition-colors flex items-start gap-3"
                >
                  <Navigation className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-sm text-foreground line-clamp-1">{s.display_name.split(',').slice(0, 2).join(',')}</span>
                    <span className="text-xs text-muted-foreground line-clamp-1">{s.display_name.split(',').slice(2, 4).join(',')}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Recent Searches */}
          {!isLoading && recentSearches.length > 0 && !hasQuery && (
            <div className="py-1">
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Recent
              </div>
              {recentSearches.map((recent, index) => (
                <button
                  key={index}
                  onClick={() => handleRecentSelect(recent)}
                  className="w-full px-4 py-2.5 text-left hover:bg-muted/50 transition-colors flex items-center gap-3"
                >
                  <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-foreground truncate">{recent}</span>
                </button>
              ))}
            </div>
          )}

          {/* Popular landmarks */}
          {!isLoading && matchedPopular.length > 0 && (
            <div className="py-1">
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Star className="w-3 h-3" />
                Popular
              </div>
              {matchedPopular.map((place) => (
                <button
                  key={place.place_id}
                  onClick={() => handleSelect(place)}
                  className="w-full px-4 py-2.5 text-left hover:bg-muted/50 transition-colors flex items-start gap-3"
                >
                  <Star className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                  <span className="text-sm text-foreground line-clamp-1">{place.display_name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Popular places when idle (no query) */}
          {!isLoading && !hasQuery && recentSearches.length === 0 && (
            <div className="py-1">
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Star className="w-3 h-3" />
                Popular Destinations
              </div>
              {POPULAR_PLACES.slice(0, 4).map((place) => (
                <button
                  key={place.place_id}
                  onClick={() => handleSelect(place)}
                  className="w-full px-4 py-2.5 text-left hover:bg-muted/50 transition-colors flex items-start gap-3"
                >
                  <Star className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                  <span className="text-sm text-foreground line-clamp-1">{place.display_name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Global search results */}
          {!isLoading && suggestions.length > 0 && (
            <div className="py-1">
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Search className="w-3 h-3" />
                Search Results
              </div>
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.place_id}
                  onClick={() => handleSelect(suggestion)}
                  className="w-full px-4 py-2.5 text-left hover:bg-muted/50 transition-colors flex items-start gap-3"
                >
                  <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-sm text-foreground line-clamp-1">{suggestion.display_name.split(',').slice(0, 2).join(',')}</span>
                    <span className="text-xs text-muted-foreground line-clamp-1">{suggestion.display_name.split(',').slice(2, 4).join(',')}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No results */}
          {!isLoading && suggestions.length === 0 && nearbySuggestions.length === 0 && matchedPopular.length === 0 && value.length >= 3 && (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              No locations found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LocationAutocomplete;
