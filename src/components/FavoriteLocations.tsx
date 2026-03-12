import React, { useState } from 'react';
import { Star, Home, Briefcase, MapPin, Plus, X, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { cn } from '@/lib/utils';

export interface FavoriteLocation {
  id: string;
  name: string;
  address: string;
  icon: 'home' | 'work' | 'star' | 'heart';
}

const ICON_MAP = {
  home: Home,
  work: Briefcase,
  star: Star,
  heart: Heart,
};

const ICON_OPTIONS: Array<{ value: FavoriteLocation['icon']; label: string }> = [
  { value: 'home', label: 'Home' },
  { value: 'work', label: 'Work' },
  { value: 'star', label: 'Favorite' },
  { value: 'heart', label: 'Loved' },
];

interface FavoriteLocationsProps {
  onSelect: (address: string) => void;
  compact?: boolean;
}

const FavoriteLocations: React.FC<FavoriteLocationsProps> = ({ onSelect, compact = false }) => {
  const [favorites, setFavorites] = useLocalStorage<FavoriteLocation[]>('favoriteLocations', []);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newIcon, setNewIcon] = useState<FavoriteLocation['icon']>('star');

  const addFavorite = () => {
    if (!newName.trim() || !newAddress.trim()) return;
    const fav: FavoriteLocation = {
      id: Date.now().toString(),
      name: newName.trim(),
      address: newAddress.trim(),
      icon: newIcon,
    };
    setFavorites(prev => [...prev, fav]);
    setNewName('');
    setNewAddress('');
    setNewIcon('star');
    setIsAdding(false);
  };

  const removeFavorite = (id: string) => {
    setFavorites(prev => prev.filter(f => f.id !== id));
  };

  if (compact && favorites.length === 0) return null;

  return (
    <div className={cn("space-y-2", compact && "space-y-1")}>
      {!compact && (
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Star className="w-3 h-3" /> Saved Places
          </h3>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setIsAdding(!isAdding)}
            className="h-6 w-6"
          >
            {isAdding ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          </Button>
        </div>
      )}

      {isAdding && (
        <div className="bg-muted/30 rounded-xl p-3 space-y-2 animate-fade-in">
          <Input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Label (e.g. Home)"
            className="h-9 text-sm"
          />
          <Input
            value={newAddress}
            onChange={e => setNewAddress(e.target.value)}
            placeholder="Address or location"
            className="h-9 text-sm"
          />
          <div className="flex gap-1.5">
            {ICON_OPTIONS.map(opt => {
              const Icon = ICON_MAP[opt.value];
              return (
                <button
                  key={opt.value}
                  onClick={() => setNewIcon(opt.value)}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border",
                    newIcon === opt.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
                  )}
                >
                  <Icon className="w-3 h-3" />
                  {opt.label}
                </button>
              );
            })}
          </div>
          <Button onClick={addFavorite} size="sm" className="w-full h-8 text-xs">
            Save Place
          </Button>
        </div>
      )}

      <div className={cn("flex gap-2 flex-wrap", compact && "flex-nowrap overflow-x-auto scrollbar-hide")}>
        {favorites.map(fav => {
          const Icon = ICON_MAP[fav.icon];
          return (
            <button
              key={fav.id}
              onClick={() => onSelect(fav.address)}
              className={cn(
                "group relative flex items-center gap-2 px-3 py-2 rounded-xl border border-border/60 bg-background hover:bg-muted/50 transition-all touch-feedback",
                compact && "flex-shrink-0"
              )}
            >
              <Icon className="w-4 h-4 text-primary flex-shrink-0" />
              <div className="text-left min-w-0">
                <p className="text-sm font-medium text-foreground truncate max-w-[120px]">{fav.name}</p>
                {!compact && (
                  <p className="text-xs text-muted-foreground truncate max-w-[150px]">{fav.address}</p>
                )}
              </div>
              {!compact && (
                <button
                  onClick={e => { e.stopPropagation(); removeFavorite(fav.id); }}
                  className="opacity-0 group-hover:opacity-100 absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </button>
          );
        })}
        {compact && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all text-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        )}
      </div>
    </div>
  );
};

export default FavoriteLocations;
