# Pre-publish end-to-end test & deploy plan

## Goal
Run a full pre-flight audit of TripMate, fix any blockers, then publish the latest build.

## Current blockers found
1. **Tests**: 9 of 23 failing. The failures are environment/signature issues, not logic bugs:
   - `localStorage is not defined` in IndexedDB/localStorage cache tests because Vitest runs in `node` mode.
   - `offlineAutocomplete.integration.test.tsx` uses `vi.mock(..., async (importOriginal) => ...)` but `importOriginal` is undefined in this Vitest version.
2. **Lint**: ~35 errors/warnings remain. Many are `@typescript-eslint/no-explicit-any` in app code, generated shadcn/ui components, and test mocks; plus a missing-dependency warning or two and an empty `catch` block.
3. **Security scan** is stale (last run 2026-08-20). Publishing should use a fresh scan.
4. **SEO**: `metadata_basics` has not been scanned; the existing GSC connection finding is informational, not a publish blocker.

## Proposed fixes
1. **Test environment**
   - Switch Vitest default environment to `jsdom` (or add a `setupFiles` localStorage mock) so DOM/IDB tests can run.
   - Rewrite the `vi.mock` factory in `offlineAutocomplete.integration.test.tsx` to the supported Vitest signature (avoid relying on `importOriginal`).
   - Re-run `bun test` until all 23 tests pass.

2. **Lint cleanup**
   - Replace genuine `any` types in application code (`Map.tsx`, `LocationAutocomplete.tsx`, `TopSearchBar.tsx`, `googlePlaces.ts`, `useGeolocation.ts`, `searchTelemetry.ts`, `QuickActions.tsx`, `VehicleSelector.tsx`) with proper types or `unknown` where the shape is dynamic.
   - Add targeted ESLint overrides for generated `src/components/ui/**` and `src/lib/__tests__/**` to suppress `no-explicit-any` and `ban-ts-comment` boilerplate noise.
   - Fix the empty `catch` block in `TopSearchBar.tsx` and address missing-dependency warnings where safe.

3. **Security**
   - Run `security--run_security_scan` and resolve any new critical/high findings before publishing.

4. **Polish / consistency**
   - Remove the now-unused CARTO `preconnect` links from `index.html` since tiles use OpenStreetMap.
   - Add equivalent retry/fallback handling in `src/lib/routeService.ts` so Bill Split route calculation survives transient OSRM rate limits, matching the behavior in `Map.tsx`.
   - Acknowledge the GSC SEO finding as optional; do not block publish on it.

## Manual end-to-end verification (Playwright)
Run these flows against `http://localhost:8080`:
- Home loads, map renders with OSM tiles (no API-key watermark), dark-mode filter works.
- Search: From/To autocomplete returns Google Places suggestions, highlights matches, selects a place, and shows the selected-place card with name/address/distance.
- Route: Calculate a sample trip (e.g., Delhi → Agra), see the route line, traffic-colored segments, trip cost (fuel + toll), and route options (avoid tolls/highways, fastest/shortest) recalculating.
- Failure handling: temporarily block OSRM, confirm retry + Hinglish fallback message and a Retry action.
- Bill Split: route cost auto-fills from the current trip; split/share flows render.
- GPS smoke test: permission state, fix map/timeline, accepted vs rejected points.
- Responsive: mobile (375×812), tablet, desktop — overlays don't overlap, search bar and floating clusters don't collide, 44px tap targets are intact.
- All routes: settings, vehicle, fuel, history, analytics, help, and 404.

## Exit criteria
- `bun test` passes all 23 tests.
- `bun run lint` is clean (or only shadcn/ui boilerplate warnings remain, suppressed).
- Fresh security scan passes with no unresolved critical findings.
- Playwright screenshots confirm the key flows above.
- `bun run build` succeeds.

## Publish
Once the exit criteria are met, call `preview_ui--publish` and report the live URL. Frontend changes require clicking **Update** in the publish dialog to go live, while backend changes auto-deploy.
