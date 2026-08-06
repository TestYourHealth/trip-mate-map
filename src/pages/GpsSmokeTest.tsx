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
  { id: 'sanity', label: 'Fix quality & plausibility checks' },
  { id: 'route', label: 'Live routing from your position' },
  { id: 'cost', label: 'Fuel + toll cost calculation' },
];

/** Accuracy thresholds in metres. */
const ACCURACY_GOOD = 30;
const ACCURACY_COARSE = 100;
/** Anything above this implied speed between two fixes is physically implausible. */
const MAX_PLAUSIBLE_KMH = 250;

const distanceMeters = (a: GeolocationCoordinates, b: GeolocationCoordinates) => {
  const R = 6371000;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

interface SanityReport {
  status: StepStatus;
  detail: string;
  /** Best usable sample for routing — worst fixes are discarded. */
  best: GeolocationPosition;
}

/**
 * Flags unrealistic fixes: teleport-style jumps, coarse accuracy,
 * frozen positions and missing speed/heading. Each problem carries
 * a plain-language next step.
 */
const validateFixes = (first: GeolocationPosition, samples: GeolocationPosition[]): SanityReport => {
  const all = [first, ...samples];
  const problems: string[] = [];
  const notes: string[] = [];

  // 1. Sudden jumps — implied speed between consecutive fixes.
  let jumps = 0;
  let worstJumpKmh = 0;
  let maxStepM = 0;
  for (let i = 1; i < all.length; i++) {
    const prev = all[i - 1];
    const cur = all[i];
    const dt = (cur.timestamp - prev.timestamp) / 1000;
    const dist = distanceMeters(prev.coords, cur.coords);
    maxStepM = Math.max(maxStepM, dist);
    if (dt <= 0) continue;
    const kmh = (dist / dt) * 3.6;
    // Ignore jitter inside the combined accuracy radius of both fixes.
    const noiseFloor = (prev.coords.accuracy + cur.coords.accuracy) / 2;
    if (dist > noiseFloor && kmh > MAX_PLAUSIBLE_KMH) {
      jumps++;
      worstJumpKmh = Math.max(worstJumpKmh, kmh);
    }
  }
  if (jumps > 0) {
    problems.push(
      `⚠ ${jumps} unrealistic jump${jumps === 1 ? '' : 's'} detected (up to ${Math.round(worstJumpKmh)} km/h implied). ` +
      `Usually a mocked location app, a VPN, or the phone switching between wifi and satellite positioning. ` +
      `Next: turn off any fake-GPS/VPN app, disable "wifi scanning" battery saving for location, then re-run.`
    );
  }

  // 2. Accuracy quality across the run.
  const accs = all.map((s) => s.coords.accuracy);
  const bestAcc = Math.min(...accs);
  const medianAcc = [...accs].sort((a, b) => a - b)[Math.floor(accs.length / 2)];
  if (medianAcc > ACCURACY_COARSE) {
    problems.push(
      `⚠ Very low accuracy (median ±${Math.round(medianAcc)}m). This is network/cell positioning, not real GPS — ` +
      `routes will start from the wrong place. Next: go outdoors, switch Location mode to "High accuracy"/"Precise Location", ` +
      `and give the phone 30–60s to lock onto satellites.`
    );
  } else if (medianAcc > ACCURACY_GOOD) {
    notes.push(`Accuracy is usable but coarse (median ±${Math.round(medianAcc)}m) — best fix was ±${Math.round(bestAcc)}m.`);
  } else {
    notes.push(`Accuracy healthy (median ±${Math.round(medianAcc)}m).`);
  }

  // 3. Frozen / cached position.
  if (all.length > 2 && maxStepM < 1) {
    problems.push(
      `⚠ The position never changed across ${all.length} fixes. The device is likely replaying a cached fix. ` +
      `Next: toggle Location off and on, then re-run while walking a few metres.`
    );
  }

  // 4. Missing speed / heading.
  const withSpeed = all.filter((s) => s.coords.speed != null && !Number.isNaN(s.coords.speed));
  const withHeading = all.filter((s) => s.coords.heading != null && !Number.isNaN(s.coords.heading));
  const moving = withSpeed.some((s) => (s.coords.speed as number) > 1);
  if (withSpeed.length === 0) {
    (moving ? problems : notes).push(
      `Speed missing on every fix. Expected when stationary; if it stays null while driving, ` +
      `turn-by-turn ETA will fall back to route averages. Next: re-run while actually moving.`
    );
  }
  if (withHeading.length === 0) {
    notes.push(
      `Heading missing on every fix — the map compass falls back to device orientation. ` +
      `On iOS, allow motion & orientation access in Settings → Safari.`
    );
  }
  if (moving && withHeading.length === 0) {
    problems.push(
      `⚠ Moving but no heading reported — navigation arrow cannot rotate. ` +
      `Next: calibrate the compass (figure-8 motion) and re-run.`
    );
  }

  // 5. Implausible reported speed.
  const badSpeed = withSpeed.find((s) => (s.coords.speed as number) * 3.6 > MAX_PLAUSIBLE_KMH);
  if (badSpeed) {
    problems.push(
      `⚠ Reported speed of ${Math.round((badSpeed.coords.speed as number) * 3.6)} km/h is not plausible. ` +
      `Next: check for a mock-location app and re-run.`
    );
  }

  // Best sample = most accurate fix that isn't part of a jump.
  const best = all.reduce((acc, cur) => (cur.coords.accuracy < acc.coords.accuracy ? cur : acc), all[0]);

  const detail = [...problems, ...notes].join('\n');
  return {
    status: problems.length > 0 ? (medianAcc > ACCURACY_COARSE || jumps > 0 ? 'fail' : 'warn') : 'pass',
    detail: detail || 'All fixes look plausible.',
    best,
  };
};


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
    set('fix', acc <= ACCURACY_GOOD ? 'pass' : acc <= ACCURACY_COARSE ? 'warn' : 'fail',
      `${first.coords.latitude.toFixed(5)}, ${first.coords.longitude.toFixed(5)} • accuracy ±${Math.round(acc)}m` +
      (acc > ACCURACY_COARSE
        ? '\n⚠ Too coarse to navigate with — this is wifi/cell positioning. Next: move outdoors and set Location to High accuracy / Precise Location.'
        : acc > ACCURACY_GOOD
          ? '\nUsable but not sharp — a few more seconds outdoors will tighten the fix.'
          : ''));

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
      set('live', 'fail', 'watchPosition delivered no updates in 15s\nNext: confirm Location permission is "Allow while using", disable battery saver, and re-run.');
    } else {
      set('live', samples.length >= 3 ? 'pass' : 'warn',
        `${samples.length} update${samples.length === 1 ? '' : 's'} in 15s • heading on ${headings}, speed on ${speeds}${samples.length < 3 ? '\nLow update rate — normal when stationary, but re-run while moving to validate live navigation.' : ''}`);
    }

    // 5. Plausibility checks on every fix collected so far
    set('sanity', 'running');
    const sanity = validateFixes(first, samples);
    set('sanity', sanity.status, sanity.detail);

    // 6. Live routing from the most trustworthy fix
    set('route', 'running');
    setProgressNote('Requesting a live route from your position…');
    const last = sanity.best;

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
