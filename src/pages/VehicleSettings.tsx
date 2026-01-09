import React, { useState } from 'react';
import { Car, Plus, Trash2, Edit2, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface Vehicle {
  id: string;
  name: string;
  fuelType: 'petrol' | 'diesel' | 'cng' | 'electric';
  mileage: number;
  isDefault: boolean;
}

const VehicleSettings = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([
    { id: '1', name: 'My Car', fuelType: 'petrol', mileage: 15, isDefault: true },
  ]);
  const [isAdding, setIsAdding] = useState(false);
  const [newVehicle, setNewVehicle] = useState({ name: '', fuelType: 'petrol' as const, mileage: 15 });

  const handleAddVehicle = () => {
    if (newVehicle.name.trim()) {
      setVehicles([
        ...vehicles,
        {
          id: Date.now().toString(),
          ...newVehicle,
          isDefault: vehicles.length === 0,
        },
      ]);
      setNewVehicle({ name: '', fuelType: 'petrol', mileage: 15 });
      setIsAdding(false);
    }
  };

  const handleSetDefault = (id: string) => {
    setVehicles(vehicles.map(v => ({ ...v, isDefault: v.id === id })));
  };

  const handleDelete = (id: string) => {
    const remaining = vehicles.filter(v => v.id !== id);
    if (remaining.length > 0 && !remaining.some(v => v.isDefault)) {
      remaining[0].isDefault = true;
    }
    setVehicles(remaining);
  };

  const getFuelIcon = (type: string) => {
    switch (type) {
      case 'electric': return '⚡';
      case 'cng': return '🔵';
      case 'diesel': return '🟡';
      default: return '⛽';
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
          <Car className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vehicle Settings</h1>
          <p className="text-muted-foreground">Manage your vehicles for accurate cost calculations</p>
        </div>
      </div>

      {/* Vehicles List */}
      <div className="space-y-4">
        {vehicles.map((vehicle) => (
          <Card key={vehicle.id} className={vehicle.isDefault ? 'ring-2 ring-primary' : ''}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-2xl">
                    {getFuelIcon(vehicle.fuelType)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{vehicle.name}</h3>
                      {vehicle.isDefault && <Badge variant="secondary">Default</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {vehicle.fuelType.charAt(0).toUpperCase() + vehicle.fuelType.slice(1)} • {vehicle.mileage} km/L
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!vehicle.isDefault && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleSetDefault(vehicle.id)}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Set Default
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleDelete(vehicle.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Vehicle Form */}
      {isAdding ? (
        <Card>
          <CardHeader>
            <CardTitle>Add New Vehicle</CardTitle>
            <CardDescription>Enter your vehicle details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Vehicle Name</Label>
              <Input
                id="name"
                placeholder="e.g., Honda City"
                value={newVehicle.name}
                onChange={(e) => setNewVehicle({ ...newVehicle, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fuel-type">Fuel Type</Label>
                <Select 
                  value={newVehicle.fuelType} 
                  onValueChange={(v: any) => setNewVehicle({ ...newVehicle, fuelType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="petrol">Petrol</SelectItem>
                    <SelectItem value="diesel">Diesel</SelectItem>
                    <SelectItem value="cng">CNG</SelectItem>
                    <SelectItem value="electric">Electric</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mileage">Mileage (km/L)</Label>
                <Input
                  id="mileage"
                  type="number"
                  value={newVehicle.mileage}
                  onChange={(e) => setNewVehicle({ ...newVehicle, mileage: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleAddVehicle}>Add Vehicle</Button>
              <Button variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={() => setIsAdding(true)} className="w-full" variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          Add Vehicle
        </Button>
      )}
    </div>
  );
};

export default VehicleSettings;
