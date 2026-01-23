import { useState } from 'react';
import { Car, Plus, Trash2, Edit2, X, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Vehicle {
  id: string;
  name: string;
  fuelType: 'petrol' | 'diesel' | 'cng' | 'electric';
  mileage: number;
  isDefault: boolean;
}

const defaultVehicles: Vehicle[] = [
  { id: '1', name: 'My Car', fuelType: 'petrol', mileage: 15, isDefault: true },
];

const VehicleSettings = () => {
  const [vehicles, setVehicles] = useLocalStorage<Vehicle[]>('vehicles', defaultVehicles);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newVehicle, setNewVehicle] = useState<{ name: string; fuelType: Vehicle['fuelType']; mileage: number }>({ 
    name: '', 
    fuelType: 'petrol', 
    mileage: 15 
  });
  const [editVehicle, setEditVehicle] = useState<{ name: string; fuelType: Vehicle['fuelType']; mileage: number }>({ 
    name: '', 
    fuelType: 'petrol', 
    mileage: 15 
  });

  const handleAddVehicle = () => {
    if (!newVehicle.name.trim()) {
      toast.error('Please enter a vehicle name');
      return;
    }
    if (newVehicle.mileage <= 0) {
      toast.error('Please enter a valid mileage');
      return;
    }
    
    const updatedVehicles = [
      ...vehicles,
      {
        id: Date.now().toString(),
        ...newVehicle,
        isDefault: vehicles.length === 0,
      },
    ];
    setVehicles(updatedVehicles);
    setNewVehicle({ name: '', fuelType: 'petrol', mileage: 15 });
    setIsAdding(false);
    toast.success('Vehicle added successfully');
  };

  const handleEditStart = (vehicle: Vehicle) => {
    setEditingId(vehicle.id);
    setEditVehicle({ 
      name: vehicle.name, 
      fuelType: vehicle.fuelType, 
      mileage: vehicle.mileage 
    });
  };

  const handleEditSave = (id: string) => {
    if (!editVehicle.name.trim()) {
      toast.error('Please enter a vehicle name');
      return;
    }
    if (editVehicle.mileage <= 0) {
      toast.error('Please enter a valid mileage');
      return;
    }

    const updatedVehicles = vehicles.map(v => 
      v.id === id 
        ? { ...v, name: editVehicle.name, fuelType: editVehicle.fuelType, mileage: editVehicle.mileage }
        : v
    );
    setVehicles(updatedVehicles);
    setEditingId(null);
    toast.success('Vehicle updated successfully');
  };

  const handleEditCancel = () => {
    setEditingId(null);
  };

  const handleSetDefault = (id: string) => {
    const updatedVehicles = vehicles.map(v => ({ ...v, isDefault: v.id === id }));
    setVehicles(updatedVehicles);
    toast.success('Default vehicle updated');
  };

  const handleDelete = (id: string) => {
    const remaining = vehicles.filter(v => v.id !== id);
    if (remaining.length > 0 && !remaining.some(v => v.isDefault)) {
      remaining[0].isDefault = true;
    }
    setVehicles(remaining);
    toast.success('Vehicle deleted');
  };

  const getFuelIcon = (type: string) => {
    switch (type) {
      case 'electric': return '⚡';
      case 'cng': return '🔵';
      case 'diesel': return '🟡';
      default: return '⛽';
    }
  };

  const getFuelUnit = (type: string) => {
    return type === 'electric' ? 'km/kWh' : 'km/L';
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Car className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vehicle Settings</h1>
          <p className="text-muted-foreground">Manage your vehicles for accurate cost calculations</p>
        </div>
      </div>

      {/* Vehicles List */}
      <div className="space-y-4">
        {vehicles.length === 0 && !isAdding && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Car className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">No vehicles yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Add your first vehicle to get started</p>
              <Button onClick={() => setIsAdding(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Vehicle
              </Button>
            </CardContent>
          </Card>
        )}

        {vehicles.map((vehicle) => (
          <Card key={vehicle.id} className={vehicle.isDefault ? 'ring-2 ring-primary' : ''}>
            <CardContent className="p-4">
              {editingId === vehicle.id ? (
                // Edit Mode
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Vehicle Name</Label>
                    <Input
                      value={editVehicle.name}
                      onChange={(e) => setEditVehicle({ ...editVehicle, name: e.target.value })}
                      placeholder="e.g., Honda City"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Fuel Type</Label>
                      <Select 
                        value={editVehicle.fuelType} 
                        onValueChange={(v: Vehicle['fuelType']) => setEditVehicle({ ...editVehicle, fuelType: v })}
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
                      <Label>Mileage ({getFuelUnit(editVehicle.fuelType)})</Label>
                      <Input
                        type="number"
                        value={editVehicle.mileage}
                        onChange={(e) => setEditVehicle({ ...editVehicle, mileage: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleEditSave(vehicle.id)} size="sm">
                      <Save className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                    <Button variant="outline" onClick={handleEditCancel} size="sm">
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                // View Mode
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
                        {vehicle.fuelType.charAt(0).toUpperCase() + vehicle.fuelType.slice(1)} • {vehicle.mileage} {getFuelUnit(vehicle.fuelType)}
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
                        Set Default
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleEditStart(vehicle)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Vehicle</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{vehicle.name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDelete(vehicle.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              )}
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
                  onValueChange={(v: Vehicle['fuelType']) => setNewVehicle({ ...newVehicle, fuelType: v })}
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
                <Label htmlFor="mileage">Mileage ({getFuelUnit(newVehicle.fuelType)})</Label>
                <Input
                  id="mileage"
                  type="number"
                  value={newVehicle.mileage}
                  onChange={(e) => setNewVehicle({ ...newVehicle, mileage: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleAddVehicle}>
                <Plus className="w-4 h-4 mr-2" />
                Add Vehicle
              </Button>
              <Button variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      ) : vehicles.length > 0 && (
        <Button onClick={() => setIsAdding(true)} className="w-full" variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          Add Vehicle
        </Button>
      )}
    </div>
  );
};

export default VehicleSettings;
