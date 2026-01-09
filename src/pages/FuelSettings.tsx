import React, { useState } from 'react';
import { Fuel, TrendingUp, MapPin, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const FuelSettings = () => {
  const [fuelPrices, setFuelPrices] = useState({
    petrol: 105,
    diesel: 92,
    cng: 75,
  });

  const [lastUpdated] = useState(new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }));

  const handlePriceChange = (type: keyof typeof fuelPrices, value: number) => {
    setFuelPrices({ ...fuelPrices, [type]: value });
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
          <Fuel className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Fuel Prices</h1>
          <p className="text-muted-foreground">Set current fuel prices for accurate cost estimates</p>
        </div>
      </div>

      {/* Current Prices */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Fuel Prices</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <MapPin className="w-3 h-3" />
                India Average
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              Updated: {lastUpdated}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Petrol */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center text-2xl">
              ⛽
            </div>
            <div className="flex-1">
              <Label htmlFor="petrol" className="text-base font-medium">Petrol</Label>
              <p className="text-xs text-muted-foreground">Regular unleaded</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">₹</span>
              <Input
                id="petrol"
                type="number"
                value={fuelPrices.petrol}
                onChange={(e) => handlePriceChange('petrol', Number(e.target.value))}
                className="w-24 text-right"
              />
              <span className="text-muted-foreground text-sm">/L</span>
            </div>
          </div>

          {/* Diesel */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-yellow-500/20 flex items-center justify-center text-2xl">
              🟡
            </div>
            <div className="flex-1">
              <Label htmlFor="diesel" className="text-base font-medium">Diesel</Label>
              <p className="text-xs text-muted-foreground">High-speed diesel</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">₹</span>
              <Input
                id="diesel"
                type="number"
                value={fuelPrices.diesel}
                onChange={(e) => handlePriceChange('diesel', Number(e.target.value))}
                className="w-24 text-right"
              />
              <span className="text-muted-foreground text-sm">/L</span>
            </div>
          </div>

          {/* CNG */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center text-2xl">
              🔵
            </div>
            <div className="flex-1">
              <Label htmlFor="cng" className="text-base font-medium">CNG</Label>
              <p className="text-xs text-muted-foreground">Compressed natural gas</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">₹</span>
              <Input
                id="cng"
                type="number"
                value={fuelPrices.cng}
                onChange={(e) => handlePriceChange('cng', Number(e.target.value))}
                className="w-24 text-right"
              />
              <span className="text-muted-foreground text-sm">/kg</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Price Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Price Trends
          </CardTitle>
          <CardDescription>Recent fuel price changes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm">Petrol</span>
              <Badge variant="destructive" className="text-xs">+₹2.50 this week</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm">Diesel</span>
              <Badge variant="secondary" className="text-xs">No change</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm">CNG</span>
              <Badge className="text-xs bg-green-500/20 text-green-500 hover:bg-green-500/30">-₹1.00 this week</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button variant="outline" className="w-full">
        <RefreshCw className="w-4 h-4 mr-2" />
        Fetch Latest Prices
      </Button>
    </div>
  );
};

export default FuelSettings;
