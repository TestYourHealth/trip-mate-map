import React from 'react';
import { MapPin, X, Navigation2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface SelectedPlaceInfo {
  name: string;
  address: string;
  lat: number;
  lng: number;
  distanceKm: number | null;
}

interface SelectedPlaceCardProps {
  place: SelectedPlaceInfo;
  onDismiss: () => void;
  onLocate?: () => void;
}

const formatDistance = (km: number) => {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 100) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
};

const SelectedPlaceCard: React.FC<SelectedPlaceCardProps> = ({ place, onDismiss, onLocate }) => {
  return (
    <div className="glass-card rounded-2xl p-3 flex items-start gap-3 shadow-lg animate-fade-in">
      <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
        <MapPin className="w-4.5 h-4.5 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground truncate">{place.name}</p>
          {place.distanceKm !== null && (
            <span className="text-[11px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full shrink-0">
              {formatDistance(place.distanceKm)}
            </span>
          )}
        </div>
        {place.address && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{place.address}</p>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {onLocate && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onLocate}
            aria-label="Show on map"
            className="text-primary"
          >
            <Navigation2 className="w-4 h-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onDismiss}
          aria-label="Dismiss selected place"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default SelectedPlaceCard;
