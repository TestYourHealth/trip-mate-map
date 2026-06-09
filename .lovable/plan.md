# Multi-stop Waypoints + Cleanup

## Current state
- `WaypointInput.tsx` is fully built (add/remove stops, drag-reorder, nearest-neighbor TSP "Optimize" button) but never imported.
- `Index.tsx` already manages `waypoints` state and passes `waypoints` + `onWaypointsChange` to `TripPanel`, and `Map.showRoute` already routes through them — so routing/cost calculation already accounts for stops.
- `TripPanel.tsx` accepts those props but never renders any waypoint UI. **That's the only missing wire.**
- `SpeedIndicator.tsx` is genuinely orphaned with zero imports.

## Changes

### 1. Render WaypointInput inside TripPanel
In `src/components/TripPanel.tsx`:
- Import `WaypointInput`.
- Render `<WaypointInput waypoints={waypoints} onWaypointsChange={onWaypointsChange} origin={origin} destination={destination} />` between the origin/destination fields and the trip summary (so stops appear in the natural source→stops→destination order).
- Show it on both mobile sheet and desktop panel layouts (single render works since TripPanel handles both).

### 2. "Calculate route" already triggers automatically
`Index.tsx` line 409 has `useEffect` dependency `[origin, destination, waypoints, ...]` calling `calculateTrip`, so adding/removing/reordering a stop will re-run routing + cost calculation. No new button needed.

### 3. Remove orphan component
- Delete `src/components/SpeedIndicator.tsx` (zero references).

## Out of scope
- Not touching `RouteDebugPanel` (still referenced; likely intentional dev panel).
- Not adding new optimization algorithms — existing nearest-neighbor TSP in WaypointInput is kept.

## Files touched
- `src/components/TripPanel.tsx` — import + render WaypointInput
- `src/components/SpeedIndicator.tsx` — deleted
