import React, { useState, useRef, useEffect } from 'react';
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
  const [overIndex, setOverIndex] = useState<number | null>(null);

  // Stable ids per waypoint slot — survives reorders so inputs don't remount and lose focus.
  const idsRef = useRef<string[]>([]);
  useEffect(() => {
    if (idsRef.current.length < waypoints.length) {
      while (idsRef.current.length < waypoints.length) {
        idsRef.current.push(`wp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
      }
    } else if (idsRef.current.length > waypoints.length) {
      idsRef.current = idsRef.current.slice(0, waypoints.length);
    }
  }, [waypoints.length]);

  const addWaypoint = () => {
    idsRef.current.push(`wp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    onWaypointsChange([...waypoints, '']);
  };
  const updateWaypoint = (index: number, value: string) => {
    const updated = [...waypoints];
    updated[index] = value;
    onWaypointsChange(updated);
  };
  const removeWaypoint = (index: number) => {
    idsRef.current.splice(index, 1);
    onWaypointsChange(waypoints.filter((_, i) => i !== index));
  };

  const optimizeRoute = async () => {
    const filledWaypoints = waypoints.filter(w => w.trim());
    if (filledWaypoints.length < 2 || !origin) {
      toast.error('कम से कम 2 stops और origin चाहिए');
      return;
    }

    setIsOptimizing(true);
    try {
      const allPlaces = [origin, ...filledWaypoints, ...(destination ? [destination] : [])];
      const coords = await Promise.all(allPlaces.map(geocode));

      if (coords.some(c => !c)) {
        toast.error('कुछ locations geocode नहीं हो सकीं');
        setIsOptimizing(false);
        return;
      }

      const validCoords = coords as { lat: number; lng: number }[];

      const waypointIndices = filledWaypoints.map((_, i) => i + 1);
      const visited = new Set<number>();
      const order: number[] = [];
      let current = 0;

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

      const optimized = order.map(i => filledWaypoints[i - 1]);
      // Reorder ids to match (keep same id objects for stable keys).
      const filledIds = filledWaypoints.map((_, i) => idsRef.current[waypoints.indexOf(filledWaypoints[i])] || idsRef.current[i]);
      idsRef.current = order.map(i => filledIds[i - 1]);
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

  // Drag handlers — commit reorder only on drop to keep inputs stable while dragging.
  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    setOverIndex(index);
  };
  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    const updated = [...waypoints];
    const [removed] = updated.splice(dragIndex, 1);
    updated.splice(index, 0, removed);
    const updatedIds = [...idsRef.current];
    const [removedId] = updatedIds.splice(dragIndex, 1);
    updatedIds.splice(index, 0, removedId);
    idsRef.current = updatedIds;
    onWaypointsChange(updated);
    setDragIndex(null);
    setOverIndex(null);
  };
  const handleDragEnd = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  return (
    <div className="space-y-2">
      {waypoints.map((waypoint, index) => {
        const key = idsRef.current[index] ?? `idx-${index}`;
        const isDragging = dragIndex === index;
        const isDropTarget = overIndex === index && dragIndex !== index;
        return (
          <div
            key={key}
            className={`relative flex items-center gap-2 animate-fade-in transition-all ${
              isDragging ? 'opacity-40' : ''
            } ${isDropTarget ? 'ring-2 ring-primary/40 rounded-lg' : ''}`}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
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
        );
      })}

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
