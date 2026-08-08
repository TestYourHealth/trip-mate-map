# From / To location inputs with cost calculation

Add "From" and "To" location search fields in two places, so the cost between any two places can be seen directly.

## 1. Trip Details panel (map screen)

- Add two location search fields at the top of the Trip Details panel: **From** and **To**, above the existing multi-stop (waypoints) section.
- Both use the same smart autocomplete as the top search bar (Google Places first, OSM fallback, offline cache).
- A swap button between them flips From and To.
- Changing either field (once both are filled) triggers the route calculation automatically, so distance, duration, fuel and toll cost refresh in the same panel.
- "Use my current location" shortcut on the From field.

## 2. Bill Split page

- Add a **From** and **To** search pair at the top of the page.
- When both are picked, the route is fetched and the trip cost (distance, fuel, toll, total) is calculated with the saved vehicle and fuel settings, then fed into the split as trip costs.
- If the fields are left empty, behaviour stays as today: it uses the current trip from the map screen.
- A small summary line shows: distance, duration, fuel cost, toll cost, total — before the per-person split.

## Technical notes

- Extract the current cost formula from `src/pages/Index.tsx` (`updateTripData`) into a shared helper `src/lib/tripCost.ts` so both screens use the identical fuel/toll math (fuel = distance / mileage * price; toll = distance * 1.5).
- Extract a standalone routing helper `src/lib/routeService.ts` that geocodes (reusing picked coordinates when available) and calls OSRM for distance/duration — the same logic `Map.tsx` uses today, so the Bill Split page can calculate without mounting a map. `Map.tsx` keeps its current behaviour.
- `TripPanel.tsx` gains `LocationAutocomplete` fields bound to the existing `origin` / `destination` props and `onOriginChange` / `onDestinationChange` / `onCalculate` callbacks already passed from `Index.tsx` — no new state plumbing needed.
- `BillSplit.tsx` holds its own from/to state, calls `routeService` + `tripCost`, and passes the result into `BillSplitter` in place of the `currentTrip` values.
- Debounced calculation with a loading state; errors surface as the existing Hinglish toasts with a retry.
