import React from 'react';
import { cn } from '@/lib/utils';

interface CompassIndicatorProps {
  heading: number | null;
  onResetNorth?: () => void;
  className?: string;
}

const CompassIndicator: React.FC<CompassIndicatorProps> = ({ heading, onResetNorth, className }) => {
  const displayHeading = heading !== null ? Math.round(((heading % 360) + 360) % 360) : null;
  
  const getCardinalDirection = (deg: number): string => {
    if (deg >= 337.5 || deg < 22.5) return 'N';
    if (deg >= 22.5 && deg < 67.5) return 'NE';
    if (deg >= 67.5 && deg < 112.5) return 'E';
    if (deg >= 112.5 && deg < 157.5) return 'SE';
    if (deg >= 157.5 && deg < 202.5) return 'S';
    if (deg >= 202.5 && deg < 247.5) return 'SW';
    if (deg >= 247.5 && deg < 292.5) return 'W';
    if (deg >= 292.5 && deg < 337.5) return 'NW';
    return 'N';
  };

  // Show red tint when not facing north
  const isOffNorth = displayHeading !== null && displayHeading > 5 && displayHeading < 355;

  return (
    <button
      onClick={onResetNorth}
      className={cn(
        "bg-background/95 backdrop-blur-sm rounded-full shadow-lg p-1",
        "border border-border/50 transition-all duration-200",
        "hover:scale-105 active:scale-95",
        isOffNorth && "ring-2 ring-destructive/30",
        className
      )}
      role="button"
      aria-label={displayHeading !== null ? `Reset to north. Current heading ${displayHeading}° ${getCardinalDirection(displayHeading)}` : 'Compass unavailable'}
    >
      {/* Compact compass - just the needle */}
      <div
        className="w-6 h-6 relative"
        style={{ transform: `rotate(${-(displayHeading ?? 0)}deg)` }}
      >
        <svg viewBox="0 0 32 32" className="w-full h-full">
          {/* North needle (red) */}
          <path
            d="M16 4 L19 15 L16 13 L13 15 Z"
            className="fill-destructive"
          />
          {/* South needle (white/gray) */}
          <path
            d="M16 28 L13 17 L16 19 L19 17 Z"
            className="fill-muted-foreground/40"
          />
          {/* Center dot */}
          <circle cx="16" cy="16" r="2.5" className="fill-background stroke-foreground/30" strokeWidth="1" />
        </svg>
      </div>
    </button>
  );
};

export default CompassIndicator;
