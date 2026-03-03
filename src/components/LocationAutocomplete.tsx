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
  autoFocus?: boolean;
}

const suggestionsCache: Record<string, LocationSuggestion[]> = {};

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

const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Highlight matching text
const HighlightText: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  if (!query || query.length < 2) return <>{text}</>;
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <span key={i} className="text-primary font-semibold">{part}</span>
          : part
      )}
    </>
  );
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
  onBlur: externalOnBlur,
  autoFocus = false,
}) => {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [nearbySuggestions, setNearbySuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-focus
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    const saved = localStorage.getItem('recentLocationSearches');
    if (saved) {
      try { setRecentSearches(JSON.parse(saved).slice(0, 5)); } catch { setRecentSearches([]); }
    }
    getUserPosition().then(pos => setUserPos(pos));
  }, []);

  const saveToRecent = useCallback((location: string) => {
    setRecentSearches(prev => {
      const updated = [location, ...prev.filter(s => s !== location)].slice(0, 5);
      localStorage.setItem('recentLocationSearches', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const sortByProximity = useCallback((results: LocationSuggestion[]): LocationSuggestion[] => {
    if (!userPos) return results;
    return [...results].sort((a, b) => {
      const distA = haversineDistance(userPos.lat, userPos.lng, parseFloat(a.lat), parseFloat(a.lon));
      const distB = haversineDistance(userPos.lat, userPos.lng, parseFloat(b.lat), parseFloat(b.lon));
      return distA - distB;
    });
  }, [userPos]);

  const fetchNearby = useCallback(async (query: string) => {
    if (!userPos || query.length < 2) { setNearbySuggestions([]); return; }
    const cacheKey = `nearby_${query.toLowerCase().trim()}_${userPos.lat.toFixed(2)}_${userPos.lng.toFixed(2)}`;
    if (cacheKey in suggestionsCache) { setNearbySuggestions(suggestionsCache[cacheKey]); return; }
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&lat=${userPos.lat}&lon=${userPos.lng}&limit=3&bounded=0&addressdetails=0`,
        { headers: { 'User-Agent': 'TripMate/1.0' } }
      );
      const data = await response.json();
      const sorted = sortByProximity(data).slice(0, 3);
      suggestionsCache[cacheKey] = sorted;
      setNearbySuggestions(sorted);
    } catch { setNearbySuggestions([]); }
  }, [userPos, sortByProximity]);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) { setSuggestions([]); setIsLoading(false); return; }
    const cacheKey = query.toLowerCase().trim();
    if (cacheKey in suggestionsCache) {
      setSuggestions(sortByProximity(suggestionsCache[cacheKey]));
      setIsLoading(false);
      return;
    }
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=6&addressdetails=0`,
        { headers: { 'User-Agent': 'TripMate/1.0', 'Accept': 'application/json' }, signal: abortControllerRef.current.signal }
      );
      if (!response.ok) throw new Error('Network error');
      const data = await response.json();
      suggestionsCache[cacheKey] = data;
      setSuggestions(sortByProximity(data));
    } catch (error: any) {
      if (error.name !== 'AbortError') setSuggestions([]);
    } finally { setIsLoading(false); }
  }, [sortByProximity]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  // Build flat list of all selectable items for keyboard nav
  const getAllItems = useCallback((): Array<{ type: 'suggestion' | 'nearby' | 'recent' | 'popular'; data: LocationSuggestion | string }> => {
    const items: Array<{ type: 'suggestion' | 'nearby' | 'recent' | 'popular'; data: LocationSuggestion | string }> = [];
    const hasQuery = value.length >= 2;

    if (nearbySuggestions.length > 0) {
      nearbySuggestions.forEach(s => items.push({ type: 'nearby', data: s }));
    }
    if (recentSearches.length > 0 && !hasQuery) {
      recentSearches.forEach(s => items.push({ type: 'recent', data: s }));
    }
    const matchedPopular = hasQuery
      ? POPULAR_PLACES.filter(p => p.display_name.toLowerCase().includes(value.toLowerCase())).slice(0, 3)
      : [];
    if (matchedPopular.length > 0) {
      matchedPopular.forEach(p => items.push({ type: 'popular', data: p }));
    }
    if (!hasQuery && recentSearches.length === 0) {
      POPULAR_PLACES.slice(0, 4).forEach(p => items.push({ type: 'popular', data: p }));
    }
    if (suggestions.length > 0) {
      suggestions.forEach(s => items.push({ type: 'suggestion', data: s }));
    }
    return items;
  }, [value, suggestions, nearbySuggestions, recentSearches]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setActiveIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    // Instant for cached, 100ms debounce for network
    const cacheKey = newValue.toLowerCase().trim();
    if (cacheKey in suggestionsCache) {
      setSuggestions(sortByProximity(suggestionsCache[cacheKey]));
      setIsLoading(false);
    }

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(newValue);
      fetchNearby(newValue);
    }, 100);
  }, [onChange, fetchSuggestions, fetchNearby, sortByProximity]);

  const handleSelect = useCallback((suggestion: LocationSuggestion) => {
    const displayName = suggestion.display_name.split(',').slice(0, 3).join(',');
    onChange(displayName);
    onSelect?.(displayName);
    saveToRecent(displayName);
    setSuggestions([]);
    setNearbySuggestions([]);
    setShowSuggestions(false);
    setActiveIndex(-1);
  }, [onChange, onSelect, saveToRecent]);

  const handleRecentSelect = useCallback((recent: string) => {
    onChange(recent);
    onSelect?.(recent);
    setShowSuggestions(false);
    setActiveIndex(-1);
  }, [onChange, onSelect]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const items = getAllItems();
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev <= 0 ? items.length - 1 : prev - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      const item = items[activeIndex];
      if (item.type === 'recent') {
        handleRecentSelect(item.data as string);
      } else {
        handleSelect(item.data as LocationSuggestion);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setActiveIndex(-1);
    }
  }, [getAllItems, activeIndex, handleSelect, handleRecentSelect]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-suggestion-item]');
      items[activeIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasQuery = value.length >= 2;
  const matchedPopular = hasQuery
    ? POPULAR_PLACES.filter(p => p.display_name.toLowerCase().includes(value.toLowerCase())).slice(0, 3)
    : [];

  const showDropdown = showSuggestions && (
    isLoading || suggestions.length > 0 || nearbySuggestions.length > 0 ||
    matchedPopular.length > 0 || recentSearches.length > 0
  );

  // Track global item index for keyboard navigation highlighting
  let itemIndex = 0;

  const renderItem = (
    content: React.ReactNode,
    onClick: () => void,
    key: string
  ) => {
    const currentIndex = itemIndex++;
    return (
      <button
        key={key}
        data-suggestion-item
        onClick={onClick}
        onMouseEnter={() => setActiveIndex(currentIndex)}
        className={cn(
          "w-full px-4 py-2.5 text-left transition-colors flex items-start gap-3",
          currentIndex === activeIndex ? "bg-accent" : "hover:bg-muted/50"
        )}
      >
        {content}
      </button>
    );
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2">{icon}</div>
        )}
        <Input
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { setShowSuggestions(true); externalOnFocus?.(); }}
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
          <div className="absolute right-2 top-1/2 -translate-y-1/2">{rightElement}</div>
        )}
        {isLoading && (
          <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {showDropdown && (
        <div ref={listRef} className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-xl shadow-lg z-[300] max-h-72 overflow-y-auto animate-fade-in">
          {isLoading && (
            <div className="px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Searching...
            </div>
          )}

          {/* Nearby */}
          {!isLoading && nearbySuggestions.length > 0 && (
            <div className="py-1">
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Navigation className="w-3 h-3" /> Nearby
              </div>
              {nearbySuggestions.map((s) =>
                renderItem(
                  <>
                    <Navigation className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-sm text-foreground line-clamp-1">
                        <HighlightText text={s.display_name.split(',').slice(0, 2).join(',')} query={value} />
                      </span>
                      <span className="text-xs text-muted-foreground line-clamp-1">{s.display_name.split(',').slice(2, 4).join(',')}</span>
                    </div>
                  </>,
                  () => handleSelect(s),
                  `nearby-${s.place_id}`
                )
              )}
            </div>
          )}

          {/* Recent */}
          {!isLoading && recentSearches.length > 0 && !hasQuery && (
            <div className="py-1">
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" /> Recent
              </div>
              {recentSearches.map((recent, index) =>
                renderItem(
                  <>
                    <Clock className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground truncate">{recent}</span>
                  </>,
                  () => handleRecentSelect(recent),
                  `recent-${index}`
                )
              )}
            </div>
          )}

          {/* Popular (matched) */}
          {!isLoading && matchedPopular.length > 0 && (
            <div className="py-1">
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Star className="w-3 h-3" /> Popular
              </div>
              {matchedPopular.map((place) =>
                renderItem(
                  <>
                    <Star className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                    <span className="text-sm text-foreground line-clamp-1">
                      <HighlightText text={place.display_name} query={value} />
                    </span>
                  </>,
                  () => handleSelect(place),
                  `popular-${place.place_id}`
                )
              )}
            </div>
          )}

          {/* Popular (idle) */}
          {!isLoading && !hasQuery && recentSearches.length === 0 && (
            <div className="py-1">
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Star className="w-3 h-3" /> Popular Destinations
              </div>
              {POPULAR_PLACES.slice(0, 4).map((place) =>
                renderItem(
                  <>
                    <Star className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                    <span className="text-sm text-foreground line-clamp-1">{place.display_name}</span>
                  </>,
                  () => handleSelect(place),
                  `idle-popular-${place.place_id}`
                )
              )}
            </div>
          )}

          {/* Search results */}
          {!isLoading && suggestions.length > 0 && (
            <div className="py-1">
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Search className="w-3 h-3" /> Search Results
              </div>
              {suggestions.map((suggestion) =>
                renderItem(
                  <>
                    <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-sm text-foreground line-clamp-1">
                        <HighlightText text={suggestion.display_name.split(',').slice(0, 2).join(',')} query={value} />
                      </span>
                      <span className="text-xs text-muted-foreground line-clamp-1">{suggestion.display_name.split(',').slice(2, 4).join(',')}</span>
                    </div>
                  </>,
                  () => handleSelect(suggestion),
                  `result-${suggestion.place_id}`
                )
              )}
            </div>
          )}

          {/* No results */}
          {!isLoading && suggestions.length === 0 && nearbySuggestions.length === 0 && matchedPopular.length === 0 && value.length >= 3 && (
            <div className="px-4 py-3 text-sm text-muted-foreground">No locations found</div>
          )}
        </div>
      )}
    </div>
  );
};

export default LocationAutocomplete;
