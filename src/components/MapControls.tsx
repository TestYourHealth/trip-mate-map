import React, { useState } from 'react';
import { Plus, Minus, Layers, Locate } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MapRef, MapLayerStyle } from './Map';

interface MapControlsProps {
  mapRef: React.RefObject<MapRef>;
  className?: string;
}

const layerLabel: Record<MapLayerStyle, string> = {
  standard: 'Standard',
  dark: 'Dark',
  satellite: 'Satellite',
};

const MapControls: React.FC<MapControlsProps> = ({ mapRef, className }) => {
  const [layer, setLayer] = useState<MapLayerStyle>(() => mapRef.current?.getTileLayer() ?? 'standard');
  const [toast, setToast] = useState<string | null>(null);
  const [recenterPulse, setRecenterPulse] = useState(false);

  const flashToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 1000);
  };

  const handleCycleLayer = () => {
    const next = mapRef.current?.cycleTileLayer();
    if (next) {
      setLayer(next);
      flashToast(layerLabel[next]);
    }
  };

  const handleRecenter = () => {
    mapRef.current?.centerOnUser();
    setRecenterPulse(true);
    window.setTimeout(() => setRecenterPulse(false), 600);
  };

  return (
    <div className={cn('relative pointer-events-auto', className)}>
      {/* Layer change toast */}
      {toast && (
        <div className="absolute -left-2 -translate-x-full top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-foreground/90 px-3 py-1 text-xs font-semibold text-background shadow-lg animate-fade-in">
          {toast}
        </div>
      )}

      <div
        className={cn(
          'glass-panel flex flex-col items-stretch rounded-2xl p-1.5 gap-1',
          'border border-white/40 dark:border-white/10',
          'shadow-[0_8px_28px_-8px_hsl(var(--primary)/0.25)]',
          'ring-1 ring-primary/10',
          'backdrop-blur-xl',
        )}
      >
        <ControlButton onClick={() => mapRef.current?.zoomIn()} label="Zoom in">
          <Plus className="w-4 h-4" strokeWidth={2.5} />
        </ControlButton>
        <div className="h-px bg-border/50 mx-1" />
        <ControlButton onClick={() => mapRef.current?.zoomOut()} label="Zoom out">
          <Minus className="w-4 h-4" strokeWidth={2.5} />
        </ControlButton>
        <div className="h-px bg-border/50 mx-1" />
        <ControlButton onClick={handleCycleLayer} label={`Map style: ${layerLabel[layer]}`} active={layer !== 'standard'}>
          <Layers className="w-4 h-4" strokeWidth={2.2} />
        </ControlButton>
        <div className="h-px bg-border/50 mx-1" />
        <ControlButton onClick={handleRecenter} label="Recenter on me">
          <Locate
            className={cn(
              'w-4 h-4 transition-transform duration-300',
              recenterPulse && 'scale-125 text-primary drop-shadow-[0_0_6px_hsl(var(--primary)/0.6)]',
            )}
            strokeWidth={2.2}
          />
        </ControlButton>
      </div>
    </div>
  );
};

interface ControlButtonProps {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  active?: boolean;
}

const ControlButton: React.FC<ControlButtonProps> = ({ onClick, label, children, active }) => (
  <button
    onClick={onClick}
    aria-label={label}
    title={label}
    className={cn(
      'w-9 h-9 flex items-center justify-center rounded-xl',
      'text-foreground/80 hover:text-primary',
      'hover:bg-primary/10 active:bg-primary/15',
      'active:scale-90 transition-all duration-200',
      active && 'text-primary bg-primary/10 ring-1 ring-primary/30',
    )}
  >
    {children}
  </button>
);

export default MapControls;
