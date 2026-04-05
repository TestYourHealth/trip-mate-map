import React from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { 
  Menu, 
  MapPin, 
  Navigation, 
  History,
  BarChart3,
  Car, 
  Fuel, 
  Settings, 
  HelpCircle,
  X,
  Crosshair
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { useIsMobile } from '@/hooks/use-mobile';

const navigationItems = [
  { title: 'Navigate', url: '/', icon: Navigation, description: 'Plan your trip' },
  { title: 'Trip History', url: '/history', icon: History, description: 'View past trips' },
  { title: 'Trip Analytics', url: '/analytics', icon: BarChart3, description: 'Spending insights' },
];

const settingsItems = [
  { title: 'Vehicle Settings', url: '/settings/vehicle', icon: Car, description: 'Manage vehicles' },
  { title: 'Fuel Prices', url: '/settings/fuel', icon: Fuel, description: 'Update fuel costs' },
  { title: 'Preferences', url: '/settings', icon: Settings, description: 'App settings' },
];

const supportItems = [
  { title: 'Help & Support', url: '/help', icon: HelpCircle, description: 'Get help' },
];

function AppMenu() {
  const [open, setOpen] = React.useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const MenuLink = ({ item }: { item: typeof navigationItems[0] }) => (
    <Link
      to={item.url}
      onClick={() => setOpen(false)}
      className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${
        isActive(item.url) 
          ? 'bg-primary/10 text-primary' 
          : 'hover:bg-muted'
      }`}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
        isActive(item.url) 
          ? 'bg-primary/20' 
          : 'bg-muted'
      }`}>
        <item.icon className={`w-5 h-5 ${isActive(item.url) ? 'text-primary' : 'text-muted-foreground'}`} />
      </div>
      <div>
        <p className={`font-medium ${isActive(item.url) ? 'text-primary' : 'text-foreground'}`}>{item.title}</p>
        <p className="text-xs text-muted-foreground">{item.description}</p>
      </div>
    </Link>
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="bg-background/95 backdrop-blur-sm shadow-md border-border/50 hover:bg-background"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0">
        <SheetHeader className="p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-xl font-bold text-left">Trip Mate</SheetTitle>
              <p className="text-sm text-muted-foreground">Navigation & Cost Calculator</p>
            </div>
          </div>
        </SheetHeader>
        
        <div className="px-4 pb-6 space-y-6 overflow-y-auto max-h-[calc(100vh-120px)]">
          {/* Navigation */}
          <div>
            <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Navigation</p>
            <nav className="space-y-1">
              {navigationItems.map((item) => (
                <MenuLink key={item.url} item={item} />
              ))}
            </nav>
          </div>

          <Separator />

          {/* Settings */}
          <div>
            <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Settings</p>
            <nav className="space-y-1">
              {settingsItems.map((item) => (
                <MenuLink key={item.url} item={item} />
              ))}
            </nav>
          </div>

          <Separator />

          {/* Support */}
          <div>
            <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Support</p>
            <nav className="space-y-1">
              {supportItems.map((item) => (
                <MenuLink key={item.url} item={item} />
              ))}
            </nav>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

const MainLayout = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const isMapPage = location.pathname === '/';

  // For the main map page - no extra menu (TopSearchBar has its own)
  if (isMapPage) {
    return (
      <div className="h-screen w-screen overflow-hidden relative">
        <Outlet />
      </div>
    );
  }

  // For other pages - header with menu
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center gap-4 px-4">
          <AppMenu />
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground">Trip Mate</span>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
