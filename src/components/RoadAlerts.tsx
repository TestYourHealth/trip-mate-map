import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Gauge, School, MergeType, Construction, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NavigationStep } from './NavigationPanel';

export type AlertType = 'speed-warning' | 'sharp-turn' | 'school-zone' | 'highway-merge' | 'speed-limit';

interface RoadAlert {
  id: string;
  type: AlertType;
  message: string;
  severity: 'warning' | 'danger' | 'info';
  timestamp: number;
}

interface RoadAlertsProps {
  steps: NavigationStep[];
  currentStepIndex: number;
  speed: number | null;
  isActive: boolean;
}

const ALERT_DURATION = 5000;

const getAlertIcon = (type: AlertType) => {
  switch (type) {
    case 'speed-warning': return <Gauge className="w-5 h-5" />;
    case 'sharp-turn': return <AlertTriangle className="w-5 h-5" />;
    case 'school-zone': return <School className="w-5 h-5" />;
    case 'highway-merge': return <MergeType className="w-5 h-5" />;
    case 'speed-limit': return <Construction className="w-5 h-5" />;
  }
};

const getSeverityStyles = (severity: RoadAlert['severity']) => {
  switch (severity) {
    case 'danger': return 'bg-red-500/95 text-white border-red-400';
    case 'warning': return 'bg-amber-500/95 text-white border-amber-400';
    case 'info': return 'bg-blue-500/95 text-white border-blue-400';
  }
};

const RoadAlerts: React.FC<RoadAlertsProps> = ({ steps, currentStepIndex, speed, isActive }) => {
  const [alerts, setAlerts] = useState<RoadAlert[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const addAlert = useCallback((alert: Omit<RoadAlert, 'id' | 'timestamp'>) => {
    const id = `${alert.type}-${Date.now()}`;
    setAlerts(prev => {
      // Don't add duplicate type alerts within 10 seconds
      if (prev.some(a => a.type === alert.type && Date.now() - a.timestamp < 10000)) return prev;
      return [...prev, { ...alert, id, timestamp: Date.now() }];
    });
  }, []);

  // Auto-dismiss alerts
  useEffect(() => {
    const timer = setInterval(() => {
      setAlerts(prev => prev.filter(a => Date.now() - a.timestamp < ALERT_DURATION));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Speed warning detection
  useEffect(() => {
    if (!isActive || !speed) return;
    const speedKmh = speed * 3.6;
    if (speedKmh > 120) {
      addAlert({ type: 'speed-warning', message: `⚠️ High Speed: ${Math.round(speedKmh)} km/h - Slow down!`, severity: 'danger' });
    } else if (speedKmh > 80) {
      addAlert({ type: 'speed-limit', message: `Speed: ${Math.round(speedKmh)} km/h - Urban speed limit may be 60-80`, severity: 'warning' });
    }
  }, [speed, isActive, addAlert]);

  // Sharp turn detection
  useEffect(() => {
    if (!isActive || !steps.length) return;
    const upcoming = steps.slice(currentStepIndex, currentStepIndex + 3);
    
    for (const step of upcoming) {
      if (step.distance < 300) {
        if (step.type === 'left' || step.type === 'right') {
          const nextIdx = steps.indexOf(step) + 1;
          const nextStep = steps[nextIdx];
          if (nextStep && (nextStep.type === 'left' || nextStep.type === 'right') && nextStep.type !== step.type) {
            addAlert({ type: 'sharp-turn', message: `Sharp ${step.type} turn ahead - Slow down!`, severity: 'warning' });
          }
        }
      }
    }
  }, [currentStepIndex, steps, isActive, addAlert]);

  // School zone detection (time-based simulation)
  useEffect(() => {
    if (!isActive) return;
    const hour = new Date().getHours();
    const isSchoolTime = (hour >= 7 && hour <= 9) || (hour >= 14 && hour <= 16);
    if (isSchoolTime && currentStepIndex % 5 === 0) {
      addAlert({ type: 'school-zone', message: 'School Zone Nearby - Speed limit 30 km/h', severity: 'info' });
    }
  }, [currentStepIndex, isActive, addAlert]);

  const visibleAlerts = alerts.filter(a => !dismissedIds.has(a.id));

  if (!isActive || visibleAlerts.length === 0) return null;

  return (
    <div className="absolute top-[140px] left-2 right-2 z-[1001] space-y-2 pointer-events-auto">
      {visibleAlerts.map((alert) => (
        <div
          key={alert.id}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm animate-slide-up",
            getSeverityStyles(alert.severity)
          )}
          onClick={() => setDismissedIds(prev => new Set(prev).add(alert.id))}
        >
          {getAlertIcon(alert.type)}
          <p className="flex-1 text-sm font-medium">{alert.message}</p>
          <ChevronRight className="w-4 h-4 opacity-50" />
        </div>
      ))}
    </div>
  );
};

export default RoadAlerts;
