import React from 'react';
import { Loader2, Navigation } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface RouteLoadingSkeletonProps {
  isMobile?: boolean;
}

/**
 * Skeleton placeholder shown while a trip route + cost is being calculated.
 * Mirrors the shape of TripPanel so layout doesn't jump when data arrives.
 */
const RouteLoadingSkeleton: React.FC<RouteLoadingSkeletonProps> = ({ isMobile = false }) => {
  const content = (
    <>
      <div className={cn('flex items-center gap-3', isMobile ? 'pb-4' : 'mb-5')}>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-sm">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        </div>
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32 skeleton-pulse" />
          <Skeleton className="h-3 w-44 skeleton-pulse" />
        </div>
      </div>

      <div className="space-y-3">
        <Skeleton className="h-14 w-full rounded-xl skeleton-pulse" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-16 rounded-xl skeleton-pulse" />
          <Skeleton className="h-16 rounded-xl skeleton-pulse" />
        </div>
        <div className="bg-muted/30 rounded-xl p-3 space-y-2">
          <Skeleton className="h-3 w-24 skeleton-pulse" />
          <Skeleton className="h-4 w-full skeleton-pulse" />
          <Skeleton className="h-4 w-3/4 skeleton-pulse" />
          <div className="h-px bg-border my-1" />
          <Skeleton className="h-5 w-1/2 skeleton-pulse" />
        </div>
        <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-2 pt-1">
          <Navigation className="w-3 h-3 animate-pulse" />
          Calculating best route & cost…
        </p>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <div className="bg-background/95 backdrop-blur-xl border-t border-border/30 shadow-xl rounded-t-3xl p-5 w-full animate-slide-up-panel safe-area-bottom">
        <div className="flex justify-center mb-2">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
        </div>
        {content}
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-5 w-full max-w-sm animate-slide-in-right">
      {content}
    </div>
  );
};

export default RouteLoadingSkeleton;

/**
 * Floating map busy pill — overlays the map while routing is in flight.
 */
export const MapBusyIndicator: React.FC<{ label?: string }> = ({ label = 'Finding best route…' }) => (
  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[90] pointer-events-none animate-fade-in">
    <div className="glass-card rounded-full px-4 py-2.5 flex items-center gap-2.5 shadow-lg">
      <Loader2 className="w-4 h-4 text-primary animate-spin" />
      <span className="text-sm font-medium text-foreground">{label}</span>
    </div>
  </div>
);
