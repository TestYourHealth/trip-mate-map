import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MainLayout = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const isMapPage = location.pathname === '/';

  // For the main map page, we use a floating trigger instead of fixed header
  if (isMapPage) {
    return (
      <SidebarProvider defaultOpen={!isMobile}>
        <AppSidebar />
        <main style={{ flex: 1, height: '100svh', position: 'relative', overflow: 'hidden' }}>
          {/* Floating sidebar trigger for map page */}
          <div className="absolute top-4 left-4 z-50">
            <SidebarTrigger asChild>
              <Button variant="glass" size="icon" className="shadow-lg">
                <Menu className="w-5 h-5" />
              </Button>
            </SidebarTrigger>
          </div>
          <Outlet />
        </main>
      </SidebarProvider>
    );
  }

  // For other pages, use standard layout with header
  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="bg-background">
          {/* Header for non-map pages */}
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur px-4">
            <SidebarTrigger />
          </header>
          <Outlet />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default MainLayout;
