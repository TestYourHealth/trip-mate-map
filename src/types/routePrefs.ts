export interface RoutePreferences {
  avoidTolls: boolean;
  avoidHighways: boolean;
  optimize: 'fastest' | 'shortest';
}

export const DEFAULT_ROUTE_PREFERENCES: RoutePreferences = {
  avoidTolls: false,
  avoidHighways: false,
  optimize: 'fastest',
};

/** OSRM car profile excludable classes for the current preferences. */
export function getOsrmExclude(prefs: RoutePreferences): string | undefined {
  const classes: string[] = [];
  if (prefs.avoidTolls) classes.push('toll');
  if (prefs.avoidHighways) classes.push('motorway');
  return classes.length ? classes.join(',') : undefined;
}
