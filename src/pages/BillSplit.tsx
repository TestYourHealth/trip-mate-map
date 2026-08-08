import React, { useCallback, useEffect, useRef, useState } from 'react';
import BillSplitter from '@/components/BillSplitter';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { MapPin, Trash2, Flag, ArrowUpDown, Loader2, Car } from 'lucide-react';
import SEO from '@/components/SEO';
import LocationAutocomplete from '@/components/LocationAutocomplete';
import { getRoute } from '@/lib/routeService';
import { calculateTripCost, getDefaultVehicleConfig, TripCost } from '@/lib/tripCost';
import { toast } from 'sonner';

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
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [customCost, setCustomCost] = useState<TripCost | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const debounceRef = useRef<number | null>(null);

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

  const calculate = useCallback(async (o: string, d: string) => {
    if (!o.trim() || !d.trim()) return;
    setIsCalculating(true);
    try {
      const route = await getRoute(o, d);
      setCustomCost(calculateTripCost(route.distance, route.duration, getDefaultVehicleConfig()));
    } catch (err: any) {
      setCustomCost(null);
      toast.error(err?.message || 'Route calculate नहीं हो पाया', {
        action: { label: 'Retry', onClick: () => calculate(o, d) },
      });
    } finally {
      setIsCalculating(false);
    }
  }, []);

  // Debounced auto-calculate whenever both ends are set
  useEffect(() => {
    if (!from.trim() || !to.trim()) {
      setCustomCost(null);
      return;
    }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => calculate(from, to), 600);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [from, to, calculate]);

  const usingCustom = Boolean(customCost);
  const fuelCost = usingCustom ? customCost!.fuelCost : trip?.fuelCost || 0;
  const tollCost = usingCustom ? customCost!.tollCost : trip?.tollCost || 0;
  const totalCost = usingCustom ? customCost!.totalCost : trip?.totalCost || 0;

  return (
    <div className="container max-w-2xl mx-auto p-4 md:p-6">
      <SEO
        title="Bill Splitter — Share Trip Fuel & Toll Costs | TripMate"
        description="Split fuel, toll and trip expenses fairly with friends and co-travellers. Auto-fills from your active TripMate trip."
        path="/bill-split"
      />
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-foreground">Bill Splitter</h1>
        <p className="text-sm text-muted-foreground">Split trip costs and expenses with friends</p>
      </div>

      {/* From / To cost lookup */}
      <div className="mb-3 rounded-2xl border border-border bg-card p-3 space-y-2 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <MapPin className="w-3.5 h-3.5 text-primary" />
          </span>
          <LocationAutocomplete
            value={from}
            onChange={setFrom}
            placeholder="From (start location)"
            className="h-10 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
            <Flag className="w-3.5 h-3.5 text-success" />
          </span>
          <LocationAutocomplete
            value={to}
            onChange={setTo}
            placeholder="To (destination)"
            className="h-10 text-sm"
          />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Swap from and to"
            disabled={!from || !to}
            onClick={() => { const o = from; setFrom(to); setTo(o); }}
          >
            <ArrowUpDown className="w-4 h-4" />
          </Button>
        </div>

        {isCalculating && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Route और cost calculate हो रहा है…
          </p>
        )}

        {customCost && !isCalculating && (
          <div className="rounded-xl bg-muted/40 p-3 text-xs space-y-1" aria-live="polite">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <Car className="w-3.5 h-3.5 text-primary" />
              {from.split(',')[0]} → {to.split(',')[0]}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
              <span>{customCost.distance} km</span>
              <span>{customCost.duration} hrs</span>
              <span>Fuel ₹{customCost.fuelCost}</span>
              <span>Toll ₹{customCost.tollCost}</span>
              <span className="font-semibold text-primary">Total ₹{customCost.totalCost}</span>
            </div>
          </div>
        )}
      </div>

      {!usingCustom && (
        trip && trip.totalCost > 0 ? (
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
            <span className="text-muted-foreground">No active trip — search From/To above or plan one on the map</span>
            <Link to="/" className="text-primary font-medium hover:underline">Plan Trip</Link>
          </div>
        )
      )}

      <div className="bg-card border border-border rounded-2xl p-4 md:p-6 shadow-sm">
        <BillSplitter
          tripFuelCost={fuelCost}
          tripTollCost={tollCost}
          tripTotalCost={totalCost}
          origin={usingCustom ? from : trip?.origin || ''}
          destination={usingCustom ? to : trip?.destination || ''}
        />
      </div>
    </div>
  );
};

export default BillSplit;
