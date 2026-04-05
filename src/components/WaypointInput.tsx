import React, { useState } from 'react';
import { MapPin, Plus, X, Sparkles, Loader2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LocationAutocomplete from './LocationAutocomplete';
import { toast } from 'sonner';

interface WaypointInputProps {
  waypoints: string[];
  onWaypointsChange: (waypoints: string[]) => void;
  origin?: string;
  destination?: string;
}

// Haversine distance in km
const haversine = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const geocode = async (place: string): Promise<{ lat: number; lng: number } | null> => {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}&limit=1`, {
      headers: { 'User-Agent': 'TripMate/1.0' }
    });
    const data = await res.json();
    if (data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    return null;
  } catch { return null; }
};

const WaypointInput: React.FC<WaypointInputProps> = ({ waypoints, onWaypointsChange, origin, destination }) => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const addWaypoint = () => onWaypointsChange([...waypoints, '']);
  const updateWaypoint = (index: number, value: string) => {
    const updated = [...waypoints];
    updated[index] = value;
    onWaypointsChange(updated);
  };
  const removeWaypoint = (index: number) => onWaypointsChange(waypoints.filter((_, i) => i !== index));

  const optimizeRoute = async () => {
    const filledWaypoints = waypoints.filter(w => w.trim());
    if (filledWaypoints.length < 2 || !origin) {
      toast.error('कम से कम 2 stops और origin चाहिए');
      return;
    }

    setIsOptimizing(true);
    try {
      // Geocode all points
      const allPlaces = [origin, ...filledWaypoints, ...(destination ? [destination] : [])];
      const coords = await Promise.all(allPlaces.map(geocode));
      
      if (coords.some(c => !c)) {
        toast.error('कुछ locations geocode नहीं हो सकीं');
        setIsOptimizing(false);
        return;
      }

      const validCoords = coords as { lat: number; lng: number }[];
      
      // Nearest-neighbor TSP from origin, ending at destination
      const waypointIndices = filledWaypoints.map((_, i) => i + 1); // indices in validCoords (0=origin, last=destination)
      const visited = new Set<number>();
      const order: number[] = [];
      let current = 0; // start at origin

      while (visited.size < waypointIndices.length) {
        let nearest = -1;
        let nearestDist = Infinity;
        for (const idx of waypointIndices) {
          if (visited.has(idx)) continue;
          const d = haversine(validCoords[current].lat, validCoords[current].lng, validCoords[idx].lat, validCoords[idx].lng);
          if (d < nearestDist) { nearestDist = d; nearest = idx; }
        }
        if (nearest === -1) break;
        visited.add(nearest);
        order.push(nearest);
        current = nearest;
      }

      // Calculate old vs new distance
      const calcTotalDist = (indices: number[]) => {
        let total = 0;
        let prev = 0;
        for (const idx of indices) {
          total += haversine(validCoords[prev].lat, validCoords[prev].lng, validCoords[idx].lat, validCoords[idx].lng);
          prev = idx;
        }
        if (destination) {
          total += haversine(validCoords[prev].lat, validCoords[prev].lng, validCoords[validCoords.length - 1].lat, validCoords[validCoords.length - 1].lng);
        }
        return total;
      };

      const oldDist = calcTotalDist(waypointIndices);
      const newDist = calcTotalDist(order);
      const saved = Math.round(oldDist - newDist);

      // Reorder waypoints
      const optimized = order.map(i => filledWaypoints[i - 1]);
      onWaypointsChange(optimized);

      if (saved > 0) {
        toast.success(`🚀 Route optimized! ~${saved} km बचाया`);
      } else {
        toast.success('✅ Route पहले से optimal है');
      }
    } catch (err) {
      toast.error('Optimization failed');
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const updated = [...waypoints];
    const [removed] = updated.splice(dragIndex, 1);
    updated.splice(index, 0, removed);
    onWaypointsChange(updated);
    setDragIndex(index);
  };
  const handleDragEnd = () => setDragIndex(null);

  return (
    <div className="space-y-2">
      {waypoints.map((waypoint, index) => (
        <div
          key={index}
          className="relative flex items-center gap-2 animate-fade-in"
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragEnd={handleDragEnd}
        >
          <GripVertical className="w-4 h-4 text-muted-foreground/50 cursor-grab shrink-0" />
          <div className="flex-1">
            <LocationAutocomplete
              value={waypoint}
              onChange={(value) => updateWaypoint(index, value)}
              placeholder={`Stop ${index + 1}`}
              icon={<MapPin className="w-4 h-4 text-amber-500" />}
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
            onClick={() => removeWaypoint(index)}
            aria-label={`Remove stop ${index + 1}`}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ))}
      
      <div className="flex gap-2">
        {waypoints.length < 5 && (
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 text-muted-foreground hover:text-primary"
            onClick={addWaypoint}
          >
            <Plus className="w-4 h-4 mr-2" />
            Stop जोड़ें
          </Button>
        )}
        
        {waypoints.filter(w => w.trim()).length >= 2 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
            onClick={optimizeRoute}
            disabled={isOptimizing}
          >
            {isOptimizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Optimize
          </Button>
        )}
      </div>
    </div>
  );
};

export default WaypointInput;
