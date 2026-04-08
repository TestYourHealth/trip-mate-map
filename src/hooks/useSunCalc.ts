import { useMemo } from 'react';

// Simple sun position calculator - no external dependencies
// Uses approximate formulas for sunset/sunrise based on latitude

export function getSunTimes(lat: number, lng: number, date: Date = new Date()) {
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
  );

  // Solar declination (approximate)
  const declination = -23.45 * Math.cos((360 / 365) * (dayOfYear + 10) * (Math.PI / 180));

  // Hour angle for sunrise/sunset
  const latRad = lat * (Math.PI / 180);
  const decRad = declination * (Math.PI / 180);
  const cosH = -Math.tan(latRad) * Math.tan(decRad);

  // Clamp for polar regions
  const clampedCosH = Math.max(-1, Math.min(1, cosH));
  const hourAngle = Math.acos(clampedCosH) * (180 / Math.PI);

  // Convert to hours from noon (approximate, ignoring equation of time for simplicity)
  const sunriseHour = 12 - hourAngle / 15;
  const sunsetHour = 12 + hourAngle / 15;

  // Adjust for timezone offset from UTC
  const timezoneOffset = -date.getTimezoneOffset() / 60; // IST = +5.5
  const lngCorrection = (lng - timezoneOffset * 15) / 15; // longitude correction in hours

  return {
    sunrise: sunriseHour - lngCorrection,
    sunset: sunsetHour - lngCorrection,
  };
}

export function useSunCalc(lat?: number, lng?: number) {
  return useMemo(() => {
    // Default to center of India if no position
    const useLat = lat ?? 20.5937;
    const useLng = lng ?? 78.9629;
    return getSunTimes(useLat, useLng);
  }, [lat, lng]);
}

export function isDaytime(lat?: number, lng?: number): boolean {
  const { sunrise, sunset } = getSunTimes(lat ?? 20.5937, lng ?? 78.9629);
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  return currentHour >= sunrise && currentHour < sunset;
}
