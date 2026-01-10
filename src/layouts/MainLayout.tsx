import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { MapMenu } from '@/components/MapMenu';

const MainLayout = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const isMapPage = location.pathname === '/';

  // For the main map page, no sidebar - just floating menu
  if (isMapPage) {
    return (
      <div className="h-screen w-screen overflow-hidden relative">
        {/* Floating menu button */}
        <div className="absolute top-4 left-4 z-50">
          <MapMenu />
        </div>
        <Outlet />
      </div>
    );
  }

  // For other pages, use standard layout with sidebar
  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <AppSidebar />
      <SidebarInset className="bg-background">
        {/* Header for non-map pages */}
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur px-4">
          <SidebarTrigger />
        </header>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
};

export default MainLayout;
