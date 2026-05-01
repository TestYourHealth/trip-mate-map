import React, { useState, useEffect, useRef } from 'react';
import { Search, Navigation, Fuel, Users, MapPin, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { cn } from '@/lib/utils';

interface TourStep {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    icon: Search,
    title: 'Search Destination',
    description: 'Top bar me destination search karo ya voice button se bolkar search karo',
    color: 'bg-blue-500',
  },
  {
    icon: Navigation,
    title: 'Get Directions',
    description: 'Route calculate hoga with multiple options - fastest aur alternate routes',
    color: 'bg-green-500',
  },
  {
    icon: Fuel,
    title: 'Cost Breakdown',
    description: 'Fuel cost, toll charges aur total trip cost automatically calculate hoti hai',
    color: 'bg-amber-500',
  },
  {
    icon: Users,
    title: 'Split the Bill',
    description: 'Friends ke saath travel? Bill Splitter se per-person share nikalo aur WhatsApp pe share karo',
    color: 'bg-purple-500',
  },
  {
    icon: MapPin,
    title: 'Save Favorites',
    description: 'Home, Office ya frequent places save karo for quick access',
    color: 'bg-pink-500',
  },
];

const OnboardingTour: React.FC = () => {
  const [hasSeenTour, setHasSeenTour] = useLocalStorage('hasSeenOnboardingTour', false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isDismissing, setIsDismissing] = useState(false);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup any pending dismiss timer on unmount to avoid setState on unmounted component
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, []);

  if (hasSeenTour) return null;

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleDismiss();
    }
  };

  const handleDismiss = () => {
    setIsDismissing(true);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => {
      setHasSeenTour(true);
    }, 300);
  };

  const step = TOUR_STEPS[currentStep];
  const Icon = step.icon;
  const isLast = currentStep === TOUR_STEPS.length - 1;

  return (
    <div className={cn(
      "fixed inset-0 z-[500] flex items-end sm:items-center justify-center transition-all duration-300",
      isDismissing ? "opacity-0 pointer-events-none" : "opacity-100"
    )}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleDismiss} />

      {/* Card */}
      <div className={cn(
        "relative z-10 bg-background rounded-t-3xl sm:rounded-2xl w-full sm:max-w-sm mx-auto p-6 shadow-xl transition-all duration-300",
        isDismissing ? "translate-y-full sm:scale-95" : "translate-y-0 sm:scale-100"
      )}>
        {/* Close */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Progress */}
        <div className="flex gap-1.5 mb-6">
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-all duration-300",
                i <= currentStep ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>

        {/* Icon */}
        <div className={cn(
          "w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300",
          step.color
        )}>
          <Icon className="w-8 h-8 text-white" />
        </div>

        {/* Content */}
        <h2 className="text-xl font-bold text-foreground mb-2">{step.title}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">{step.description}</p>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleDismiss}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip
          </button>
          <Button onClick={handleNext} className="gap-1.5">
            {isLast ? 'Get Started' : 'Next'}
            {!isLast && <ChevronRight className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;
