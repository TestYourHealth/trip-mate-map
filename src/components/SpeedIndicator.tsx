import React from 'react';
import { cn } from '@/lib/utils';

interface SpeedIndicatorProps {
  speed: number | null;
  maxSpeed?: number;
}

const SpeedIndicator: React.FC<SpeedIndicatorProps> = ({ speed, maxSpeed = 120 }) => {
  const currentSpeed = speed ? Math.round(speed * 3.6) : 0; // m/s to km/h
  const isOverSpeed = maxSpeed && currentSpeed > maxSpeed;
  const percentage = Math.min((currentSpeed / (maxSpeed || 120)) * 100, 100);
  
  return (
    <div className={cn(
      "w-16 h-16 rounded-full flex flex-col items-center justify-center",
      "glass-card border-2 transition-colors duration-300",
      isOverSpeed 
        ? "border-destructive/60 bg-destructive/5" 
        : "border-primary/30"
    )}>
      <span className={cn(
        "text-lg font-extrabold leading-none",
        isOverSpeed ? "text-destructive" : "text-foreground"
      )}>
        {currentSpeed}
      </span>
      <span className="text-[9px] font-medium text-muted-foreground leading-tight">km/h</span>
    </div>
  );
};

export default SpeedIndicator;
