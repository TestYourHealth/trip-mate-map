import React from 'react';
import { X, Volume2, VolumeX, Crosshair, ChevronUp, CornerUpLeft, CornerUpRight, ArrowUp, MapPin, MoveUp, MoveUpLeft, MoveUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NavigationStep } from './NavigationPanel';
import { cn } from '@/lib/utils';

// Lane guidance types
interface Lane {
  direction: 'left' | 'straight' | 'right' | 'slight-left' | 'slight-right';
  isRecommended: boolean;
}

// Function to get lane guidance based on turn type
const getLaneGuidance = (turnType: NavigationStep['type']): Lane[] => {
  switch (turnType) {
    case 'left':
      return [{
        direction: 'left',
        isRecommended: true
      }, {
        direction: 'straight',
        isRecommended: false
      }, {
        direction: 'straight',
        isRecommended: false
      }];
    case 'right':
      return [{
        direction: 'straight',
        isRecommended: false
      }, {
        direction: 'straight',
        isRecommended: false
      }, {
        direction: 'right',
        isRecommended: true
      }];
    case 'slight-left':
      return [{
        direction: 'slight-left',
        isRecommended: true
      }, {
        direction: 'straight',
        isRecommended: true
      }, {
        direction: 'straight',
        isRecommended: false
      }];
    case 'slight-right':
      return [{
        direction: 'straight',
        isRecommended: false
      }, {
        direction: 'straight',
        isRecommended: true
      }, {
        direction: 'slight-right',
        isRecommended: true
      }];
    case 'straight':
      return [{
        direction: 'straight',
        isRecommended: false
      }, {
        direction: 'straight',
        isRecommended: true
      }, {
        direction: 'straight',
        isRecommended: false
      }];
    default:
      return [];
  }
};

// Lane arrow component
const LaneArrow: React.FC<{
  lane: Lane;
}> = ({
  lane
}) => {
  const iconClass = cn("w-6 h-6 transition-all", lane.isRecommended ? "text-primary" : "text-muted-foreground/40");
  const getArrowIcon = () => {
    switch (lane.direction) {
      case 'left':
        return <MoveUpLeft className={iconClass} />;
      case 'right':
        return <MoveUpRight className={iconClass} />;
      case 'slight-left':
        return <MoveUp className={cn(iconClass, "rotate-[-20deg]")} />;
      case 'slight-right':
        return <MoveUp className={cn(iconClass, "rotate-[20deg]")} />;
      default:
        return <MoveUp className={iconClass} />;
    }
  };
  return <div className={cn("flex flex-col items-center justify-center px-2 py-1 rounded-md border-2 transition-all", lane.isRecommended ? "border-primary bg-primary/20" : "border-muted-foreground/20 bg-muted/10")}>
      {getArrowIcon()}
    </div>;
};

