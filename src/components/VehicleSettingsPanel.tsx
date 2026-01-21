import React, { useEffect, useState } from 'react';
import { Settings, Fuel, Gauge } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { VehicleConfig } from '@/types/vehicle';

interface FuelPrices {
  petrol: number;
  diesel: number;
  cng: number;
  electric: number;
}

interface VehicleSettingsPanelProps {
  config: VehicleConfig;
  onConfigChange: (config: VehicleConfig) => void;
}

const defaultPrices: FuelPrices = {
  petrol: 105,
  diesel: 92,
  cng: 85,
  electric: 8,
};

// Get fuel prices from localStorage or use defaults
const getFuelPrices = (): FuelPrices => {
  try {
    const saved = localStorage.getItem('fuelPrices');
    if (saved) {
      return { ...defaultPrices, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('Error reading fuel prices:', e);
  }
  return defaultPrices;
};

const VehicleSettingsPanel: React.FC<VehicleSettingsPanelProps> = ({ config, onConfigChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [fuelPrices, setFuelPrices] = useState<FuelPrices>(getFuelPrices);

  // Sync fuel prices from localStorage when storage changes
  useEffect(() => {
    const handleStorageChange = () => {
      setFuelPrices(getFuelPrices());
    };

    // Listen for storage changes
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('local-storage-change', handleStorageChange);
    window.addEventListener('focus', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage-change', handleStorageChange);
      window.removeEventListener('focus', handleStorageChange);
    };
  }, []);

  const handleFuelTypeChange = (value: 'petrol' | 'diesel' | 'cng' | 'electric') => {
    onConfigChange({
      ...config,
      fuelType: value,
      fuelPrice: fuelPrices[value],
    });
  };

  const getFuelUnit = (type: string) => {
    return type === 'electric' ? 'kWh' : 'L';
  };

  const getMileageUnit = (type: string) => {
    return type === 'electric' ? 'km/kWh' : 'km/L';
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between px-3 py-2 h-auto hover:bg-muted/50">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Vehicle Settings</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {config.fuelType.charAt(0).toUpperCase() + config.fuelType.slice(1)} • {config.mileage} {getMileageUnit(config.fuelType)}
          </span>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 pt-3">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-2">
            <Fuel className="w-3.5 h-3.5" /> Fuel Type
          </Label>
          <Select value={config.fuelType} onValueChange={handleFuelTypeChange}>
            <SelectTrigger className="bg-muted/50 border-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[200] bg-background border shadow-lg">
              <SelectItem value="petrol">Petrol (₹{fuelPrices.petrol}/L)</SelectItem>
              <SelectItem value="diesel">Diesel (₹{fuelPrices.diesel}/L)</SelectItem>
              <SelectItem value="cng">CNG (₹{fuelPrices.cng}/kg)</SelectItem>
              <SelectItem value="electric">Electric (₹{fuelPrices.electric}/kWh)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Price (₹/{getFuelUnit(config.fuelType)})
            </Label>
            <Input
              type="number"
              value={config.fuelPrice}
              onChange={(e) => onConfigChange({ ...config, fuelPrice: Number(e.target.value) || 0 })}
              className="bg-muted/50 border-0"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Gauge className="w-3 h-3" /> Mileage ({getMileageUnit(config.fuelType)})
            </Label>
            <Input
              type="number"
              value={config.mileage}
              onChange={(e) => onConfigChange({ ...config, mileage: Number(e.target.value) || 1 })}
              className="bg-muted/50 border-0"
            />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default VehicleSettingsPanel;
