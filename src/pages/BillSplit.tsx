import React, { useEffect, useState } from 'react';
import BillSplitter from '@/components/BillSplitter';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { MapPin, Trash2 } from 'lucide-react';

interface CurrentTrip {
  fuelCost: number;
  tollCost: number;
  totalCost: number;
  distance: number;
  duration: number;
  origin?: string;
  destination?: string;
  updatedAt?: number;
}

const readTrip = (): CurrentTrip | null => {
  try {
    const raw = localStorage.getItem('currentTrip');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const BillSplit = () => {
  const [trip, setTrip] = useState<CurrentTrip | null>(readTrip);

  useEffect(() => {
    const sync = () => setTrip(readTrip());
    window.addEventListener('storage', sync);
    window.addEventListener('local-storage-change', sync);
    window.addEventListener('focus', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('local-storage-change', sync);
      window.removeEventListener('focus', sync);
    };
  }, []);

  const clearTrip = () => {
    localStorage.removeItem('currentTrip');
    window.dispatchEvent(new Event('local-storage-change'));
    setTrip(null);
  };

  return (
    <div className="container max-w-2xl mx-auto p-4 md:p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-foreground">Bill Splitter</h1>
        <p className="text-sm text-muted-foreground">Split trip costs and expenses with friends</p>
      </div>

      {trip && trip.totalCost > 0 ? (
        <div className="mb-3 flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl px-3 py-2 text-xs">
          <span className="flex items-center gap-1.5 text-foreground truncate">
            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="truncate">
              {trip.origin?.split(',')[0] || 'Trip'} → {trip.destination?.split(',')[0] || 'Destination'}
            </span>
            <span className="text-muted-foreground">• {trip.distance?.toFixed(0)} km</span>
          </span>
          <button onClick={clearTrip} className="text-muted-foreground hover:text-destructive ml-2 shrink-0" aria-label="Clear trip">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="mb-3 flex items-center justify-between bg-muted/40 border border-border rounded-xl px-3 py-2 text-xs">
          <span className="text-muted-foreground">No active trip — plan one to auto-fill fuel & toll</span>
          <Link to="/" className="text-primary font-medium hover:underline">Plan Trip</Link>
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl p-4 md:p-6 shadow-sm">
        <BillSplitter
          tripFuelCost={trip?.fuelCost || 0}
          tripTollCost={trip?.tollCost || 0}
          tripTotalCost={trip?.totalCost || 0}
          origin={trip?.origin || ''}
          destination={trip?.destination || ''}
        />
      </div>
    </div>
  );
};

export default BillSplit;
