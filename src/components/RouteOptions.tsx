import React from 'react';
import { Settings2, Ban, Gauge, Ruler, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RoutePreferences } from '@/types/routePrefs';

interface RouteOptionsProps {
  prefs: RoutePreferences;
  onChange: (prefs: RoutePreferences) => void;
  disabled?: boolean;
}

const RouteOptions: React.FC<RouteOptionsProps> = ({ prefs, onChange, disabled }) => {
  const toggleClass = (active: boolean) =>
    cn(
      'flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-all duration-200',
      active
        ? 'border-primary/50 bg-primary/15 text-primary'
        : 'border-border/50 bg-muted/20 text-muted-foreground hover:bg-muted/40',
      disabled && 'opacity-50 pointer-events-none'
    );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Settings2 className="w-3.5 h-3.5" />
        <span className="text-xs font-medium">Route Options</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          aria-pressed={prefs.avoidTolls}
          onClick={() => onChange({ ...prefs, avoidTolls: !prefs.avoidTolls })}
          className={toggleClass(prefs.avoidTolls)}
        >
          <Ban className="w-3.5 h-3.5" /> Avoid Tolls
        </button>
        <button
          type="button"
          aria-pressed={prefs.avoidHighways}
          onClick={() => onChange({ ...prefs, avoidHighways: !prefs.avoidHighways })}
          className={toggleClass(prefs.avoidHighways)}
        >
          <Ban className="w-3.5 h-3.5" /> Avoid Highways
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Route optimization">
        <button
          type="button"
          aria-pressed={prefs.optimize === 'fastest'}
          onClick={() => onChange({ ...prefs, optimize: 'fastest' })}
          className={toggleClass(prefs.optimize === 'fastest')}
        >
          <Zap className="w-3.5 h-3.5" /> Fastest
        </button>
        <button
          type="button"
          aria-pressed={prefs.optimize === 'shortest'}
          onClick={() => onChange({ ...prefs, optimize: 'shortest' })}
          className={toggleClass(prefs.optimize === 'shortest')}
        >
          <Ruler className="w-3.5 h-3.5" /> Shortest
        </button>
      </div>

      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Gauge className="w-3 h-3" />
        {prefs.avoidTolls ? 'Toll cost ₹0 — toll-free route' : 'Toll charges cost me जुड़े हैं'}
      </p>
    </div>
  );
};

export default RouteOptions;
