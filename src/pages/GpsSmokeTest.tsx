import React, { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Play, RotateCcw, Copy, CheckCircle2, XCircle,
  Loader2, CircleDashed, AlertTriangle, Smartphone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import SEO from '@/components/SEO';
import { cn } from '@/lib/utils';
import { FUEL_STORAGE_KEYS } from '@/constants/storageKeys';

type StepStatus = 'idle' | 'running' | 'pass' | 'warn' | 'fail';

interface StepResult {
  id: string;
  label: string;
  status: StepStatus;
  detail?: string;
}

const STEPS: { id: string; label: string }[] = [
  { id: 'platform', label: 'Device & platform detection' },
  { id: 'permission', label: 'Location permission' },
  { id: 'fix', label: 'GPS fix (accuracy check)' },
  { id: 'live', label: 'Live tracking (15s watch)' },
  { id: 'route', label: 'Live routing from your position' },
  { id: 'cost', label: 'Fuel + toll cost calculation' },
];

const detectPlatform = () => {
  const ua = navigator.userAgent || '';
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPad|iPhone|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && typeof document !== 'undefined' && 'ontouchend' in document);
  const isNativeShell = !!(window as any).gonative || !!(window as any).median || !!(window as any).Capacitor;
  const standalone =
    window.matchMedia?.('(display-mode: standalone)')?.matches ||
    (navigator as any).standalone === true;
  return {
    os: isAndroid ? 'Android' : isIOS ? 'iOS' : 'Desktop/Other',
    isMobile: isAndroid || isIOS,
    isNativeShell,
    standalone,
    secure: window.isSecureContext,
    ua,
  };
};

const getVehicleConfig = () => {
  try {
    const vehicles = JSON.parse(localStorage.getItem('vehicles') || '[]');
    const prices = JSON.parse(localStorage.getItem(FUEL_STORAGE_KEYS.prices) || 'null') ||
      { petrol: 105, diesel: 92, cng: 85, electric: 8 };
    const def = vehicles.find((v: any) => v.isDefault) || vehicles[0];
    if (def) {
      return {
        name: def.name || def.type || 'Default vehicle',
        fuelType: def.fuelType,
        fuelPrice: prices[def.fuelType] ?? (def.fuelType === 'electric' ? 8 : 105),
        mileage: def.mileage,
      };
    }
  } catch { /* fall through to defaults */ }
  return { name: 'Fallback defaults', fuelType: 'petrol', fuelPrice: 105, mileage: 15 };
};

const statusIcon = (s: StepStatus) => {
  if (s === 'running') return <Loader2 className="w-4 h-4 animate-spin text-primary" />;
  if (s === 'pass') return <CheckCircle2 className="w-4 h-4 text-success" />;
  if (s === 'warn') return <AlertTriangle className="w-4 h-4 text-warning" />;
  if (s === 'fail') return <XCircle className="w-4 h-4 text-destructive" />;
  return <CircleDashed className="w-4 h-4 text-muted-foreground/50" />;
};

