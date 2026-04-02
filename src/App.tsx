import { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import NativeAppWrapper from "./components/NativeAppWrapper";
import { useAutoTheme } from "./hooks/useAutoTheme";
// Lazy load pages to reduce initial bundle size
const Index = lazy(() => import("./pages/Index"));
const Settings = lazy(() => import("./pages/Settings"));
const VehicleSettings = lazy(() => import("./pages/VehicleSettings"));
const FuelSettings = lazy(() => import("./pages/FuelSettings"));
const TripHistory = lazy(() => import("./pages/TripHistory"));
const Help = lazy(() => import("./pages/Help"));
const NotFound = lazy(() => import("./pages/NotFound"));
const InstallPWA = lazy(() => import("./components/InstallPWA"));

const queryClient = new QueryClient();

// Minimal loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <NativeAppWrapper>
        <Toaster />
        <Sonner />
        <Suspense fallback={null}>
          <InstallPWA />
        </Suspense>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route element={<MainLayout />}>
                <Route path="/" element={<Index />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/settings/vehicle" element={<VehicleSettings />} />
                <Route path="/settings/fuel" element={<FuelSettings />} />
                <Route path="/history" element={<TripHistory />} />
                <Route path="/help" element={<Help />} />
              </Route>
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </NativeAppWrapper>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
