import React, { useMemo } from 'react';
import { Clock, TrendingUp, MapPin, Sun, Moon, Cloud, Briefcase, Home, Coffee } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Trip } from '@/pages/TripHistory';

interface SmartSuggestionsProps {
  onSelect: (destination: string) => void;
  tripHistory: Trip[];
  compact?: boolean;
}

interface SmartSuggestion {
  label: string;
  destination: string;
  icon: React.ElementType;
  reason: string;
  color: string;
}

const SmartSuggestions: React.FC<SmartSuggestionsProps> = ({ onSelect, tripHistory, compact = true }) => {
  const suggestions = useMemo(() => {
    const hour = new Date().getHours();
    const results: SmartSuggestion[] = [];

    // Analyze trip patterns from history
    const destCounts: Record<string, { count: number; morningCount: number; eveningCount: number; dest: string }> = {};
    
    tripHistory.forEach(trip => {
      const tripHour = new Date(trip.date).getHours();
      const key = trip.destination.toLowerCase().trim();
      if (!destCounts[key]) {
        destCounts[key] = { count: 0, morningCount: 0, eveningCount: 0, dest: trip.destination };
      }
      destCounts[key].count++;
      if (tripHour >= 5 && tripHour < 12) destCounts[key].morningCount++;
      if (tripHour >= 16 && tripHour < 23) destCounts[key].eveningCount++;
    });

    const sorted = Object.values(destCounts).sort((a, b) => b.count - a.count);

    // Time-based smart suggestions
    if (hour >= 5 && hour < 11) {
      // Morning - suggest places user goes to in the morning
      const morningDest = sorted.find(d => d.morningCount >= 2);
      if (morningDest) {
        results.push({
          label: morningDest.dest,
          destination: morningDest.dest,
          icon: Briefcase,
          reason: `You usually go here mornings`,
          color: 'text-amber-500'
        });
      }
    } else if (hour >= 16 && hour < 22) {
      // Evening - suggest home/evening destinations
      const eveningDest = sorted.find(d => d.eveningCount >= 2);
      if (eveningDest) {
        results.push({
          label: eveningDest.dest,
          destination: eveningDest.dest,
          icon: Home,
          reason: `Your evening route`,
          color: 'text-indigo-500'
        });
      }
    }

    // Frequent routes (top 2 that aren't already added)
    const addedDests = new Set(results.map(r => r.destination.toLowerCase()));
    sorted
      .filter(d => d.count >= 2 && !addedDests.has(d.dest.toLowerCase()))
      .slice(0, 2)
      .forEach(d => {
        results.push({
          label: d.dest,
          destination: d.dest,
          icon: TrendingUp,
          reason: `${d.count} trips`,
          color: 'text-emerald-500'
        });
      });

    // Recent unique destinations (last 3) if not enough suggestions
    if (results.length < 3) {
      const recentDests = new Set<string>();
      tripHistory
        .slice(0, 10)
        .forEach(trip => {
          if (!addedDests.has(trip.destination.toLowerCase()) && !recentDests.has(trip.destination.toLowerCase())) {
            recentDests.add(trip.destination.toLowerCase());
            if (results.length < 4) {
              results.push({
                label: trip.destination,
                destination: trip.destination,
                icon: Clock,
                reason: 'Recent',
                color: 'text-muted-foreground'
              });
              addedDests.add(trip.destination.toLowerCase());
            }
          }
        });
    }

    return results.slice(0, 4);
  }, [tripHistory]);

  // Smart greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return { text: 'Good Morning! ☀️', icon: Sun };
    if (hour >= 12 && hour < 17) return { text: 'Good Afternoon! 🌤️', icon: Cloud };
    if (hour >= 17 && hour < 21) return { text: 'Good Evening! 🌅', icon: Coffee };
    return { text: 'Good Night! 🌙', icon: Moon };
  }, []);

  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-1">
      {!compact && (
        <p className="text-xs text-muted-foreground px-1 flex items-center gap-1">
          <greeting.icon className="w-3 h-3" />
          {greeting.text}
        </p>
      )}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onSelect(s.destination)}
            className="flex items-center gap-1.5 text-xs bg-background/80 backdrop-blur-sm rounded-full px-2.5 py-1.5 shadow-sm border border-border/30 hover:bg-muted transition-all whitespace-nowrap shrink-0 group"
            title={s.reason}
          >
            <s.icon className={cn("w-3 h-3", s.color)} />
            <span className="truncate max-w-[100px] text-foreground">{s.label}</span>
            <span className="text-[10px] text-muted-foreground/60 hidden group-hover:inline">{s.reason}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SmartSuggestions;
