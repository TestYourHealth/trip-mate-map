import React from 'react';
import { CheckCircle2, XCircle, Navigation, Gauge, Crosshair } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ClassifiedFix } from './GpsFixMap';

interface GpsFixTimelineProps {
  fixes: ClassifiedFix[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}

const fmtOffset = (ms: number) => `+${(ms / 1000).toFixed(1)}s`;

/**
 * Chronological list of every GPS sample with its accept/reject verdict and the
 * reason behind it, so each smoke-test step can be traced back to raw fixes.
 */
const GpsFixTimeline: React.FC<GpsFixTimelineProps> = ({ fixes, selectedIndex, onSelect }) => {
  if (fixes.length === 0) return null;

  return (
    <ol className="space-y-1.5" aria-label="GPS sample timeline">
      {fixes.map((f) => {
        const active = f.index === selectedIndex;
        return (
          <li key={f.index}>
            <button
              type="button"
              onClick={() => onSelect(f.index)}
              aria-pressed={active}
              className={cn(
                'w-full text-left glass-card rounded-xl p-2.5 flex items-start gap-2.5 transition-all',
                active && 'ring-2 ring-primary/50',
                !active && f.accepted && 'ring-1 ring-success/25',
                !active && !f.accepted && 'ring-1 ring-destructive/35'
              )}
            >
              <span className="mt-0.5 flex-shrink-0">
                {f.accepted
                  ? <CheckCircle2 className="w-4 h-4 text-success" />
                  : <XCircle className="w-4 h-4 text-destructive" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold">#{f.index + 1}</span>
                  <span className="text-[10px] font-mono text-muted-foreground">{fmtOffset(f.offsetMs)}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted/60 text-muted-foreground">
                    {f.step === 'fix' ? 'initial fix' : 'live watch'}
                  </span>
                  {f.isBest && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary/15 text-primary font-medium">
                      routing origin
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                  <span className="inline-flex items-center gap-1">
                    <Crosshair className="w-3 h-3" />±{Math.round(f.accuracy)}m
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Gauge className="w-3 h-3" />
                    {f.speed != null && !Number.isNaN(f.speed) ? `${(f.speed * 3.6).toFixed(0)} km/h` : '—'}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Navigation className="w-3 h-3" />
                    {f.heading != null && !Number.isNaN(f.heading) ? `${Math.round(f.heading)}°` : '—'}
                  </span>
                  {f.impliedKmh != null && (
                    <span className={cn(f.impliedKmh > 250 && 'text-destructive')}>
                      implied {Math.round(f.impliedKmh)} km/h
                    </span>
                  )}
                </div>
                {f.reasons.length > 0 && (
                  <p className={cn(
                    'mt-1 text-[11px] leading-relaxed',
                    f.accepted ? 'text-muted-foreground' : 'text-destructive'
                  )}>
                    {f.reasons.join(' · ')}
                  </p>
                )}
              </div>
            </button>
          </li>
        );
      })}
    </ol>
  );
};

export default GpsFixTimeline;
