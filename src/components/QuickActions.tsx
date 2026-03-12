import React, { useState } from 'react';
import { Fuel, Coffee, BedDouble, ShoppingBag, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  query: string;
  color: string;
}

const ACTIONS: QuickAction[] = [
  { id: 'fuel', label: 'Petrol Pump', icon: Fuel, query: 'petrol pump', color: 'text-amber-500' },
  { id: 'food', label: 'Restaurant', icon: Coffee, query: 'restaurant', color: 'text-orange-500' },
  { id: 'rest', label: 'Rest Stop', icon: BedDouble, query: 'hotel', color: 'text-blue-500' },
  { id: 'shop', label: 'Shopping', icon: ShoppingBag, query: 'shopping mall', color: 'text-pink-500' },
];

interface QuickActionsProps {
  userPosition?: { lat: number; lng: number } | null;
  onSearchNearby?: (query: string) => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({ userPosition, onSearchNearby }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searching, setSearching] = useState<string | null>(null);

  const handleAction = async (action: QuickAction) => {
    if (!userPosition) {
      toast.error('Location not available. Please enable GPS.');
      return;
    }

    setSearching(action.id);
    try {
      // Search nearby using Nominatim
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(action.query)}&limit=3&viewbox=${userPosition.lng - 0.1},${userPosition.lat - 0.1},${userPosition.lng + 0.1},${userPosition.lat + 0.1}&bounded=1`,
        { headers: { 'User-Agent': 'TripMate/1.0' } }
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const nearest = data[0];
        const name = nearest.display_name?.split(',').slice(0, 2).join(',') || action.label;
        toast.success(`📍 Nearest ${action.label}: ${name}`);
        onSearchNearby?.(action.query);
      } else {
        toast.info(`No ${action.label} found nearby. Try zooming out.`);
      }
    } catch {
      toast.error('Search failed. Please try again.');
    } finally {
      setSearching(null);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      {/* Toggle button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
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

      {/* Action buttons */}
      {isExpanded && (
        <div className="flex flex-col gap-2 animate-fade-in">
          {ACTIONS.map(action => {
            const Icon = action.icon;
            const isSearching = searching === action.id;
            return (
              <button
                key={action.id}
                onClick={() => handleAction(action)}
                disabled={isSearching}
                className={cn(
                  "w-11 h-11 rounded-full bg-background shadow-md border border-border/60 flex items-center justify-center transition-all touch-feedback",
                  isSearching && "animate-pulse opacity-70"
                )}
                title={action.label}
              >
                <Icon className={cn("w-5 h-5", action.color)} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default QuickActions;
