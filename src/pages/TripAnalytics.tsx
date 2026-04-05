import React, { useMemo } from 'react';
import { BarChart3, TrendingUp, MapPin, Fuel, Calendar, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Trip } from './TripHistory';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area } from 'recharts';

const TripAnalytics = () => {
  const [trips] = useLocalStorage<Trip[]>('tripHistory', []);

  const stats = useMemo(() => {
    if (!trips.length) return null;
    const totalDistance = trips.reduce((s, t) => s + t.distance, 0);
    const totalCost = trips.reduce((s, t) => s + t.cost, 0);
    const totalDuration = trips.reduce((s, t) => s + t.duration, 0);
    return {
      totalTrips: trips.length,
      totalDistance: Math.round(totalDistance),
      totalCost: Math.round(totalCost),
      totalDuration: Math.round(totalDuration * 10) / 10,
      avgCostPerTrip: Math.round(totalCost / trips.length),
      avgDistance: Math.round(totalDistance / trips.length),
    };
  }, [trips]);

  const monthlyData = useMemo(() => {
    const months: Record<string, { month: string; spending: number; trips: number; distance: number }> = {};
    trips.forEach(t => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      if (!months[key]) months[key] = { month: label, spending: 0, trips: 0, distance: 0 };
      months[key].spending += t.cost;
      months[key].trips += 1;
      months[key].distance += t.distance;
    });
    return Object.values(months).slice(-6);
  }, [trips]);

  const frequentRoutes = useMemo(() => {
    const routes: Record<string, { origin: string; destination: string; count: number; totalCost: number }> = {};
    trips.forEach(t => {
      const key = `${t.origin.split(',')[0]}→${t.destination.split(',')[0]}`;
      if (!routes[key]) routes[key] = { origin: t.origin.split(',')[0], destination: t.destination.split(',')[0], count: 0, totalCost: 0 };
      routes[key].count++;
      routes[key].totalCost += t.cost;
    });
    return Object.values(routes).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [trips]);

  const weeklyActivity = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const counts = new Array(7).fill(0);
    trips.forEach(t => { counts[new Date(t.date).getDay()]++; });
    return days.map((day, i) => ({ day, trips: counts[i] }));
  }, [trips]);

  const chartConfig = {
    spending: { label: 'Spending (₹)', color: 'hsl(var(--primary))' },
    trips: { label: 'Trips', color: 'hsl(var(--primary))' },
    distance: { label: 'Distance (km)', color: 'hsl(142 76% 36%)' },
  };

  const pieColors = ['hsl(var(--primary))', 'hsl(142 76% 36%)', 'hsl(45 93% 47%)', 'hsl(0 84% 60%)', 'hsl(262 83% 58%)'];

  if (!stats) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Trip Analytics</h1>
            <p className="text-muted-foreground">Insights from your travel data</p>
          </div>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">No data yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              Complete some trips to see your analytics and spending patterns
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <BarChart3 className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Trip Analytics</h1>
          <p className="text-muted-foreground">{stats.totalTrips} trips analyzed</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Trips', value: stats.totalTrips, icon: Calendar, color: 'text-primary' },
          { label: 'Total Distance', value: `${stats.totalDistance} km`, icon: MapPin, color: 'text-green-500' },
          { label: 'Total Spent', value: `₹${stats.totalCost}`, icon: Fuel, color: 'text-amber-500' },
          { label: 'Avg Cost/Trip', value: `₹${stats.avgCostPerTrip}`, icon: TrendingUp, color: 'text-blue-500' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly Spending Chart */}
      {monthlyData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Monthly Spending</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="spending" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Weekly Activity */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Weekly Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[200px] w-full">
            <AreaChart data={weeklyActivity}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="day" className="text-xs" />
              <YAxis className="text-xs" allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area type="monotone" dataKey="trips" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Frequent Routes */}
      {frequentRoutes.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Frequent Routes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {frequentRoutes.map((route, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                    {i + 1}
                  </div>
                  <span className="font-medium text-foreground">{route.origin}</span>
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  <span className="font-medium text-foreground">{route.destination}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-primary">₹{Math.round(route.totalCost)}</p>
                  <p className="text-xs text-muted-foreground">{route.count} trips</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TripAnalytics;
