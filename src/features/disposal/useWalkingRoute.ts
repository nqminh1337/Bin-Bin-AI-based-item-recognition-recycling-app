import { GeolocationService, type Coordinates } from '@features/geolocation';
import { useEffect, useMemo, useState } from 'react';
import { routeProgress, WalkingRouteService } from './WalkingRouteService';
import type { RouteProgress, WalkingRoute } from './types';

/** Re-fetch the route once the user is this far off the line... */
const OFF_ROUTE_M = 40;
/** ...but no more often than this, so a bad GPS patch can't hammer the router. */
const REROUTE_COOLDOWN_MS = 15_000;

export type WalkingRouteStatus =
  | 'locating' // waiting on the first GPS fix
  | 'routing' // have a fix, first route on its way
  | 'ready'
  | 'unavailable' // router failed (offline etc.): screen falls back to straight-line
  | 'no_location'; // permission denied / GPS off

export interface WalkingRouteState {
  status: WalkingRouteStatus;
  here: Coordinates | null;
  route: WalkingRoute | null;
  /** null until both a route and a position exist. */
  progress: RouteProgress | null;
}

// FR-71/72: follows the user's position, fetches a walking route to the
// destination, and keeps distance/ETA/next turn current as they walk.
export function useWalkingRoute(destination: Coordinates | null, destinationName: string): WalkingRouteState {
  const [here, setHere] = useState<Coordinates | null>(null);
  const [route, setRoute] = useState<WalkingRoute | null>(null);
  const [status, setStatus] = useState<WalkingRouteStatus>('locating');

  // Depend on the numbers, not the object, so a re-render with an equal
  // destination doesn't restart tracking.
  const lat = destination?.latitude;
  const lng = destination?.longitude;

  useEffect(() => {
    if (lat === undefined || lng === undefined) return;
    const to: Coordinates = { latitude: lat, longitude: lng };
    let cancelled = false;
    let stopWatching: (() => void) | null = null;
    let current: WalkingRoute | null = null;
    let fetching = false;
    let lastFetchAt = 0;

    setHere(null);
    setRoute(null);
    setStatus('locating');

    const fetchRoute = async (from: Coordinates) => {
      fetching = true;
      lastFetchAt = Date.now();
      setStatus((s) => (s === 'locating' ? 'routing' : s));
      try {
        const next = await WalkingRouteService.getRoute(from, to, destinationName);
        if (cancelled) return;
        current = next;
        setRoute(next);
        setStatus('ready');
      } catch {
        // Keep following an earlier route if there is one.
        if (!cancelled && !current) setStatus('unavailable');
      } finally {
        fetching = false;
      }
    };

    const onPosition = (position: Coordinates) => {
      if (cancelled) return;
      setHere(position);
      // No route yet (or the last attempt failed), or the user has left the line.
      const needsRoute = !current || routeProgress(current, position).offRouteM > OFF_ROUTE_M;
      if (needsRoute && !fetching && Date.now() - lastFetchAt > REROUTE_COOLDOWN_MS) {
        void fetchRoute(position);
      }
    };

    (async () => {
      try {
        if ((await GeolocationService.requestPermission()) !== 'granted') {
          if (!cancelled) setStatus('no_location');
          return;
        }
        // A one-off fix gets the first route going without waiting on the watcher.
        GeolocationService.getCurrentCoordinates().then(onPosition).catch(() => {});
        const stop = await GeolocationService.watchCoordinates(onPosition);
        if (cancelled) stop();
        else stopWatching = stop;
      } catch {
        if (!cancelled && !current) setStatus('no_location');
      }
    })();

    return () => {
      cancelled = true;
      stopWatching?.();
    };
  }, [lat, lng, destinationName]);

  const progress = useMemo(() => (route && here ? routeProgress(route, here) : null), [route, here]);

  return { status, here, route, progress };
}
