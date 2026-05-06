import { FUEL_STORAGE_KEYS, LEGACY_FUEL_STORAGE_KEYS } from '@/constants/storageKeys';

const MIGRATION_FLAG = 'storageMigration:fuelLastUpdated:v1';

/**
 * One-time migration: copy `fuelPricesUpdated` → `fuelPricesLastUpdated`
 * for users created before the keys were unified.
 */
export function runStorageMigrations(): void {
  if (typeof window === 'undefined') return;

  try {
    if (localStorage.getItem(MIGRATION_FLAG) === 'done') return;

    const legacy = localStorage.getItem(LEGACY_FUEL_STORAGE_KEYS.lastUpdated);
    const current = localStorage.getItem(FUEL_STORAGE_KEYS.lastUpdated);

    if (legacy && !current) {
      localStorage.setItem(FUEL_STORAGE_KEYS.lastUpdated, legacy);
    }
    if (legacy) {
      localStorage.removeItem(LEGACY_FUEL_STORAGE_KEYS.lastUpdated);
    }

    localStorage.setItem(MIGRATION_FLAG, 'done');
  } catch (err) {
    console.warn('Storage migration failed:', err);
  }
}
