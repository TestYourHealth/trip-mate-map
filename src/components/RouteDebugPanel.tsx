import { useEffect, useState } from 'react';
import { Bug, X, Trash2, Activity } from 'lucide-react';
import type { GeocodeDebugEntry, GeocodeSource } from './Map';
import {
  getAllStats,
  subscribeTelemetry,
  clearTelemetry,
  type ProviderStats,
} from '@/lib/searchTelemetry';

const DEBUG_KEY = 'routeDebugLog';
const DEBUG_EVENT = 'route-debug-update';

const sourceColor: Record<GeocodeSource, string> = {
  autocomplete: 'bg-success/20 text-success border-success/30',
  cache: 'bg-info/20 text-info border-info/30',
  nominatim: 'bg-warning/20 text-warning border-warning/30',
  failed: 'bg-destructive/20 text-destructive border-destructive/30',
};

const sourceLabel: Record<GeocodeSource, string> = {
  autocomplete: 'Autocomplete',
  cache: 'Cache',
  nominatim: 'Nominatim',
  failed: 'Failed',
};

const RouteDebugPanel = () => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'route' | 'search'>('route');
  const [entries, setEntries] = useState<GeocodeDebugEntry[]>([]);
  const [stats, setStats] = useState<ProviderStats[]>([]);

  const refresh = () => {
    try {
      const raw = sessionStorage.getItem(DEBUG_KEY);
      setEntries(raw ? JSON.parse(raw) : []);
    } catch {
      setEntries([]);
    }
    setStats(getAllStats());
  };

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener(DEBUG_EVENT, handler);
    const unsub = subscribeTelemetry(handler);
    return () => {
      window.removeEventListener(DEBUG_EVENT, handler);
      unsub();
    };
  }, []);

  const clear = () => {
    if (tab === 'route') {
      sessionStorage.removeItem(DEBUG_KEY);
      setEntries([]);
    } else {
      clearTelemetry();
      setStats(getAllStats());
    }
  };


  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[2000] pointer-events-none">
      <div className="pointer-events-auto">
        {!open ? (
          <button
            onClick={() => { setOpen(true); refresh(); }}
            className="glass-card rounded-full px-3 py-1.5 flex items-center gap-1.5 text-[11px] font-medium text-foreground/80 hover:text-foreground border border-border/50 shadow-lg"
            title="Route debug"
          >
            <Bug className="w-3.5 h-3.5" />
            <span>Debug</span>
            {entries[0] && (
              <span className={`ml-1 px-1.5 py-0.5 rounded-full border text-[10px] ${sourceColor[entries[0].source]}`}>
                {sourceLabel[entries[0].source]}
              </span>
            )}
          </button>
        ) : (
          <div className="glass-card rounded-xl border border-border/50 shadow-2xl w-[92vw] max-w-md max-h-[60vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setTab('route')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold ${tab === 'route' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <Bug className="w-3.5 h-3.5" /> Route
                  <span className="font-normal opacity-70">({entries.length})</span>
                </button>
                <button
                  onClick={() => setTab('search')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold ${tab === 'search' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <Activity className="w-3.5 h-3.5" /> Search
                  <span className="font-normal opacity-70">({stats.reduce((a, s) => a + s.total, 0)})</span>
                </button>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={clear}
                  className="p-1 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                  title="Clear"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto overscroll-contain">
              {tab === 'route' ? (
                entries.length === 0 ? (
                  <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                    No requests yet. Calculate a route to see geocoding sources.
                  </div>
                ) : (
                  <ul className="divide-y divide-border/40">
                    {entries.map((e, i) => (
                      <li key={i} className="px-3 py-2 text-[11px] flex items-start gap-2">
                        <span className={`shrink-0 px-1.5 py-0.5 rounded-md border text-[10px] font-medium ${sourceColor[e.source]}`}>
                          {sourceLabel[e.source]}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium text-foreground/90" title={e.query}>
                            {e.query}
                          </div>
                          <div className="text-muted-foreground flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                            <span>status: <span className={e.source === 'failed' ? 'text-destructive' : 'text-foreground/80'}>{e.status}</span></span>
                            {e.variant && e.variant !== e.query && <span title={e.variant}>via: {e.variant.slice(0, 30)}</span>}
                            {e.coords && (
                              <span className="font-mono">
                                {e.coords.lat.toFixed(4)}, {e.coords.lng.toFixed(4)}
                              </span>
                            )}
                            <span className="ml-auto opacity-60">
                              {new Date(e.ts).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )
              ) : (
                stats.every((s) => s.total === 0) ? (
                  <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                    No searches yet. Type in a location field to record telemetry.
                  </div>
                ) : (
                  <ul className="divide-y divide-border/40">
                    {stats.map((s) => (
                      <li key={s.provider} className="px-3 py-2 text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground/90 capitalize">{s.provider}</span>
                          <span className="text-muted-foreground">n={s.total}</span>
                          {s.lastOutcome && (
                            <span className={`ml-auto px-1.5 py-0.5 rounded-md border text-[10px] ${
                              s.lastOutcome === 'success' ? 'bg-success/20 text-success border-success/30'
                              : s.lastOutcome === 'empty' ? 'bg-muted text-muted-foreground border-border'
                              : s.lastOutcome === 'timeout' ? 'bg-warning/20 text-warning border-warning/30'
                              : 'bg-destructive/20 text-destructive border-destructive/30'
                            }`}>
                              {s.lastOutcome}{s.lastMs != null ? ` · ${s.lastMs}ms` : ''}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 grid grid-cols-4 gap-1 text-[10px] text-muted-foreground">
                          <div>avg <span className="text-foreground/80 font-mono">{s.avgMs}ms</span></div>
                          <div>p95 <span className="text-foreground/80 font-mono">{s.p95Ms}ms</span></div>
                          <div>err <span className={`font-mono ${s.errorRate > 0.2 ? 'text-destructive' : 'text-foreground/80'}`}>{Math.round(s.errorRate * 100)}%</span></div>
                          <div>t/o <span className="text-foreground/80 font-mono">{s.timeouts}</span></div>
                        </div>
                        {s.lastError && (
                          <div className="mt-1 text-[10px] text-destructive/80 truncate" title={s.lastError}>
                            {s.lastError}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default RouteDebugPanel;
