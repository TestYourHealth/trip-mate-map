# From / To fields in the top search bar

Right now the top search bar only has one field ("Where to?"), and the From location is shown as a small pill below it. Change it into a proper two-field search: **From (going from)** and **To (going to)**.

## What changes

- The search card becomes two stacked rows inside the same glass card:
  - Row 1: **From** — location autocomplete, prefilled with your auto-detected current location, with a crosshair shortcut to reset it to "my location".
  - Row 2: **To** — the existing "Where to?" autocomplete, with clear button and voice search.
- A small **swap** button between the two rows flips From and To (and recalculates if both are set).
- The hamburger menu stays on the left of the card; the locate-me button moves next to the From row.
- Route auto-calculates when both fields have a value and either one changes (same 100ms behaviour as today).
- The "current location pill" below the bar is removed since From is now visible and editable.
- Favorites and smart suggestions keep filling the **To** field, as today.
- Compact height so the map stays visible on small screens; both rows collapse to a single-line height each.

## Technical notes

- All work is in `src/components/TopSearchBar.tsx`. Props (`origin`, `destination`, `onOriginChange`, `onDestinationChange`, `onCalculate`) already exist and are passed from `src/pages/Index.tsx` — no state plumbing changes needed.
- The From row uses the same `LocationAutocomplete` component; on pick it stores coords in `pickedCoords` session storage automatically, which improves routing accuracy for the origin too.
- Add an optional `onOriginPlacePicked` pass-through mirroring the existing `onDestinationPlacePicked` so `Index.tsx` can use exact origin coordinates later (wired but harmless if unused).
- Auto-detect on mount keeps working: it fills From only when From is empty.
