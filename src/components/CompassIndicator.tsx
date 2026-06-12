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
        'relative w-11 h-11 flex items-center justify-center rounded-full',
        'glass-panel border border-white/40 dark:border-white/10',
        'shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.3)]',
        'ring-1 ring-primary/10',
        'transition-all duration-300 hover:scale-105 active:scale-90',
        isOffNorth && 'ring-2 ring-primary/40',
        className,
      )}
      aria-label={displayHeading !== null ? `Reset to north. Heading ${displayHeading}°` : 'Compass'}
    >
      {/* Cardinal N marker */}
      <span
        className={cn(
          'absolute top-1 left-1/2 -translate-x-1/2 text-[8px] font-bold tracking-wider',
          isOffNorth ? 'text-primary' : 'text-muted-foreground/60',
        )}
      >
        N
      </span>
      <Navigation
        className={cn(
          'w-4 h-4 transition-transform duration-300',
          isOffNorth ? 'text-primary' : 'text-muted-foreground',
        )}
        style={{ transform: `rotate(${displayHeading ?? 0}deg)` }}
        fill={isOffNorth ? 'currentColor' : 'none'}
        strokeWidth={2}
      />
    </button>
  );
};

export default CompassIndicator;
