/**
 * Domain types for the geolocation feature: resolving device GPS to a
 * council/zone ID used by the disposal feature.
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface CouncilZone {
  zoneId: string;
  councilName: string;
  state: string;
  /** Suburbs reverse-geocoding may return for this council; FR-20 matches on these. */
  suburbs: string[];
}

export interface GeolocationResult {
  coordinates: Coordinates;
  zone: CouncilZone | null;
  resolvedAt: string;
}

/** An address the user typed in, used as their position whenever GPS isn't available. */
export interface SavedLocation {
  label: string;
  coordinates: Coordinates;
}

export type LocationPermissionStatus = 'granted' | 'denied' | 'undetermined';

/** Whether the app can get a GPS fix right now, and if not, what the user has to change. */
export type LocationAccess =
  | 'ok'
  | 'ask' // permission not given yet, but the prompt can still be shown
  | 'denied' // refused for good; only Settings can change it
  | 'services_off'; // the device-wide location switch is off

/** Why the current zone is what it is: lets Home show the right message and CTA. */
export type ZoneStatus =
  | 'loading'
  | 'resolved' // from GPS
  | 'manual' // user override (FR-22/23)
  | 'not_found' // GPS worked but no matching council (FR-20 explicit state)
  | 'permission_denied'
  | 'services_off' // the device's location switch is off
  | 'error';