// Lane Guidance Display Component
const LaneGuidance: React.FC<{
  turnType: NavigationStep['type'];
}> = ({
  turnType
}) => {
  const lanes = getLaneGuidance(turnType);
  if (lanes.length === 0) return null;
  return <div className="flex items-center justify-center gap-1 py-2 px-3 bg-background/90 backdrop-blur rounded-lg">
      <span className="text-xs text-muted-foreground mr-2 font-medium">Lane</span>
      <div className="flex gap-1">
        {lanes.map((lane, index) => <LaneArrow key={index} lane={lane} />)}
      </div>
    </div>;
};
interface DriverNavigationViewProps {
  steps: NavigationStep[];
  currentStepIndex: number;
  remainingDistance: number;
  estimatedTime: number;
  speed: number | null;
  isMuted: boolean;
  onClose: () => void;
  onToggleMute: () => void;
  onCenterUser: () => void;
}
const DriverNavigationView = React.forwardRef<HTMLDivElement, DriverNavigationViewProps>(({
  steps,
  currentStepIndex,
  remainingDistance,
  estimatedTime,
  speed,
  isMuted,
  onClose,
  onToggleMute,
  onCenterUser
}, ref) => {
  const currentStep = steps[currentStepIndex];
  const nextStep = steps[currentStepIndex + 1];
  const getDirectionIcon = (type: NavigationStep['type']) => {
    const iconClass = "w-16 h-16 text-white";
    switch (type) {
      case 'left':
        return <CornerUpLeft className={iconClass} />;
      case 'right':
        return <CornerUpRight className={iconClass} />;
      case 'slight-left':
        return <ChevronUp className={cn(iconClass, "rotate-[-30deg]")} />;
      case 'slight-right':
        return <ChevronUp className={cn(iconClass, "rotate-[30deg]")} />;
      case 'destination':
        return <MapPin className={iconClass} />;
      default:
        return <ArrowUp className={iconClass} />;
    }
  };
  const formatDistance = (meters: number) => {
    if (!meters || meters < 0 || !isFinite(meters)) return '0 m';
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };
  const formatTime = (hours: number) => {
    if (!hours || hours < 0 || !isFinite(hours)) return '0 min';
    const mins = Math.round(hours * 60);
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };
  const getETA = () => {
    const now = new Date();
    const eta = new Date(now.getTime() + estimatedTime * 60 * 60 * 1000);
    return eta.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  if (!currentStep) return null;
  return <div className="fixed inset-0 z-[1000] pointer-events-none">
      {/* Top Navigation Card - Current Direction */}
      <div className="absolute top-0 left-0 right-0 pointer-events-auto">
        <div className="bg-primary m-2 rounded-xl shadow-2xl overflow-hidden">
          {/* Main Direction - Compact */}
          <div className="p-2.5 flex items-center gap-3">
            <div className="shrink-0 scale-90">
              {getDirectionIcon(currentStep.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-white">
                  {formatDistance(currentStep.distance)}
                </p>
                <p className="text-white/90 text-sm font-medium truncate">
                  {currentStep.instruction}
                </p>
              </div>
            </div>
          </div>

          {/* Lane Guidance - Compact */}
          {currentStep.distance < 500 && currentStep.type !== 'destination' && currentStep.type !== 'start' && <div className="px-2.5 pb-2 flex justify-center">
              <LaneGuidance turnType={currentStep.type} />
            </div>}

          {/* Next Turn Preview - Inline */}
          {nextStep && <div className="bg-primary-foreground/10 px-2.5 py-1.5 flex items-center gap-2 border-t border-white/20">
              <span className="text-white/70 text-xs">Then</span>
              <div className="w-5 h-5 flex items-center justify-center [&>svg]:w-4 [&>svg]:h-4">
                {getDirectionIcon(nextStep.type)}
              </div>
              <span className="text-white text-xs font-medium truncate flex-1">
                {nextStep.instruction}
              </span>
            </div>}
        </div>

        {/* Control Buttons Row */}
        <div className="flex justify-between px-3 mt-2">
          <Button variant="outline" size="icon" onClick={onClose} className="bg-background/95 backdrop-blur shadow-lg h-12 w-12">
            <X className="w-5 h-5" />
          </Button>
          
          <Button variant="outline" size="icon" onClick={onToggleMute} className="bg-background/95 backdrop-blur shadow-lg h-12 w-12">
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Speed Indicator - Left Side */}
      <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-auto">
        <div className="bg-background/95 backdrop-blur rounded-xl shadow-lg p-2 text-center min-w-[56px]">
          <p className="text-xl font-bold text-foreground leading-tight">
            {speed && speed > 0 ? Math.round(speed * 3.6) : '0'}
          </p>
          <p className="text-[9px] text-muted-foreground">km/h</p>
        </div>
      </div>

      {/* Center Button - Right Side */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-auto">
        <Button variant="outline" size="icon" onClick={onCenterUser} className="bg-background/95 backdrop-blur shadow-lg h-10 w-10">
          <Crosshair className="w-4 h-4" />
        </Button>
      </div>

      {/* Bottom Stats Bar - Compact */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-auto safe-area-bottom">
        <div className="bg-background/95 backdrop-blur mx-2 mb-2 rounded-xl shadow-xl">
          <div className="flex items-center justify-around py-2 px-1">
            {/* ETA */}
            <div className="text-center flex-1">
              <p className="text-lg font-bold text-primary">{getETA()}</p>
              <p className="text-[10px] text-muted-foreground">ETA</p>
            </div>

            <div className="w-px h-6 bg-border" />

            {/* Remaining Distance */}
            <div className="text-center flex-1">
              <p className="text-lg font-bold text-foreground">
                {remainingDistance >= 1 ? `${remainingDistance.toFixed(1)} km` : `${Math.round(remainingDistance * 1000)} m`}
              </p>
              <p className="text-[10px] text-muted-foreground">Distance</p>
            </div>

            <div className="w-px h-6 bg-border" />

            {/* Remaining Time */}
            <div className="text-center flex-1">
              <p className="text-lg font-bold text-foreground">{formatTime(estimatedTime)}</p>
              <p className="text-[10px] text-muted-foreground">Time</p>
            </div>
          </div>

          {/* Progress Bar - Compact */}
          <div className="px-3 pb-2">
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-500" style={{
              width: `${(currentStepIndex + 1) / steps.length * 100}%`
            }} />
            </div>
          </div>
        </div>
      </div>
    </div>;
});

DriverNavigationView.displayName = 'DriverNavigationView';
export default DriverNavigationView;