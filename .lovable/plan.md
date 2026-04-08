
# Smart Upgrade Plan

## Feature 1: Smart Search & Predict
- **Time-based suggestions**: Subah office, shaam ghar - recent trips se pattern detect karke suggest
- **Frequent routes auto-suggest**: Most used routes ko top pe dikhao with "Go Again" button
- **Smart greeting**: Good Morning/Evening with weather-aware suggestion
- **File**: New `src/components/SmartSuggestions.tsx` + update `TopSearchBar.tsx`

## Feature 2: Smart Navigation HUD
- **Speed limit display**: Road type ke hisaab se estimated speed limit (Highway: 100, City: 50, Residential: 30)
- **Turn countdown timer**: Next turn kitne seconds/meters door hai with countdown animation
- **Auto night mode**: Sunset/sunrise ke time automatic dark theme switch
- **Enhanced lane guidance**: Visual lane arrows with highlighted recommended lane
- **File**: Update `DriverNavigationView.tsx` + update `useAutoTheme.ts`

## Feature 3: Smart ETA & Traffic
- **Live ETA updates**: Distance remaining ke hisaab se ETA recalculate har 30 sec
- **Traffic-aware coloring**: Route line color change based on traffic level (green/yellow/red)
- **Delay warning toast**: Jab estimated delay badhta hai to alert
- **File**: Update `Map.tsx` route colors + `DriverNavigationView.tsx` ETA logic

## Technical Notes
- No backend needed - all client-side logic
- localStorage for trip patterns (frequent routes)
- SunCalc-style sunset detection for auto dark mode (calculated, no API)
- ~3 new/modified files, focused changes
