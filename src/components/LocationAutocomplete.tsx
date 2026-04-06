import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Loader2, Search, Clock, Navigation, Star, Globe } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface LocationSuggestion {
  display_name: string;
  lat: string;
  lon: string;
  place_id: number;
  type?: string;
  class?: string;
  importance?: number;
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

// Simple in-memory cache
const cache: Record<string, LocationSuggestion[]> = {};

// Common Indian cities for fuzzy matching (covers typos like "delih" → "Delhi")
const FUZZY_CITIES: string[] = [
  'Delhi', 'New Delhi', 'Mumbai', 'Bangalore', 'Bengaluru', 'Chennai', 'Kolkata',
  'Hyderabad', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur',
  'Indore', 'Thane', 'Bhopal', 'Visakhapatnam', 'Patna', 'Vadodara', 'Ghaziabad',
  'Ludhiana', 'Agra', 'Nashik', 'Faridabad', 'Meerut', 'Rajkot', 'Varanasi',
  'Srinagar', 'Aurangabad', 'Dhanbad', 'Amritsar', 'Allahabad', 'Prayagraj',
  'Ranchi', 'Howrah', 'Coimbatore', 'Jodhpur', 'Madurai', 'Gwalior', 'Vijayawada',
  'Chandigarh', 'Dehradun', 'Mysore', 'Mysuru', 'Noida', 'Gurugram', 'Gurgaon',
  'Kochi', 'Trivandrum', 'Thiruvananthapuram', 'Udaipur', 'Shimla', 'Manali',
  'Rishikesh', 'Haridwar', 'Mathura', 'Vrindavan', 'Ajmer', 'Pushkar', 'Jaisalmer',
  'Raipur', 'Guwahati', 'Bhubaneswar', 'Cuttack', 'Jammu', 'Surat', 'Mangalore',
  'Tirupati', 'Ooty', 'Kodaikanal', 'Pondicherry', 'Puducherry', 'Goa', 'Panaji',
  'Nainital', 'Mussoorie', 'Darjeeling', 'Gangtok', 'Shillong', 'Leh', 'Ladakh',
  'Amravati', 'Kolhapur', 'Solapur', 'Bikaner', 'Kota', 'Bareilly', 'Aligarh',
  'Moradabad', 'Gorakhpur', 'Jabalpur', 'Tiruchirappalli', 'Salem', 'Hubli',
  'Belgaum', 'Belagavi', 'Siliguri', 'Durgapur', 'Asansol', 'Nanded', 'Warangal',
  'Guntur', 'Bhilai', 'Jalandhar', 'Firozabad', 'Loni', 'Jhansi',
];

// Levenshtein distance for fuzzy matching
const levenshtein = (a: string, b: string): number => {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
};

// Find best fuzzy match for a query
const fuzzyMatch = (query: string): string | null => {
  const q = query.toLowerCase().trim();
  if (q.length < 3) return null;

  let bestMatch: string | null = null;
  let bestScore = Infinity;
  const maxDist = Math.max(2, Math.floor(q.length * 0.4)); // Allow ~40% typo tolerance

  for (const city of FUZZY_CITIES) {
    const c = city.toLowerCase();
    // Check if starts similarly
    if (c.startsWith(q) || q.startsWith(c)) return city;
    // Check substring match
    if (c.includes(q) || q.includes(c)) return city;
    // Levenshtein
    const dist = levenshtein(q, c);
    if (dist < bestScore && dist <= maxDist) {
      bestScore = dist;
      bestMatch = city;
    }
  }
  return bestMatch;
};

const POPULAR_PLACES: LocationSuggestion[] = [
  { display_name: 'India Gate, New Delhi, Delhi, India', lat: '28.6129', lon: '77.2295', place_id: -1 },
  { display_name: 'Gateway of India, Mumbai, Maharashtra, India', lat: '18.9220', lon: '72.8347', place_id: -2 },
  { display_name: 'Taj Mahal, Agra, Uttar Pradesh, India', lat: '27.1751', lon: '78.0421', place_id: -3 },
  { display_name: 'Hawa Mahal, Jaipur, Rajasthan, India', lat: '26.9239', lon: '75.8267', place_id: -4 },
  { display_name: 'Charminar, Hyderabad, Telangana, India', lat: '17.3616', lon: '78.4747', place_id: -5 },
  { display_name: 'Marine Drive, Mumbai, Maharashtra, India', lat: '18.9432', lon: '72.8235', place_id: -6 },
  { display_name: 'Connaught Place, New Delhi, Delhi, India', lat: '28.6315', lon: '77.2167', place_id: -7 },
  { display_name: 'MG Road, Bangalore, Karnataka, India', lat: '12.9758', lon: '77.6045', place_id: -8 },
];

// Cached user position
let cachedUserPos: { lat: number; lng: number } | null = null;
const getUserPos = (): Promise<{ lat: number; lng: number } | null> => {
  if (cachedUserPos) return Promise.resolve(cachedUserPos);
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        cachedUserPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        resolve(cachedUserPos);
      },
      () => resolve(null),
      { timeout: 5000, maximumAge: 300000 }
    );
  });
};

