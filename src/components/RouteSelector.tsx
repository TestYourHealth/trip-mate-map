import React from 'react';
import { Route, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RouteInfo } from './Map';

interface RouteSelectorProps {
  routes: RouteInfo[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

const RouteSelector: React.FC<RouteSelectorProps> = ({ routes, selectedIndex, onSelect }) => {
  if (routes.length <= 1) return null;

  const getTrafficIcon = (level: 'low' | 'moderate' | 'heavy') => {
    switch (level) {
      case 'low':
        return <CheckCircle className="w-3.5 h-3.5 text-green-500" />;
      case 'moderate':
        return <Clock className="w-3.5 h-3.5 text-amber-500" />;
      case 'heavy':
        return <AlertTriangle className="w-3.5 h-3.5 text-red-500" />;
    }
  };

  const getTrafficLabel = (level: 'low' | 'moderate' | 'heavy') => {
    switch (level) {
      case 'low':
        return 'Light Traffic';
      case 'moderate':
        return 'Moderate Traffic';
      case 'heavy':
        return 'Heavy Traffic';
    }
  };

  const getTrafficColor = (level: 'low' | 'moderate' | 'heavy') => {
    switch (level) {
      case 'low':
        return 'border-green-500/50 bg-green-500/10';
      case 'moderate':
        return 'border-amber-500/50 bg-amber-500/10';
      case 'heavy':
        return 'border-red-500/50 bg-red-500/10';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        <Route className="w-3.5 h-3.5" />
        <span className="text-xs font-medium">Route Options ({routes.length} found)</span>
      </div>
      
      <div className="space-y-2">
        {routes.map((route, index) => (
          <button
            key={index}
            onClick={() => onSelect(index)}
            aria-pressed={selectedIndex === index}
            aria-label={`${route.name}, ${route.distance} km, ${route.duration} hours, ${getTrafficLabel(route.trafficLevel)}`}
            className={cn(
              "w-full p-3 rounded-xl border-2 transition-all duration-200 text-left",
              selectedIndex === index
                ? `${getTrafficColor(route.trafficLevel)} ring-2 ring-primary/30`
                : "border-border/50 bg-muted/20 hover:bg-muted/40"
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={cn(
                "text-sm font-semibold",
                selectedIndex === index ? "text-foreground" : "text-muted-foreground"
              )}>
                {route.name}
              </span>
              {selectedIndex === index && (
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                  Selected
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-4 text-sm">
              <span className="text-foreground font-medium">{route.distance} km</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-foreground">{route.duration} hrs</span>
            </div>
            
            <div className="flex items-center gap-1.5 mt-2">
              {getTrafficIcon(route.trafficLevel)}
              <span className={cn(
                "text-xs",
                route.trafficLevel === 'low' ? 'text-green-500' :
                route.trafficLevel === 'moderate' ? 'text-amber-500' : 'text-red-500'
              )}>
                {getTrafficLabel(route.trafficLevel)}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default RouteSelector;
