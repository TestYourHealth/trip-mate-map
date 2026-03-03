import React from 'react';
import { cn } from '@/lib/utils';
import { Navigation } from 'lucide-react';

interface CompassIndicatorProps {
  heading: number | null;
  onResetNorth?: () => void;
  className?: string;
}

const CompassIndicator: React.FC<CompassIndicatorProps> = ({ heading, onResetNorth, className }) => {
  const displayHeading = heading !== null ? Math.round(((heading % 360) + 360) % 360) : null;
  const isOffNorth = displayHeading !== null && displayHeading > 5 && displayHeading < 355;

  return (
    <button
      onClick={onResetNorth}
      className={cn(
        "w-9 h-9 flex items-center justify-center",
        "bg-background rounded-full shadow-md border border-border/60",
        "transition-all duration-200 hover:shadow-lg active:scale-95",
        isOffNorth && "ring-1 ring-destructive/20",
        className
      )}
      aria-label={displayHeading !== null ? `Reset to north. Heading ${displayHeading}°` : 'Compass'}
    >
      <Navigation 
        className={cn("w-4 h-4 text-destructive/80", !isOffNorth && "text-muted-foreground")}
        style={{ transform: `rotate(${displayHeading ?? 0}deg)` }}
        fill={isOffNorth ? "currentColor" : "none"}
        strokeWidth={2}
      />
    </button>
  );
};

export default CompassIndicator;