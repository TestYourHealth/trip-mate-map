import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Menu, 
  MapPin, 
  Navigation, 
  History, 
  Car, 
  Fuel, 
  Settings, 
  HelpCircle,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

const menuItems = [
  { title: 'Navigate', url: '/', icon: Navigation, description: 'Plan your trip' },
  { title: 'Trip History', url: '/history', icon: History, description: 'View past trips' },
  { title: 'Vehicle Settings', url: '/settings/vehicle', icon: Car, description: 'Manage vehicles' },
  { title: 'Fuel Prices', url: '/settings/fuel', icon: Fuel, description: 'Update fuel costs' },
  { title: 'Preferences', url: '/settings', icon: Settings, description: 'App settings' },
  { title: 'Help & Support', url: '/help', icon: HelpCircle, description: 'Get help' },
];

export function MapMenu() {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="glass" size="icon" className="shadow-lg">
          <Menu className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 bg-background/95 backdrop-blur-xl border-r border-border/50">
        <SheetHeader className="pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-lg font-bold">Trip Mate</SheetTitle>
              <p className="text-xs text-muted-foreground">Navigation & Costs</p>
            </div>
          </div>
        </SheetHeader>
        
        <nav className="space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.url}
              to={item.url}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-accent/50 transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <item.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div>
                <p className="font-medium text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
