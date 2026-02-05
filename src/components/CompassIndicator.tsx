import React from 'react';
import { cn } from '@/lib/utils';

interface CompassIndicatorProps {
  heading: number | null;
  className?: string;
}

const CompassIndicator: React.FC<CompassIndicatorProps> = ({ heading, className }) => {
  const displayHeading = heading !== null ? Math.round(heading) : null;
  
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

  return (
    <div 
      className={cn(
        "bg-background/95 backdrop-blur-sm rounded-xl shadow-lg p-2 min-w-[64px]",
        "border border-border/50",
        className
      )}
      role="status"
      aria-label={displayHeading !== null ? `Compass heading ${displayHeading} degrees ${getCardinalDirection(displayHeading)}` : 'Compass unavailable'}
    >
      <div className="flex flex-col items-center gap-1">
        {/* Compass Rose */}
        <div className="relative w-12 h-12">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-2 border-muted-foreground/30" />
          
          {/* Cardinal markers */}
          <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-0.5 text-[8px] font-bold text-primary">N</span>
          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-0.5 text-[8px] font-medium text-muted-foreground">S</span>
          <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-0.5 text-[8px] font-medium text-muted-foreground">W</span>
          <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-0.5 text-[8px] font-medium text-muted-foreground">E</span>
          
          {/* Rotating needle */}
          <div 
            className="absolute inset-2 transition-transform duration-300 ease-out"
            style={{ transform: `rotate(${displayHeading ?? 0}deg)` }}
          >
            <svg viewBox="0 0 32 32" className="w-full h-full">
              {/* North needle (red) */}
              <path 
                d="M16 4 L19 16 L16 14 L13 16 Z" 
                className="fill-destructive"
              />
              {/* South needle (gray) */}
              <path 
                d="M16 28 L13 16 L16 18 L19 16 Z" 
                className="fill-muted-foreground/50"
              />
              {/* Center dot */}
              <circle cx="16" cy="16" r="2" className="fill-foreground" />
            </svg>
          </div>
        </div>
        
        {/* Heading display */}
        <div className="text-center">
          {displayHeading !== null ? (
            <>
              <p className="text-sm font-bold text-foreground leading-none">
                {displayHeading}°
              </p>
              <p className="text-[9px] text-primary font-medium">
                {getCardinalDirection(displayHeading)}
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">--°</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompassIndicator;
