import React, { useState } from 'react';
import { Fuel, Coffee, BedDouble, ShoppingBag, ChevronRight, Navigation, X, MapPin, Loader2, Zap, Hospital } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  query: string;
  color: string;
  markerColor: string;
}

const ACTIONS: QuickAction[] = [
  { id: 'fuel', label: 'Petrol Pump', icon: Fuel, query: 'petrol pump', color: 'text-amber-500', markerColor: '#f59e0b' },
  { id: 'ev', label: 'EV Charging', icon: Zap, query: 'ev charging station', color: 'text-emerald-500', markerColor: '#10b981' },
  { id: 'food', label: 'Restaurant', icon: Coffee, query: 'restaurant', color: 'text-orange-500', markerColor: '#f97316' },
  { id: 'rest', label: 'Rest Stop', icon: BedDouble, query: 'hotel', color: 'text-blue-500', markerColor: '#3b82f6' },
  { id: 'hospital', label: 'Hospital', icon: Hospital, query: 'hospital', color: 'text-red-500', markerColor: '#ef4444' },
  { id: 'shop', label: 'Shopping', icon: ShoppingBag, query: 'shopping mall', color: 'text-pink-500', markerColor: '#ec4899' },
];

export interface NearbyResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
  distance?: number;
}

interface QuickActionsProps {
  userPosition?: { lat: number; lng: number } | null;
  onShowNearbyMarkers?: (places: { lat: number; lng: number; name: string; address: string }[], color: string) => void;
  onClearNearbyMarkers?: () => void;
  onNavigateToPlace?: (name: string, lat: number, lng: number) => void;
}

const haversine = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const QuickActions: React.FC<QuickActionsProps> = ({ userPosition, onShowNearbyMarkers, onClearNearbyMarkers, onNavigateToPlace }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searching, setSearching] = useState<string | null>(null);
  const [results, setResults] = useState<NearbyResult[]>([]);
  const [activeAction, setActiveAction] = useState<QuickAction | null>(null);

  const handleAction = async (action: QuickAction) => {
    if (!userPosition) {
      toast.error('Location not available. Please enable GPS.');
      return;
    }

    // If same action clicked again, close results
    if (activeAction?.id === action.id) {
      closeResults();
      return;
    }

    setSearching(action.id);
    setActiveAction(action);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(action.query)}&limit=5&viewbox=${userPosition.lng - 0.15},${userPosition.lat - 0.15},${userPosition.lng + 0.15},${userPosition.lat + 0.15}&bounded=1`,
        { headers: { 'User-Agent': 'TripMate/1.0' } }
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const places: NearbyResult[] = data.map((item: any) => {
          const nameParts = item.display_name?.split(',') || [];
          return {
            name: item.name || nameParts[0] || action.label,
            address: nameParts.slice(1, 4).join(',').trim(),
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            distance: haversine(userPosition.lat, userPosition.lng, parseFloat(item.lat), parseFloat(item.lon)),
          };
        }).sort((a: NearbyResult, b: NearbyResult) => (a.distance || 0) - (b.distance || 0));

        setResults(places);
        onShowNearbyMarkers?.(
          places.map(p => ({ lat: p.lat, lng: p.lng, name: p.name, address: p.address })),
          action.markerColor
        );
      } else {
        setResults([]);
        toast.info(`No ${action.label} found nearby.`);
      }
    } catch {
      toast.error('Search failed. Please try again.');
    } finally {
      setSearching(null);
    }
  };

  const closeResults = () => {
    setResults([]);
    setActiveAction(null);
    onClearNearbyMarkers?.();
  };

  const handleNavigate = (place: NearbyResult) => {
    onNavigateToPlace?.(place.name, place.lat, place.lng);
    closeResults();
    setIsExpanded(false);
  };

  return (
    <>
      {/* Nearby Results Panel */}
      {activeAction && results.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-[200] md:absolute md:bottom-14 md:right-0 md:left-auto md:w-80 animate-slide-up">
          <div className="bg-background rounded-t-2xl md:rounded-2xl shadow-xl border border-border/60 max-h-[50vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                {activeAction && (() => {
                  const Icon = activeAction.icon;
                  return <Icon className={cn("w-5 h-5", activeAction.color)} />;
                })()}
                <span className="font-semibold text-sm text-foreground">
                  Nearby {activeAction.label} ({results.length})
                </span>
              </div>
              <button onClick={closeResults} className="p-1 rounded-full hover:bg-muted transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Results List */}
            <div className="overflow-y-auto flex-1 divide-y divide-border/30">
              {results.map((place, index) => (
                <div key={index} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
                  {/* Number badge */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: activeAction.markerColor }}
                  >
                    {index + 1}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{place.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{place.address}</p>
                    {place.distance != null && (
                      <p className="text-xs text-primary font-medium mt-0.5">
                        <MapPin className="w-3 h-3 inline mr-0.5" />
                        {place.distance < 1 ? `${Math.round(place.distance * 1000)}m` : `${place.distance.toFixed(1)} km`}
                      </p>
                    )}
                  </div>

                  {/* Navigate button */}
                  <button
                    onClick={() => handleNavigate(place)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-xs font-medium hover:opacity-90 transition-opacity flex-shrink-0"
                  >
                    <Navigation className="w-3 h-3" />
                    Navigate
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FAB buttons */}
      <div className="flex flex-col items-end gap-2">
        <button
          onClick={() => {
            if (isExpanded) closeResults();
            setIsExpanded(!isExpanded);
          }}
          className={cn(
            "w-11 h-11 rounded-full bg-background shadow-md border border-border/60 flex items-center justify-center transition-all touch-feedback",
            isExpanded && "bg-primary text-primary-foreground border-primary"
          )}
          aria-label="Quick actions"
        >
          <ChevronRight className={cn(
            "w-5 h-5 transition-transform duration-200",
            isExpanded ? "rotate-90" : "rotate-0"
          )} />
        </button>

        {isExpanded && (
          <div className="flex flex-col gap-2 animate-fade-in">
            {ACTIONS.map(action => {
              const Icon = action.icon;
              const isSearching = searching === action.id;
              const isActive = activeAction?.id === action.id;
              return (
                <button
                  key={action.id}
                  onClick={() => handleAction(action)}
                  disabled={isSearching}
                  className={cn(
                    "w-11 h-11 rounded-full bg-background shadow-md border border-border/60 flex items-center justify-center transition-all touch-feedback",
                    isSearching && "animate-pulse opacity-70",
                    isActive && "ring-2 ring-primary ring-offset-1"
                  )}
                  title={action.label}
                >
                  {isSearching ? (
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  ) : (
                    <Icon className={cn("w-5 h-5", action.color)} />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default QuickActions;
