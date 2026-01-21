import { useState, useEffect, useCallback, useRef } from 'react';

// Custom event for same-tab storage sync
const STORAGE_EVENT_NAME = 'local-storage-change';

interface StorageChangeEvent extends CustomEvent {
  detail: {
    key: string;
    newValue: string | null;
  };
}

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // Get stored value from localStorage with error handling
  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      if (item === null) {
        return initialValue;
      }
      return JSON.parse(item) as T;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      // Clear corrupted data
      try {
        window.localStorage.removeItem(key);
      } catch (e) {
        // Ignore
      }
      return initialValue;
    }
  }, [initialValue, key]);

  const [storedValue, setStoredValue] = useState<T>(readValue);
  
  // Keep track of initial value for comparison
  const initialValueRef = useRef(initialValue);
  initialValueRef.current = initialValue;

  // Return a wrapped version of useState's setter function that persists to localStorage
  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Save state
      setStoredValue(valueToStore);
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        const serializedValue = JSON.stringify(valueToStore);
        window.localStorage.setItem(key, serializedValue);
        
        // Dispatch custom event for same-tab sync
        window.dispatchEvent(new CustomEvent(STORAGE_EVENT_NAME, {
          detail: { key, newValue: serializedValue }
        }));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  // Listen for storage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.newValue !== null) {
        try {
          setStoredValue(JSON.parse(event.newValue));
        } catch (error) {
          console.warn(`Error parsing storage event for key "${key}":`, error);
        }
      } else if (event.key === key && event.newValue === null) {
        // Item was removed
        setStoredValue(initialValueRef.current);
      }
    };

    // Listen for same-tab storage changes
    const handleSameTabChange = (event: Event) => {
      const customEvent = event as StorageChangeEvent;
      if (customEvent.detail.key === key && customEvent.detail.newValue !== null) {
        try {
          const newVal = JSON.parse(customEvent.detail.newValue);
          setStoredValue(newVal);
        } catch (error) {
          console.warn(`Error parsing same-tab storage event for key "${key}":`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener(STORAGE_EVENT_NAME, handleSameTabChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(STORAGE_EVENT_NAME, handleSameTabChange);
    };
  }, [key]);

  // Sync on visibility change (when user returns to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const freshValue = readValue();
        setStoredValue(freshValue);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [readValue]);

  return [storedValue, setValue];
}
