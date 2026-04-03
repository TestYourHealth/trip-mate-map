import React, { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, Wind, Droplets, Eye, Thermometer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WeatherData {
  temp: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  visibility: number;
  description: string;
}

interface WeatherWidgetProps {
  lat?: number;
  lng?: number;
  compact?: boolean;
}

const getWeatherIcon = (condition: string) => {
  const c = condition.toLowerCase();
  if (c.includes('thunder') || c.includes('storm')) return CloudLightning;
  if (c.includes('rain') || c.includes('drizzle')) return CloudRain;
  if (c.includes('snow') || c.includes('sleet')) return CloudSnow;
  if (c.includes('cloud') || c.includes('overcast') || c.includes('fog') || c.includes('mist')) return Cloud;
  return Sun;
};

const getWeatherGradient = (condition: string) => {
  const c = condition.toLowerCase();
  if (c.includes('thunder')) return 'from-purple-500/20 to-gray-500/20';
  if (c.includes('rain')) return 'from-blue-500/20 to-slate-500/20';
  if (c.includes('snow')) return 'from-sky-300/20 to-white/10';
  if (c.includes('cloud')) return 'from-slate-400/15 to-slate-300/10';
  return 'from-amber-400/15 to-orange-300/10';
};

// Simulated weather based on time of day and randomness
const getSimulatedWeather = (): WeatherData => {
  const hour = new Date().getHours();
  const isNight = hour < 6 || hour > 20;
  const isMorning = hour >= 6 && hour < 12;
  
  const conditions = ['Clear Sky', 'Partly Cloudy', 'Cloudy', 'Light Rain', 'Hazy'];
  const weights = isNight ? [40, 30, 20, 5, 5] : isMorning ? [50, 25, 10, 10, 5] : [35, 30, 15, 15, 5];
  
  let rand = Math.random() * 100;
  let conditionIndex = 0;
  for (let i = 0; i < weights.length; i++) {
    rand -= weights[i];
    if (rand <= 0) { conditionIndex = i; break; }
  }
  
  const baseTemp = isNight ? 22 : isMorning ? 28 : 34;
  const tempVariation = Math.floor(Math.random() * 6) - 3;
  
  return {
    temp: baseTemp + tempVariation,
    condition: conditions[conditionIndex],
    humidity: 40 + Math.floor(Math.random() * 35),
    windSpeed: 5 + Math.floor(Math.random() * 20),
    visibility: 5 + Math.floor(Math.random() * 10),
    description: conditions[conditionIndex],
  };
};

const WeatherWidget: React.FC<WeatherWidgetProps> = ({ lat, lng, compact = false }) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    // Use simulated weather (no API key needed)
    const timer = setTimeout(() => {
      setWeather(getSimulatedWeather());
    }, 800);
    return () => clearTimeout(timer);
  }, [lat, lng]);

  if (!weather) return null;

  const WeatherIcon = getWeatherIcon(weather.condition);
  const gradient = getWeatherGradient(weather.condition);

  if (compact) {
    return (
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
          "bg-gradient-to-r", gradient,
          "border border-border/40 backdrop-blur-sm shadow-sm",
          "transition-all duration-200 hover:scale-105"
        )}
      >
        <WeatherIcon className="w-3.5 h-3.5 text-foreground/70" />
        <span className="text-foreground/80">{weather.temp}°C</span>
        {expanded && (
          <span className="text-muted-foreground animate-fade-in">
            {weather.condition}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className={cn(
      "glass-card rounded-2xl p-4 animate-scale-in",
      "bg-gradient-to-br", gradient
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <WeatherIcon className="w-6 h-6 text-foreground/70" />
          <div>
            <p className="text-2xl font-bold text-foreground">{weather.temp}°C</p>
            <p className="text-xs text-muted-foreground">{weather.description}</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Droplets className="w-3 h-3" />
          <span>{weather.humidity}%</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Wind className="w-3 h-3" />
          <span>{weather.windSpeed} km/h</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Eye className="w-3 h-3" />
          <span>{weather.visibility} km</span>
        </div>
      </div>
    </div>
  );
};

export default WeatherWidget;