const haversine = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatDistance = (km: number): string => {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 100) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
};

// Highlight matching text in results
const HighlightText = React.forwardRef<HTMLSpanElement, { text: string; query: string }>(
  ({ text, query }, ref) => {
    if (!query || query.length < 2) return <span ref={ref}>{text}</span>;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    return (
      <span ref={ref}>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase()
            ? <span key={i} className="text-primary font-semibold">{part}</span>
            : <React.Fragment key={i}>{part}</React.Fragment>
        )}
      </span>
    );
  }
);
HighlightText.displayName = 'HighlightText';

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
  const [results, setResults] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [activeFilter, setActiveFilter] = useState<'all' | 'nearby' | 'recent' | 'popular' | 'global'>('all');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController | null>(null);
  const lastQueryRef = useRef('');
  const correctedQueryRef = useRef<string | null>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) inputRef.current.focus();
  }, [autoFocus]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('recentLocationSearches');
      if (saved) setRecentSearches(JSON.parse(saved).slice(0, 6));
    } catch { /* ignore */ }
    getUserPos().then(pos => setUserPos(pos));
  }, []);

  const saveToRecent = useCallback((location: string) => {
    setRecentSearches(prev => {
      const updated = [location, ...prev.filter(s => s !== location)].slice(0, 6);
      localStorage.setItem('recentLocationSearches', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Smart search: single request with viewbox for proximity bias
  const search = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const cacheKey = trimmed.toLowerCase();
    if (cache[cacheKey]) {
      setResults(cache[cacheKey]);
      setIsLoading(false);
      return;
    }

    // Abort previous
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setIsLoading(true);
    lastQueryRef.current = trimmed;

    try {
      // Build URL with viewbox bias (not bounded) for proximity-aware global search
      let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmed)}&limit=8&addressdetails=1&dedupe=1&countrycodes=in`;
      
      if (userPos) {
        const delta = 2;
        url += `&viewbox=${userPos.lng - delta},${userPos.lat - delta},${userPos.lng + delta},${userPos.lat + delta}`;
      }

      const response = await fetch(url, {
        headers: { 'User-Agent': 'TripMate/1.0', 'Accept': 'application/json' },
        signal: abortRef.current.signal
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      let data: LocationSuggestion[] = await response.json();

      // If no results, try fuzzy correction
      if (data.length === 0) {
        const corrected = fuzzyMatch(trimmed);
        if (corrected && corrected.toLowerCase() !== trimmed.toLowerCase()) {
          const fuzzyUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(corrected)}&limit=8&addressdetails=1&dedupe=1&countrycodes=in`;
          const fuzzyRes = await fetch(fuzzyUrl, {
            headers: { 'User-Agent': 'TripMate/1.0', 'Accept': 'application/json' },
            signal: abortRef.current.signal
          });
          if (fuzzyRes.ok) {
            data = await fuzzyRes.json();
            // Tag results so UI can show "Did you mean: corrected?"
            if (data.length > 0) {
              correctedQueryRef.current = corrected;
            }
          }
        }
      } else {
        correctedQueryRef.current = null;
      }

      // Sort: nearby first, then by importance
      let sorted = data;
      if (userPos) {
        sorted = [...data].sort((a, b) => {
          const distA = haversine(userPos.lat, userPos.lng, parseFloat(a.lat), parseFloat(a.lon));
          const distB = haversine(userPos.lat, userPos.lng, parseFloat(b.lat), parseFloat(b.lon));
          const scoreA = distA < 50 ? -1000 : distA < 200 ? -500 : 0;
          const scoreB = distB < 50 ? -1000 : distB < 200 ? -500 : 0;
          return (scoreA - scoreB) || (distA - distB);
        });
      }

      cache[cacheKey] = sorted;
      if (lastQueryRef.current === trimmed) {
        setResults(sorted);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError' && lastQueryRef.current === trimmed) {
        try {
          // Fallback request if proximity-biased query fails
          const fallbackResponse = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmed)}&limit=6&addressdetails=1&dedupe=1`,
            { signal: abortRef.current?.signal }
          );
          if (!fallbackResponse.ok) throw new Error(`HTTP ${fallbackResponse.status}`);
          const fallbackData: LocationSuggestion[] = await fallbackResponse.json();
          cache[cacheKey] = fallbackData;
          setResults(fallbackData);
        } catch {
          setResults([]);
        }
      }
    } finally {
      if (lastQueryRef.current === trimmed) {
        setIsLoading(false);
      }
    }
  }, [userPos]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setActiveIndex(-1);
    setShowDropdown(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    // Instant for cached
    const cacheKey = newValue.trim().toLowerCase();
    if (cache[cacheKey]) {
      setResults(cache[cacheKey]);
      setIsLoading(false);
      return;
    }

    if (newValue.trim().length >= 2) {
      setIsLoading(true);
    }

    // 150ms debounce - fast but still respects rate limits
    debounceRef.current = setTimeout(() => search(newValue), 150);
  }, [onChange, search]);

  const handleSelect = useCallback((suggestion: LocationSuggestion) => {
    const displayName = suggestion.display_name.split(',').slice(0, 3).join(',').trim();
    onChange(displayName);
    onSelect?.(displayName);
    saveToRecent(displayName);
    setResults([]);
    setShowDropdown(false);
    setActiveIndex(-1);
  }, [onChange, onSelect, saveToRecent]);

  const handleRecentSelect = useCallback((recent: string) => {
    onChange(recent);
    onSelect?.(recent);
    setShowDropdown(false);
    setActiveIndex(-1);
  }, [onChange, onSelect]);

  // Build flat items list for keyboard nav
  const getAllItems = useCallback(() => {
    const items: Array<{ type: 'recent' | 'popular' | 'result'; data: LocationSuggestion | string }> = [];
    const hasQuery = value.trim().length >= 2;

    if (!hasQuery) {
      // Show recent + popular when idle
      recentSearches.forEach(s => items.push({ type: 'recent', data: s }));
      if (recentSearches.length === 0) {
        POPULAR_PLACES.slice(0, 5).forEach(p => items.push({ type: 'popular', data: p }));
      }
    } else {
      // Filter popular that match
      const matched = POPULAR_PLACES.filter(p =>
        p.display_name.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 2);
      matched.forEach(p => items.push({ type: 'popular', data: p }));

      // Search results
      results.forEach(r => items.push({ type: 'result', data: r }));
    }
    return items;
  }, [value, results, recentSearches]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const items = getAllItems();
    if (!items.length && e.key !== 'Escape') return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev <= 0 ? items.length - 1 : prev - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && items[activeIndex]) {
        const item = items[activeIndex];
        if (item.type === 'recent') handleRecentSelect(item.data as string);
        else handleSelect(item.data as LocationSuggestion);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      setActiveIndex(-1);
    }
  }, [getAllItems, activeIndex, handleSelect, handleRecentSelect]);

  // Scroll active into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const els = listRef.current.querySelectorAll('[data-item]');
      els[activeIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  // Click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const hasQuery = value.trim().length >= 2;
  const matchedPopular = hasQuery
    ? POPULAR_PLACES.filter(p => p.display_name.toLowerCase().includes(value.toLowerCase())).slice(0, 2)
    : [];

  const shouldShowDropdown = showDropdown && (
    isLoading || results.length > 0 || matchedPopular.length > 0 ||
    recentSearches.length > 0 || (!hasQuery)
  );

  let itemIdx = 0;
  const renderRow = (content: React.ReactNode, onClick: () => void, key: string) => {
    const idx = itemIdx++;
    return (
      <button
        key={key}
        data-item
        onClick={onClick}
        onMouseEnter={() => setActiveIndex(idx)}
        className={cn(
          "w-full px-3 py-2.5 text-left transition-colors flex items-start gap-3",
          idx === activeIndex ? "bg-accent" : "hover:bg-muted/50"
        )}
      >
        {content}
      </button>
    );
  };

  const getDistanceLabel = (s: LocationSuggestion) => {
    if (!userPos) return null;
    const d = haversine(userPos.lat, userPos.lng, parseFloat(s.lat), parseFloat(s.lon));
    return formatDistance(d);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2">{icon}</div>}
        <Input
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { setShowDropdown(true); externalOnFocus?.(); }}
          onBlur={() => externalOnBlur?.()}
          placeholder={placeholder}
          className={cn(
            "bg-muted/50 border-0 focus-visible:ring-primary h-12",
            icon && "pl-10",
            rightElement && "pr-12",
            className
          )}
        />
        {rightElement && <div className="absolute right-2 top-1/2 -translate-y-1/2">{rightElement}</div>}
        {isLoading && <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
      </div>

      {shouldShowDropdown && (
        <div ref={listRef} className="absolute top-full left-0 mt-1 bg-background border border-border rounded-xl shadow-xl z-[300] max-h-80 overflow-y-auto min-w-[calc(100vw-1.5rem)] sm:min-w-[400px] -translate-x-12">
          
          {/* Filter Chips */}
          <div className="px-2 pt-2 pb-1 flex gap-1.5 flex-wrap sticky top-0 bg-background z-10 border-b border-border/50">
            {(['all', 'nearby', 'recent', 'popular', 'global'] as const).map((filter) => {
              const icons: Record<typeof filter, React.ReactNode> = {
                all: null,
                nearby: <Navigation className="w-3 h-3" />,
                recent: <Clock className="w-3 h-3" />,
                popular: <Star className="w-3 h-3" />,
                global: <Globe className="w-3 h-3" />,
              };
              const labels: Record<typeof filter, string> = {
                all: 'All',
                nearby: 'Nearby',
                recent: 'Recent',
                popular: 'Popular',
                global: 'Global',
              };
              const isActive = activeFilter === filter;
              // Hide nearby if no GPS
              if (filter === 'nearby' && !userPos) return null;
              // Hide recent if none
              if (filter === 'recent' && recentSearches.length === 0) return null;
              return (
                <button
                  key={filter}
                  onClick={(e) => { e.stopPropagation(); setActiveFilter(filter); setActiveIndex(-1); }}
                  className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border",
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground"
                  )}
                >
                  {icons[filter]}
                  {labels[filter]}
                </button>
              );
            })}
          </div>

          {/* Loading state */}
          {isLoading && results.length === 0 && (
            <div className="px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Searching...
            </div>
          )}

          {/* Idle: Recent searches */}
          {!hasQuery && recentSearches.length > 0 && (activeFilter === 'all' || activeFilter === 'recent') && (
            <div className="py-1">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3 h-3" /> Recent
              </div>
              {recentSearches.map((recent, i) =>
                renderRow(
                  <>
                    <Clock className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground truncate">{recent}</span>
                  </>,
                  () => handleRecentSelect(recent),
                  `recent-${i}`
                )
              )}
            </div>
          )}

          {/* Idle: Popular */}
          {!hasQuery && (activeFilter === 'popular' || (activeFilter === 'all' && recentSearches.length === 0)) && (
            <div className="py-1">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Star className="w-3 h-3" /> Popular Destinations
              </div>
              {POPULAR_PLACES.slice(0, 5).map((place) =>
                renderRow(
                  <>
                    <Star className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-foreground line-clamp-1">{place.display_name.split(',').slice(0, 2).join(',')}</div>
                      <div className="text-xs text-muted-foreground">{place.display_name.split(',').slice(2).join(',').trim()}</div>
                    </div>
                    {userPos && (
                      <span className="text-[10px] text-muted-foreground shrink-0 mt-1">{getDistanceLabel(place)}</span>
                    )}
                  </>,
                  () => handleSelect(place),
                  `pop-${place.place_id}`
                )
              )}
            </div>
          )}

          {/* Query: Matched popular */}
          {hasQuery && matchedPopular.length > 0 && (activeFilter === 'all' || activeFilter === 'popular') && (
            <div className="py-1">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Star className="w-3 h-3" /> Popular
              </div>
              {matchedPopular.map((place) =>
                renderRow(
                  <>
                    <Star className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground line-clamp-1 flex-1">
                      <HighlightText text={place.display_name.split(',').slice(0, 2).join(',')} query={value} />
                    </span>
                  </>,
                  () => handleSelect(place),
                  `mpop-${place.place_id}`
                )
              )}
            </div>
          )}

          {/* "Did you mean?" suggestion */}
          {hasQuery && correctedQueryRef.current && results.length > 0 && (
            <button
              onClick={() => {
                onChange(correctedQueryRef.current!);
                correctedQueryRef.current = null;
              }}
              className="w-full px-4 py-2 text-left text-sm bg-accent/50 border-b border-border/50 hover:bg-accent transition-colors"
            >
              <span className="text-muted-foreground">Did you mean: </span>
              <span className="text-primary font-medium">{correctedQueryRef.current}</span>
              <span className="text-muted-foreground"> ?</span>
            </button>
          )}

          {/* Query: Search results */}
          {hasQuery && results.length > 0 && (activeFilter === 'all' || activeFilter === 'nearby' || activeFilter === 'global') && (
            <div className="py-1">
              {(activeFilter === 'all' && matchedPopular.length > 0) && (
                <div className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="w-3 h-3" /> Places
                </div>
              )}
              {results
                .filter((s) => {
                  if (activeFilter === 'all') return true;
                  const isNearby = userPos && haversine(userPos.lat, userPos.lng, parseFloat(s.lat), parseFloat(s.lon)) < 50;
                  if (activeFilter === 'nearby') return isNearby;
                  if (activeFilter === 'global') return !isNearby;
                  return true;
                })
                .map((s) => {
                const parts = s.display_name.split(',');
                const title = parts.slice(0, 2).join(',').trim();
                const subtitle = parts.slice(2, 5).join(',').trim();
                const dist = getDistanceLabel(s);
                const isNearby = userPos && haversine(userPos.lat, userPos.lng, parseFloat(s.lat), parseFloat(s.lon)) < 50;

                return renderRow(
                  <>
                    {isNearby ? (
                      <Navigation className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    ) : (
                      <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-foreground line-clamp-1">
                        <HighlightText text={title} query={value} />
                      </div>
                      {subtitle && (
                        <div className="text-xs text-muted-foreground line-clamp-1">{subtitle}</div>
                      )}
                    </div>
                    {dist && (
                      <span className={cn(
                        "text-[10px] shrink-0 mt-1",
                        isNearby ? "text-primary font-medium" : "text-muted-foreground"
                      )}>{dist}</span>
                    )}
                  </>,
                  () => handleSelect(s),
                  `res-${s.place_id}`
                );
              })}
            </div>
          )}

          {/* No results */}
          {!isLoading && hasQuery && results.length === 0 && matchedPopular.length === 0 && value.length >= 3 && (
            <div className="px-4 py-4 text-center">
              <Search className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
              <p className="text-sm text-muted-foreground">No locations found for "{value}"</p>
              <p className="text-xs text-muted-foreground mt-1">Try a city name, landmark, or address</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LocationAutocomplete;
