import React from 'react';
import { cn } from '@/lib/utils';


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
        'relative w-14 h-14 flex items-center justify-center rounded-full',
        'glass-panel glass-sheen glow-ring',
        'transition-all duration-300 hover:scale-105 active:scale-90',
        isOffNorth && 'shadow-[0_0_22px_-6px_hsl(var(--primary)/0.75)]',
        className,
      )}
      aria-label={displayHeading !== null ? `Reset to north. Heading ${displayHeading}°` : 'Compass'}
    >
      {/* Inner bezel ring */}
      <span className="absolute inset-2 rounded-full border border-foreground/10" />

      {/* Cardinal N marker */}
      <span
        className={cn(
          'absolute top-1 left-1/2 -translate-x-1/2 text-[8px] font-bold tracking-[0.15em]',
          isOffNorth ? 'text-primary' : 'text-muted-foreground/60',
        )}
      >
        N
      </span>

      {/* Needle */}
      <span
        className="relative block h-8 w-[3px] rounded-full transition-transform duration-300"
        style={{ transform: `rotate(${displayHeading ?? 0}deg)` }}
      >
        <span className="absolute inset-x-0 top-0 h-1/2 rounded-full bg-gradient-to-b from-primary to-primary/40" />
        <span className="absolute inset-x-0 bottom-0 h-1/2 rounded-full bg-foreground/20" />
        <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary blur-[1px]" />
      </span>
    </button>
  );

};

export default CompassIndicator;
