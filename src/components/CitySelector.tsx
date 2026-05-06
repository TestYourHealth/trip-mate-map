import React from 'react';
import { MapPin, ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { cityFuelPrices, CityData, CityFuelPrices, defaultFuelPrices } from '@/data/cityFuelPrices';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { FUEL_STORAGE_KEYS } from '@/constants/storageKeys';

interface CitySelectorProps {
  compact?: boolean;
}

const CitySelector: React.FC<CitySelectorProps> = ({ compact = false }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [currentCity, setCurrentCity] = useLocalStorage(FUEL_STORAGE_KEYS.currentCity, '');
  const [, setFuelPrices] = useLocalStorage<CityFuelPrices>(FUEL_STORAGE_KEYS.prices, defaultFuelPrices);
  const [, setLastUpdated] = useLocalStorage(FUEL_STORAGE_KEYS.lastUpdated, '');

  // Get unique cities from data
  const cities = React.useMemo(() => {
    const uniqueCities = new Map<string, CityData>();
    Object.values(cityFuelPrices).forEach(city => {
      const key = `${city.name}-${city.state}`;
      if (!uniqueCities.has(key)) {
        uniqueCities.set(key, city);
      }
    });
    return Array.from(uniqueCities.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  // Filter cities based on search
  const filteredCities = React.useMemo(() => {
    if (!search.trim()) return cities;
    const searchLower = search.toLowerCase();
    return cities.filter(
      city => 
        city.name.toLowerCase().includes(searchLower) || 
        city.state.toLowerCase().includes(searchLower)
    );
  }, [cities, search]);

  const handleSelectCity = (city: CityData) => {
    setCurrentCity(`${city.name}, ${city.state}`);
    setFuelPrices(city.prices);
    setLastUpdated(new Date().toISOString());
    setIsOpen(false);
    setSearch('');
    toast.success(`📍 ${city.name} की fuel prices set हो गई!`);
    
    // Dispatch storage event for other components
    window.dispatchEvent(new StorageEvent('storage', { key: 'fuelPrices' }));
  };

  const currentCityName = currentCity?.split(',')[0] || 'Select City';

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size={compact ? "sm" : "default"}
          className={cn(
            "gap-2 justify-between",
            compact ? "h-8 px-2 text-xs" : "h-10"
          )}
        >
          <span className="flex items-center gap-1.5">
            <MapPin className={cn("text-primary", compact ? "w-3 h-3" : "w-4 h-4")} />
            <span className="truncate max-w-[100px]">{currentCityName}</span>
          </span>
          <ChevronDown className={cn(compact ? "w-3 h-3" : "w-4 h-4", "opacity-50")} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2 z-[200]" align="start">
        <Input
          placeholder="Search city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-2 h-9"
        />
        <ScrollArea className="h-60">
          <div className="space-y-0.5">
            {filteredCities.map((city) => {
              const isSelected = currentCity === `${city.name}, ${city.state}`;
              return (
                <button
                  key={`${city.name}-${city.state}`}
                  onClick={() => handleSelectCity(city)}
                  className={cn(
                    "w-full flex items-center justify-between px-2 py-2 rounded-md text-left transition-colors",
                    isSelected 
                      ? "bg-primary/10 text-primary" 
                      : "hover:bg-muted"
                  )}
                >
                  <div>
                    <p className="text-sm font-medium">{city.name}</p>
                    <p className="text-xs text-muted-foreground">{city.state}</p>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-primary" />}
                </button>
              );
            })}
            {filteredCities.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No cities found
              </p>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default CitySelector;
