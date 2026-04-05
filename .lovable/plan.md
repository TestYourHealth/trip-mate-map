
# Implementation Plan: Traffic Alerts, Trip Analytics, Multi-Stop Optimizer

## Overview
Three new features: road/traffic alerts during navigation, a trip analytics dashboard with charts, and a multi-stop route optimizer that reorders waypoints for shortest total distance.

---

## Feature 1: Traffic & Road Alerts

**What**: Show contextual alerts during navigation - speed limit warnings, school zone alerts, sharp turn warnings based on route geometry.

**Files to create/edit**:
- **Create `src/components/RoadAlerts.tsx`**: Alert overlay component shown during navigation
  - Analyze upcoming navigation steps for sharp turns (consecutive left/right)
  - Speed-based warnings (speed > 80 km/h in urban areas)
  - Alert types: `speed-warning`, `sharp-turn`, `school-zone`, `highway-merge`
  - Auto-dismiss alerts after 5 seconds with slide-in animation
  - Visual: colored banner at top of DriverNavigationView (yellow for caution, red for danger)

- **Edit `src/components/DriverNavigationView.tsx`**: Integrate RoadAlerts component
  - Pass current speed, upcoming steps, and position data
  - Show alerts above the current instruction card

**Logic**: Analyze route instruction types/modifiers to detect sharp turns. Use speed thresholds for speed warnings. School zones simulated based on time of day (7-9 AM, 2-4 PM).

---

## Feature 2: Trip Analytics Dashboard

**What**: New page with charts showing trip spending patterns, distance trends, and frequent routes.

**Files to create/edit**:
- **Create `src/pages/TripAnalytics.tsx`**: Full analytics page
  - **Total Stats Cards**: Total trips, total distance, total spent, avg cost/trip
  - **Monthly Spending Chart**: Bar chart using recharts (already in project via shadcn chart)
  - **Distance vs Cost Scatter**: Show correlation
  - **Frequent Routes**: Top 5 most-used origin-destination pairs
  - **Weekly Activity**: Trips per day-of-week heatmap
  - Data sourced from existing `tripHistory` in localStorage

- **Edit `src/App.tsx`**: Add `/analytics` route
- **Edit `src/components/TopSearchBar.tsx`**: Add "Analytics" link in hamburger menu
- **Edit `src/layouts/MainLayout.tsx`** (if nav links exist): Add analytics nav item

---

## Feature 3: Multi-Stop Route Optimizer

**What**: When user adds multiple waypoints, offer a "Optimize Order" button that reorders stops for minimum total distance using nearest-neighbor algorithm.

**Files to create/edit**:
- **Edit `src/components/WaypointInput.tsx`**: 
  - Add "Optimize Route" button (shown when 2+ waypoints exist)
  - Implement nearest-neighbor TSP approximation:
    1. Geocode all waypoints + origin + destination
    2. Calculate distance matrix using Haversine
    3. Greedy nearest-neighbor from origin, ending at destination
    4. Reorder waypoints array accordingly
  - Show toast with distance saved estimate
  - Add drag-to-reorder capability for manual ordering

- **Edit `src/components/TripPanel.tsx`**: Pass origin/destination to WaypointInput for optimizer context

---

## Technical Notes

- **Charts**: Use existing `recharts` via shadcn/ui chart component (`src/components/ui/chart.tsx`)
- **Geocoding**: Reuse existing `geocodeLocation` from Map.tsx (or Nominatim calls)
- **No backend needed**: All data from localStorage `tripHistory`
- **Responsive**: All new components adapt to mobile/desktop viewport
- **Animations**: Use existing `animate-fade-in`, `animate-slide-up` classes

## Estimated scope: 3 new files, 5 edited files
