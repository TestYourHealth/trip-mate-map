import { useEffect, useState } from 'react';
import { Car } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { VehicleConfig } from '@/types/vehicle';

interface Vehicle {
  id: string;
  name: string;
  fuelType: 'petrol' | 'diesel' | 'cng' | 'electric';
  mileage: number;
  isDefault: boolean;
}

interface FuelPrices {
  petrol: number;
  diesel: number;
  cng: number;
  electric: number;
}

interface VehicleSelectorProps {
  config: VehicleConfig;
  onConfigChange: (config: VehicleConfig) => void;
}

const defaultVehicles: Vehicle[] = [
  { id: '1', name: 'My Car', fuelType: 'petrol', mileage: 15, isDefault: true },
];

const defaultPrices: FuelPrices = {
  petrol: 105,
  diesel: 92,
  cng: 85,
  electric: 8,
};

const getVehicles = (): Vehicle[] => {
  try {
    const saved = localStorage.getItem('vehicles');
    if (saved) {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : defaultVehicles;
    }
  } catch (e) {
    console.warn('Error reading vehicles:', e);
  }
  return defaultVehicles;
};

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

const getFuelIcon = (type: string) => {
  switch (type) {
    case 'electric': return '⚡';
    case 'cng': return '🔵';
    case 'diesel': return '🟡';
    default: return '⛽';
  }
};

const getMileageUnit = (type: string) => {
  return type === 'electric' ? 'km/kWh' : 'km/L';
};

const VehicleSelector: React.FC<VehicleSelectorProps> = ({ config, onConfigChange }) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>(getVehicles);
  const [fuelPrices, setFuelPrices] = useState<FuelPrices>(getFuelPrices);

  // Sync vehicles and fuel prices from localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      setVehicles(getVehicles());
      setFuelPrices(getFuelPrices());
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('local-storage-change', handleStorageChange);
    window.addEventListener('focus', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage-change', handleStorageChange);
      window.removeEventListener('focus', handleStorageChange);
    };
  }, []);

  const handleVehicleChange = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (vehicle) {
      onConfigChange({
        fuelType: vehicle.fuelType,
        fuelPrice: fuelPrices[vehicle.fuelType],
        mileage: vehicle.mileage,
      });
    }
  };

  // Find current vehicle based on config
  const currentVehicle = vehicles.find(
    v => v.fuelType === config.fuelType && v.mileage === config.mileage
  ) || vehicles.find(v => v.isDefault) || vehicles[0];

  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
        <Car className="w-4 h-4 text-primary" />
      </div>
      <Select value={currentVehicle?.id || ''} onValueChange={handleVehicleChange}>
        <SelectTrigger className="flex-1 bg-muted/50 border-0 h-10" aria-label="Select vehicle">
          <SelectValue placeholder="Vehicle चुनें">
            {currentVehicle && (
              <span className="flex items-center gap-2">
                <span>{getFuelIcon(currentVehicle.fuelType)}</span>
                <span>{currentVehicle.name}</span>
                <span className="text-muted-foreground text-xs">
                  • {currentVehicle.mileage} {getMileageUnit(currentVehicle.fuelType)}
                </span>
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="z-[200] bg-background border shadow-lg">
          {vehicles.map((vehicle) => (
            <SelectItem key={vehicle.id} value={vehicle.id}>
              <div className="flex items-center gap-2">
                <span>{getFuelIcon(vehicle.fuelType)}</span>
                <span>{vehicle.name}</span>
                <span className="text-muted-foreground text-xs">
                  • {vehicle.mileage} {getMileageUnit(vehicle.fuelType)}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default VehicleSelector;
