# UI Touch-Up: Overlays, Buttons, Responsiveness

Polish pass on the map screen only — no routing, cost, or search logic changes.

## Problems found on the map screen

- The desktop Trip Details panel sits at the bottom-right corner in the same spot as the Quick Actions button, and the vertical map controls stack sits on the right edge — all three overlap each other on smaller desktop widths.
- The selected-place card is pinned at a fixed distance from the top that was set for the old single-row search bar. The search bar now has two rows (From / To), so the card can tuck under it on narrow screens.
- On mobile, the compass, weather and Quick Actions float at a fixed bottom offset and get covered by the Trip Details bottom sheet once a route is calculated.
- Overlay layers use ad-hoc z-index values (0 / 100 / 140 / 150 / 200) with no shared scale, so new overlays keep landing in the wrong order.
- Several icon-only controls are below the comfortable 44px touch target on mobile, and a few lack visible focus rings.
- Bottom-anchored overlays don't consistently respect the phone's safe area (home indicator / gesture bar).

## What will change

### Overlay layout
- Give the map overlays one shared layering scale (map base, floating controls, cards, search bar, sheets) and apply it everywhere so nothing fights for the top.
- Move the desktop map controls and Quick Actions so they clear the Trip Details panel: controls shift up out of the panel's column, Quick Actions moves above the panel instead of behind it.
- Anchor the selected-place card below the actual search-bar height instead of a hard-coded pixel offset, so it never hides behind the two-row bar.
- On mobile, lift the compass / weather / Quick Actions cluster when the trip sheet is open so they stay visible and tappable.

### Buttons
- Bring all icon-only overlay buttons up to a 44px minimum touch target on mobile while keeping the compact look on desktop.
- Consistent press feedback (subtle scale + glass hover) and visible keyboard focus rings across map controls, compass, Quick Actions, swap / locate buttons, and the trip panel actions.
- Make the Trip Details action row wrap gracefully instead of squashing the "Navigation शुरू करें" label on narrow screens.

### Responsiveness
- Cap the trip sheet height and keep its content scrollable so the action buttons stay reachable on short screens.
- Apply safe-area padding to every bottom-anchored overlay.
- Tighten spacing and font sizes for widths under 360px so the search bar rows and cost breakdown don't overflow.
- Verify the layout at mobile, tablet and desktop widths, with and without a calculated route.

## Technical notes

- Files touched: `src/pages/Index.tsx` (overlay positioning + layering), `src/components/MapControls.tsx`, `src/components/QuickActions.tsx`, `src/components/CompassIndicator.tsx`, `src/components/TopSearchBar.tsx`, `src/components/TripPanel.tsx`, `src/components/SelectedPlaceCard.tsx`, plus small token/utility additions in `src/index.css`.
- New z-index and safe-area utility classes go in `src/index.css` as semantic helpers; no hardcoded colors are introduced — all styling stays on existing design tokens.
- No changes to route calculation, cost math, geocoding, or storage.
