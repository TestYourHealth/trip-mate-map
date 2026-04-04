import React from 'react';
import { 
  ArrowUp, 
  ArrowLeft, 
  ArrowRight, 
  CornerUpLeft,
  CornerUpRight,
  Milestone,
  Flag,
  ListOrdered
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NavigationStep } from './NavigationPanel';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DirectionsListProps {
  steps: NavigationStep[];
  currentStepIndex: number;
  onStepClick?: (index: number) => void;
}

const DirectionsList = React.forwardRef<HTMLDivElement, DirectionsListProps>(({
  steps,
  currentStepIndex,
  onStepClick
}, ref) => {
  if (steps.length === 0) return null;

  const getDirectionIcon = (type: NavigationStep['type']) => {
    const iconClass = 'w-4 h-4';
    switch (type) {
      case 'left':
        return <ArrowLeft className={iconClass} />;
      case 'right':
        return <ArrowRight className={iconClass} />;
      case 'slight-left':
        return <CornerUpLeft className={iconClass} />;
      case 'slight-right':
        return <CornerUpRight className={iconClass} />;
      case 'destination':
        return <Flag className={iconClass} />;
      case 'start':
        return <Milestone className={iconClass} />;
      default:
        return <ArrowUp className={iconClass} />;
    }
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-muted-foreground mb-3">
        <ListOrdered className="w-4 h-4" />
        <span className="text-sm font-medium">Turn-by-turn Directions</span>
      </div>
      
      <ScrollArea className="h-48 pr-2" tabIndex={-1}>
        <div className="space-y-2">
          {steps.map((step, index) => (
            <button
              key={index}
              onClick={() => onStepClick?.(index)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200",
                index === currentStepIndex
                  ? "bg-primary/20 border border-primary/50"
                  : index < currentStepIndex
                    ? "bg-muted/30 opacity-60"
                    : "bg-muted/20 hover:bg-muted/40"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                index === currentStepIndex ? "bg-primary text-primary-foreground" :
                step.type === 'destination' ? "bg-red-500/20 text-red-500" :
                step.type === 'start' ? "bg-green-500/20 text-green-500" :
                "bg-muted text-muted-foreground"
              )}>
                {getDirectionIcon(step.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm font-medium line-clamp-2",
                  index === currentStepIndex ? "text-foreground" : "text-muted-foreground"
                )}>
                  {step.instruction}
                </p>
              </div>
              
              <span className={cn(
                "text-xs font-medium shrink-0",
                index === currentStepIndex ? "text-primary" : "text-muted-foreground"
              )}>
                {formatDistance(step.distance)}
              </span>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
});

DirectionsList.displayName = 'DirectionsList';

export default DirectionsList;
