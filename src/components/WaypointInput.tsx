import React from 'react';
import { MapPin, Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface WaypointInputProps {
  waypoints: string[];
  onWaypointsChange: (waypoints: string[]) => void;
}

const WaypointInput: React.FC<WaypointInputProps> = ({ waypoints, onWaypointsChange }) => {
  const addWaypoint = () => {
    onWaypointsChange([...waypoints, '']);
  };

  const updateWaypoint = (index: number, value: string) => {
    const updated = [...waypoints];
    updated[index] = value;
    onWaypointsChange(updated);
  };

  const removeWaypoint = (index: number) => {
    onWaypointsChange(waypoints.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      {waypoints.map((waypoint, index) => (
        <div key={index} className="relative flex items-center gap-2 animate-fade-in">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
            <Input
              placeholder={`Stop ${index + 1} (e.g., Jaipur)`}
              value={waypoint}
              onChange={(e) => updateWaypoint(index, e.target.value)}
              className="pl-10 pr-10 bg-muted/50 border-0 focus-visible:ring-primary"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => removeWaypoint(index)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ))}
      
      {waypoints.length < 5 && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground hover:text-primary"
          onClick={addWaypoint}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Stop
        </Button>
      )}
    </div>
  );
};

export default WaypointInput;
