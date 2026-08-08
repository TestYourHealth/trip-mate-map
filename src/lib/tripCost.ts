import { VehicleConfig } from '@/types/vehicle';

export interface TripCost {
  distance: number;
  duration: number;
  fuelCost: number;
  tollCost: number;
  totalCost: number;
}

export const TOLL_RATE_PER_KM = 1.5;

/**
 * Shared fuel + toll math used by the map screen and the bill splitter.
 * fuel = distance / mileage * price  (mileage is km/L, km/kg or km/kWh)
 * toll = distance * 1.5
 */
export function calculateTripCost(
  distance: number,
  duration: number,
  vehicle: VehicleConfig,
): TripCost {
  const mileage = vehicle.mileage > 0 ? vehicle.mileage : 1;
  const fuelCost = (distance / mileage) * vehicle.fuelPrice;
  const tollCost = distance * TOLL_RATE_PER_KM;
  return {
    distance,
    duration,
    fuelCost: Math.round(fuelCost),
    tollCost: Math.round(tollCost),
    totalCost: Math.round(fuelCost + tollCost),
  };
}

/** Read the user's default vehicle + current fuel price from localStorage. */
export function getDefaultVehicleConfig(): VehicleConfig {
  try {
    const vehiclesData = localStorage.getItem('vehicles');
    const fuelPricesData = localStorage.getItem('fuelPrices');
    const vehicles = vehiclesData ? JSON.parse(vehiclesData) : [];
    const fuelPrices = fuelPricesData
      ? JSON.parse(fuelPricesData)
      : { petrol: 105, diesel: 92, cng: 85, electric: 8 };
    const defaultVehicle = vehicles.find((v: any) => v.isDefault) || vehicles[0];
    if (defaultVehicle) {
      return {
        fuelType: defaultVehicle.fuelType,
        fuelPrice: fuelPrices[defaultVehicle.fuelType] || (defaultVehicle.fuelType === 'electric' ? 8 : 105),
        mileage: defaultVehicle.mileage,
      };
    }
  } catch (e) {
    console.warn('Error reading vehicle config:', e);
  }
  return { fuelType: 'petrol', fuelPrice: 105, mileage: 15 };
}
