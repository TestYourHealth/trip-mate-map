import { useState, useEffect, useCallback, useRef } from 'react';

// Custom event for same-tab storage sync
const STORAGE_EVENT_NAME = 'local-storage-change';

interface StorageChangeEvent extends CustomEvent {
  detail: {
    key: string;
    newValue: string | null;
  };
}

// Helper function to read from localStorage
function getStorageValue<T>(key: string, initialValue: T): T {
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
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore
    }
    return initialValue;
  }
}

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // Initialize state with lazy initializer
  const [storedValue, setStoredValue] = useState<T>(() => getStorageValue(key, initialValue));
  
  // Keep track of key and initial value
  const keyRef = useRef(key);
  const initialValueRef = useRef(initialValue);
  
  // Update refs when they change
  useEffect(() => {
    keyRef.current = key;
    initialValueRef.current = initialValue;
  }, [key, initialValue]);

  // Return a wrapped version of useState's setter function that persists to localStorage
  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      setStoredValue(prev => {
        const valueToStore = value instanceof Function ? value(prev) : value;
        
        // Save to localStorage
        if (typeof window !== 'undefined') {
          const serializedValue = JSON.stringify(valueToStore);
          window.localStorage.setItem(keyRef.current, serializedValue);
          
          // Dispatch custom event for same-tab sync
          window.dispatchEvent(new CustomEvent(STORAGE_EVENT_NAME, {
            detail: { key: keyRef.current, newValue: serializedValue }
          }));
        }
        
        return valueToStore;
      });
    } catch (error) {
      console.warn(`Error setting localStorage key "${keyRef.current}":`, error);
    }
  }, []);

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
        setStoredValue(initialValueRef.current);
      }
    };

    // Listen for same-tab storage changes (but not from self)
    const handleSameTabChange = (event: Event) => {
      const customEvent = event as StorageChangeEvent;
      if (customEvent.detail.key === key && customEvent.detail.newValue !== null) {
        try {
          setStoredValue(JSON.parse(customEvent.detail.newValue));
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

  // Sync on visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const freshValue = getStorageValue(keyRef.current, initialValueRef.current);
        setStoredValue(freshValue);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return [storedValue, setValue];
}
