/**
 * Shared localStorage keys for fuel-related data.
 * Always import from here — never hardcode these strings elsewhere
 * to prevent key-mismatch bugs.
 */
export const FUEL_STORAGE_KEYS = {
  prices: 'fuelPrices',
  lastUpdated: 'fuelPricesLastUpdated',
  currentCity: 'currentCity',
  hasAutoDetected: 'hasAutoDetectedLocation',
} as const;

/** Legacy keys that should be migrated/removed. */
export const LEGACY_FUEL_STORAGE_KEYS = {
  lastUpdated: 'fuelPricesUpdated',
} as const;
