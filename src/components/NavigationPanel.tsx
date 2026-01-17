import React from 'react';
import { 
  Navigation, 
  ArrowUp, 
  ArrowLeft, 
  ArrowRight, 
  CornerUpLeft,
  CornerUpRight,
  Milestone,
  Flag,
  X,
  Volume2,
  VolumeX
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface NavigationStep {
  instruction: string;
  distance: number;
  type: 'straight' | 'left' | 'right' | 'slight-left' | 'slight-right' | 'destination' | 'start';
}

interface NavigationPanelProps {
  steps: NavigationStep[];
  currentStepIndex: number;
  totalDistance: number;
  remainingDistance: number;
  estimatedTime: number;
  isActive: boolean;
  isMuted: boolean;
  onClose: () => void;
  onToggleMute: () => void;
}

const NavigationPanel: React.FC<NavigationPanelProps> = ({
  steps,
  currentStepIndex,
  totalDistance,
  remainingDistance,
  estimatedTime,
  isActive,
  isMuted,
  onClose,
  onToggleMute
}) => {
  if (!isActive || steps.length === 0) return null;

  const currentStep = steps[currentStepIndex];
  const nextStep = steps[currentStepIndex + 1];

  const getDirectionIcon = (type: NavigationStep['type'], size: 'sm' | 'lg' = 'lg') => {
    const sizeClass = size === 'lg' ? 'w-8 h-8' : 'w-4 h-4';
    switch (type) {
      case 'left':
        return <ArrowLeft className={cn(sizeClass, 'text-primary')} />;
      case 'right':
        return <ArrowRight className={cn(sizeClass, 'text-primary')} />;
      case 'slight-left':
        return <CornerUpLeft className={cn(sizeClass, 'text-primary')} />;
      case 'slight-right':
        return <CornerUpRight className={cn(sizeClass, 'text-primary')} />;
      case 'destination':
        return <Flag className={cn(sizeClass, 'text-red-500')} />;
      case 'start':
        return <Milestone className={cn(sizeClass, 'text-green-500')} />;
      default:
        return <ArrowUp className={cn(sizeClass, 'text-primary')} />;
    }
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const formatTime = (hours: number) => {
    const totalMinutes = Math.round(hours * 60);
    if (totalMinutes < 60) {
      return `${totalMinutes} min`;
    }
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}h ${m}m`;
  };

  return (
    <div className="fixed inset-x-0 top-0 z-50 animate-slide-down">
      {/* Current Direction - Hero Section */}
      <div className="bg-primary text-primary-foreground p-4 safe-area-top">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Navigation className="w-5 h-5" />
            <span className="font-semibold">Navigation Active</span>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon-sm" 
              onClick={onToggleMute}
              className="text-primary-foreground hover:bg-primary-foreground/20"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
            <Button 
              variant="ghost" 
              size="icon-sm" 
              onClick={onClose}
              className="text-primary-foreground hover:bg-primary-foreground/20"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary-foreground/20 flex items-center justify-center">
            {getDirectionIcon(currentStep.type)}
          </div>
          <div className="flex-1">
            <p className="text-2xl font-bold mb-1">{formatDistance(currentStep.distance)}</p>
            <p className="text-sm opacity-90 line-clamp-2">{currentStep.instruction}</p>
          </div>
        </div>
      </div>

      {/* Next Step Preview */}
      {nextStep && (
        <div className="bg-background border shadow-md mx-4 -mt-2 rounded-xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
            {getDirectionIcon(nextStep.type, 'sm')}
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Then</p>
            <p className="text-sm font-medium text-foreground line-clamp-1">{nextStep.instruction}</p>
          </div>
          <span className="text-sm text-muted-foreground">{formatDistance(nextStep.distance)}</span>
        </div>
      )}

      {/* Bottom Stats Bar */}
      <div className="bg-background border shadow-md mx-4 mt-3 rounded-xl p-3 flex items-center justify-around">
        <div className="text-center">
          <p className="text-lg font-bold text-foreground">{formatTime(estimatedTime)}</p>
          <p className="text-xs text-muted-foreground">ETA</p>
        </div>
        <div className="w-px h-8 bg-border" />
        <div className="text-center">
          <p className="text-lg font-bold text-foreground">{formatDistance(remainingDistance * 1000)}</p>
          <p className="text-xs text-muted-foreground">Remaining</p>
        </div>
        <div className="w-px h-8 bg-border" />
        <div className="text-center">
          <p className="text-lg font-bold text-primary">{currentStepIndex + 1}/{steps.length}</p>
          <p className="text-xs text-muted-foreground">Steps</p>
        </div>
      </div>
    </div>
  );
};

export default NavigationPanel;
