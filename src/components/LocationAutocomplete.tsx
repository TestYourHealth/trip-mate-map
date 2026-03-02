import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Loader2, Search, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface LocationSuggestion {
  display_name: string;
  lat: string;
  lon: string;
  place_id: number;
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
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
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
  }, []);

  // Save to recent searches
  const saveToRecent = useCallback((location: string) => {
    setRecentSearches(prev => {
      const updated = [location, ...prev.filter(s => s !== location)].slice(0, 5);
      localStorage.setItem('recentLocationSearches', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Fetch suggestions from Nominatim with caching and abort
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    const cacheKey = query.toLowerCase().trim();
    
    // Check cache first - instant results!
    if (cacheKey in suggestionsCache) {
      setSuggestions(suggestionsCache[cacheKey]);
      setIsLoading(false);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=5&addressdetails=0`,
        { 
          headers: { 
            'User-Agent': 'TripMate/1.0',
            'Accept': 'application/json'
          },
          signal: abortControllerRef.current.signal
        }
      );
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      
      const data = await response.json();
      // Cache the results
      suggestionsCache[cacheKey] = data;
      setSuggestions(data);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error fetching suggestions:', error);
        setSuggestions([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Clear debounce on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Debounced search - faster 150ms delay
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Faster debounce for better UX
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, 150);
  }, [onChange, fetchSuggestions]);

  // Handle suggestion selection
  const handleSelect = useCallback((suggestion: LocationSuggestion) => {
    const displayName = suggestion.display_name.split(',').slice(0, 3).join(',');
    onChange(displayName);
    onSelect?.(displayName);
    saveToRecent(displayName);
    setSuggestions([]);
    setShowSuggestions(false);
  }, [onChange, onSelect, saveToRecent]);

  // Handle recent search selection
  const handleRecentSelect = useCallback((recent: string) => {
    onChange(recent);
    onSelect?.(recent);
    setShowSuggestions(false);
  }, [onChange, onSelect]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showDropdown = showSuggestions && (suggestions.length > 0 || recentSearches.length > 0 || isLoading);

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
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-xl shadow-lg z-[300] max-h-64 overflow-y-auto animate-fade-in">
          {/* Loading state */}
          {isLoading && (
            <div className="px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Searching...
            </div>
          )}

          {/* Suggestions */}
          {!isLoading && suggestions.length > 0 && (
            <div className="py-1">
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Search className="w-3 h-3" />
                Suggestions
              </div>
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.place_id}
                  onClick={() => handleSelect(suggestion)}
                  className="w-full px-4 py-2.5 text-left hover:bg-muted/50 transition-colors flex items-start gap-3"
                >
                  <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-sm text-foreground line-clamp-2">
                    {suggestion.display_name}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Recent Searches */}
          {!isLoading && suggestions.length === 0 && recentSearches.length > 0 && (
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

          {/* No results */}
          {!isLoading && suggestions.length === 0 && value.length >= 3 && (
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