const GpsSmokeTest: React.FC = () => {
  const navigate = useNavigate();
  const [results, setResults] = useState<StepResult[]>(
    STEPS.map((s) => ({ ...s, status: 'idle' as StepStatus }))
  );
  const [isRunning, setIsRunning] = useState(false);
  const [progressNote, setProgressNote] = useState('');
  const watchIdRef = useRef<number | null>(null);

  const set = useCallback((id: string, status: StepStatus, detail?: string) => {
    setResults((prev) => prev.map((r) => (r.id === id ? { ...r, status, detail } : r)));
  }, []);

  const reset = useCallback(() => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = null;
    setResults(STEPS.map((s) => ({ ...s, status: 'idle' as StepStatus })));
    setProgressNote('');
  }, []);

  const run = useCallback(async () => {
    reset();
    setIsRunning(true);

    // 1. Platform
    set('platform', 'running');
    const p = detectPlatform();
    const platformDetail = `${p.os}${p.isNativeShell ? ' (native shell)' : p.standalone ? ' (installed PWA)' : ' (browser)'} • secure context: ${p.secure ? 'yes' : 'no'}`;
    if (!p.secure) {
      set('platform', 'fail', `${platformDetail} — GPS requires HTTPS`);
      setIsRunning(false);
      return;
    }
    set(p.isMobile ? 'platform' : 'platform', p.isMobile ? 'pass' : 'warn',
      p.isMobile ? platformDetail : `${platformDetail} — run this on a real Android/iOS device for a valid result`);

    // 2. Permission
    set('permission', 'running');
    if (!('geolocation' in navigator)) {
      set('permission', 'fail', 'navigator.geolocation is unavailable on this device');
      setIsRunning(false);
      return;
    }
    let permState = 'unknown';
    try {
      const status = await (navigator as any).permissions?.query({ name: 'geolocation' });
      permState = status?.state ?? 'unknown';
    } catch { /* Permissions API unsupported (older iOS) */ }
    if (permState === 'denied') {
      set('permission', 'fail', 'Denied — enable location for this app in device settings, then re-run');
      setIsRunning(false);
      return;
    }
    set('permission', 'pass', permState === 'unknown'
      ? 'Permissions API unavailable — will prompt on first fix (normal on iOS Safari)'
      : `State: ${permState}`);

    // 3. GPS fix
    set('fix', 'running');
    setProgressNote('Waiting for a GPS fix…');
    let first: GeolocationPosition;
    try {
      first = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true, timeout: 20000, maximumAge: 0,
        });
      });
    } catch (err: any) {
      const code = err?.code;
      set('fix', 'fail',
        code === 1 ? 'Permission denied at the OS prompt'
          : code === 2 ? 'Position unavailable — check that device GPS/Location is switched on'
            : 'Timed out after 20s — move outdoors or near a window and re-run');
      setIsRunning(false);
      setProgressNote('');
      return;
    }
    const acc = first.coords.accuracy;
    set('fix', acc <= 50 ? 'pass' : 'warn',
      `${first.coords.latitude.toFixed(5)}, ${first.coords.longitude.toFixed(5)} • accuracy ±${Math.round(acc)}m${acc > 50 ? ' (coarse — likely network/wifi positioning)' : ''}`);

    // 4. Live tracking for 15s
    set('live', 'running');
    setProgressNote('Tracking for 15 seconds — walk or drive a few metres…');
    const samples: GeolocationPosition[] = [];
    await new Promise<void>((resolve) => {
      const id = navigator.geolocation.watchPosition(
        (pos) => samples.push(pos),
        () => { /* transient watch errors are tolerated */ },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
      watchIdRef.current = id;
      setTimeout(() => {
        navigator.geolocation.clearWatch(id);
        watchIdRef.current = null;
        resolve();
      }, 15000);
    });
    const headings = samples.filter((s) => s.coords.heading != null).length;
    const speeds = samples.filter((s) => s.coords.speed != null).length;
    if (samples.length === 0) {
      set('live', 'fail', 'watchPosition delivered no updates in 15s');
    } else {
      set('live', samples.length >= 3 ? 'pass' : 'warn',
        `${samples.length} update${samples.length === 1 ? '' : 's'} in 15s • heading on ${headings}, speed on ${speeds}${samples.length < 3 ? ' — low update rate, expected when stationary' : ''}`);
    }

    // 5. Live routing from current position
    set('route', 'running');
    setProgressNote('Requesting a live route from your position…');
    const last = samples[samples.length - 1] ?? first;
    const oLat = last.coords.latitude, oLng = last.coords.longitude;
    // Destination ~5km north of the live position — always routable, no fixed city assumption.
    const dLat = oLat + 0.045, dLng = oLng;
    let distanceKm = 0, durationMin = 0;
    try {
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${oLng},${oLat};${dLng},${dLat}?overview=false`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const route = json?.routes?.[0];
      if (!route) throw new Error(json?.message || 'No route returned');
      distanceKm = route.distance / 1000;
      durationMin = route.duration / 60;
      set('route', 'pass', `${distanceKm.toFixed(1)} km • ${Math.round(durationMin)} min from your live GPS position`);
    } catch (err: any) {
      set('route', 'fail', `Routing failed: ${err?.message || 'network error'}`);
      setIsRunning(false);
      setProgressNote('');
      return;
    }

    // 6. Cost calculation (mirrors the trip cost formula)
    set('cost', 'running');
    const v = getVehicleConfig();
    if (!v.mileage || v.mileage <= 0) {
      set('cost', 'fail', `Invalid mileage on "${v.name}" — set it in Vehicle Settings`);
    } else {
      const fuelCost = Math.round((distanceKm / v.mileage) * v.fuelPrice);
      const tollCost = Math.round(distanceKm * 1.5);
      const total = fuelCost + tollCost;
      const sane = fuelCost > 0 && total >= fuelCost;
      set('cost', sane ? 'pass' : 'fail',
        `${v.name} (${v.fuelType}, ${v.mileage} km/${v.fuelType === 'electric' ? 'kWh' : 'L'} @ ₹${v.fuelPrice}) → fuel ₹${fuelCost} + toll ₹${tollCost} = ₹${total}`);
    }

    setProgressNote('');
    setIsRunning(false);
  }, [reset, set]);

  const copyReport = useCallback(() => {
    const p = detectPlatform();
    const lines = [
      'TripMate — Real-device GPS smoke test',
      new Date().toISOString(),
      `Platform: ${p.os} | native shell: ${p.isNativeShell} | standalone: ${p.standalone}`,
      `UA: ${p.ua}`,
      '',
      ...results.map((r) => `[${r.status.toUpperCase()}] ${r.label}${r.detail ? ` — ${r.detail}` : ''}`),
    ];
    navigator.clipboard?.writeText(lines.join('\n'))
      .then(() => toast.success('Report copied'))
      .catch(() => toast.error('Could not copy report'));
  }, [results]);

  const failed = results.filter((r) => r.status === 'fail').length;
  const passed = results.filter((r) => r.status === 'pass').length;
  const done = !isRunning && results.some((r) => r.status !== 'idle');

  return (
    <div className="min-h-screen bg-background p-4 pb-24 safe-area-top">
      <SEO
        title="GPS Smoke Test — TripMate Device Diagnostics"
        description="Run an end-to-end check of geolocation, live routing and trip cost calculation on your Android or iOS device."
        path="/diagnostics/gps"
      />

      <header className="flex items-center gap-3 mb-5">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-lg font-bold">GPS Smoke Test</h1>
          <p className="text-xs text-muted-foreground">Geolocation → live routing → cost, end to end</p>
        </div>
      </header>

      <div className="glass-card rounded-2xl p-4 mb-4">
        <div className="flex items-start gap-3">
          <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/15 flex-shrink-0">
            <Smartphone className="w-4 h-4 text-primary" />
          </span>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Run this on a real Android or iOS device, outdoors if possible. The live tracking step
            takes 15 seconds — keep the screen on and move a few metres for the best result.
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <Button onClick={run} disabled={isRunning} className="flex-1">
          {isRunning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
          {isRunning ? 'Running…' : 'Run smoke test'}
        </Button>
        <Button variant="outline" size="icon" onClick={reset} disabled={isRunning} aria-label="Reset results">
          <RotateCcw className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={copyReport} disabled={!done} aria-label="Copy report">
          <Copy className="w-4 h-4" />
        </Button>
      </div>

      <p aria-live="polite" className="sr-only">{progressNote}</p>
      {progressNote && (
        <p className="text-xs text-primary mb-3 animate-fade-in">{progressNote}</p>
      )}

      <ol className="space-y-2">
        {results.map((r, i) => (
          <li
            key={r.id}
            className={cn(
              'glass-card rounded-xl p-3 flex items-start gap-3 transition-colors',
              r.status === 'fail' && 'ring-1 ring-destructive/40',
              r.status === 'running' && 'ring-1 ring-primary/40'
            )}
          >
            <span className="mt-0.5 flex-shrink-0">{statusIcon(r.status)}</span>
            <div className="min-w-0">
              <p className="text-sm font-medium">
                <span className="text-muted-foreground mr-1.5">{i + 1}.</span>{r.label}
              </p>
              {r.detail && <p className="text-xs text-muted-foreground mt-0.5 break-words">{r.detail}</p>}
            </div>
          </li>
        ))}
      </ol>

      {done && (
        <div className="mt-4 glass-card rounded-2xl p-4 animate-fade-in">
          <p className="text-sm font-semibold mb-1">
            {failed === 0 ? 'All critical checks passed' : `${failed} check${failed === 1 ? '' : 's'} failed`}
          </p>
          <p className="text-xs text-muted-foreground">
            {passed} passed · {failed} failed · tap the copy icon to share this report.
          </p>
        </div>
      )}
    </div>
  );
};

export default GpsSmokeTest;
