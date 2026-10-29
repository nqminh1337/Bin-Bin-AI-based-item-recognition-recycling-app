import AsyncStorage from '@react-native-async-storage/async-storage';
import { ASYNC_STORAGE_KEYS } from '@utils/constants';
import * as Location from 'expo-location';
import { Linking, Platform } from 'react-native';
import { AUSTRALIAN_LGAS } from './data/australianLgas';
import type {
  Coordinates,
  CouncilZone,
  GeolocationResult,
  LocationAccess,
  LocationPermissionStatus,
  SavedLocation,
} from './types';

/** Give up on a fix or reverse-geocode after this long rather than leave the UI waiting (FR-19: within 10s). */
const FIX_TIMEOUT_MS = 10_000;

const toCoordinates = (l: Location.LocationObject): Coordinates => ({
  latitude: l.coords.latitude,
  longitude: l.coords.longitude,
});

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}

// The OS's cached fix: instant, but may be missing (or throw if location is off).
async function lastKnown(options?: Location.LocationLastKnownOptions): Promise<Coordinates | null> {
  try {
    const l = await Location.getLastKnownPositionAsync(options);
    return l ? toCoordinates(l) : null;
  } catch {
    return null;
  }
}

type SavedLocationListener = (saved: SavedLocation | null) => void;
const savedLocationListeners = new Set<SavedLocationListener>();

export class GeolocationService {
  // FR-18
  static async requestPermission(): Promise<LocationPermissionStatus> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === Location.PermissionStatus.GRANTED) return 'granted';
    if (status === Location.PermissionStatus.DENIED) return 'denied';
    return 'undetermined';
  }

  // Checks without prompting. Location Services come first: while the device
  // switch is off, no permission answer gets a fix.
  static async getAccess(): Promise<LocationAccess> {
    if (!(await Location.hasServicesEnabledAsync())) return 'services_off';
    const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
    if (status === Location.PermissionStatus.GRANTED) return 'ok';
    return canAskAgain ? 'ask' : 'denied';
  }

  // Takes the user to the fix for `access`. Resolves true when access is
  // sorted without leaving the app: the permission prompt, or Android's
  // "turn on location" dialog. iOS can only open the app's Settings page.
  static async fixAccess(access: LocationAccess): Promise<boolean> {
    if (access === 'ok') return true;
    if (access === 'ask') return (await this.requestPermission()) === 'granted';
    if (access === 'services_off' && Platform.OS === 'android') {
      try {
        await Location.enableNetworkProviderAsync();
        return true;
      } catch {
        return false; // dismissed
      }
    }
    await Linking.openSettings().catch(() => {});
    return false;
  }

  // FR-19: where the user is. GPS when it can get a fix, otherwise the address
  // they saved as a stand-in; throws only when there's neither.
  static async getCurrentCoordinates(): Promise<Coordinates> {
    try {
      return await this.getGpsCoordinates();
    } catch (e) {
      const saved = await this.getSavedLocation();
      if (saved) return saved.coordinates;
      throw e;
    }
  }

  // A fix from the last minute is reused (instant); otherwise waits for a
  // fresh one, up to FIX_TIMEOUT_MS.
  static async getGpsCoordinates(): Promise<Coordinates> {
    const recent = await lastKnown({ maxAge: 60_000, requiredAccuracy: 100 });
    if (recent) return recent;
    return toCoordinates(
      await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }), FIX_TIMEOUT_MS)
    );
  }

  // FR-20 only needs suburb-level accuracy, so this takes a fix from the last
  // 5 minutes if there is one, otherwise a coarse network fix, which arrives
  // far sooner than GPS. Any old fix beats failing outright.
  static async getApproximateCoordinates(): Promise<Coordinates> {
    const recent = await lastKnown({ maxAge: 5 * 60_000, requiredAccuracy: 2000 });
    if (recent) return recent;
    try {
      return toCoordinates(
        await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }), FIX_TIMEOUT_MS)
      );
    } catch (e) {
      const any = await lastKnown();
      if (any) return any;
      throw e;
    }
  }

  // Live position. `precise` (route screen, FR-72) follows every 10m on GPS;
  // otherwise (Home map) a battery-friendly update every 50m.
  // Resolves to an unsubscribe function.
  static async watchCoordinates(
    onChange: (coordinates: Coordinates) => void,
    { precise = true }: { precise?: boolean } = {}
  ): Promise<() => void> {
    const subscription = await Location.watchPositionAsync(
      precise
        ? { accuracy: Location.Accuracy.High, distanceInterval: 10, timeInterval: 5000 }
        : { accuracy: Location.Accuracy.Balanced, distanceInterval: 50 },
      (location) => onChange(toCoordinates(location))
    );
    return () => subscription.remove();
  }

  // Typed address → coordinates, via the phone's own geocoder (no key). Biased
  // to Australia, since that's all the council data covers. null = no match.
  static async geocodeAddress(address: string): Promise<SavedLocation | null> {
    const query = /australia/i.test(address) ? address : `${address}, Australia`;
    const [hit] = await withTimeout(Location.geocodeAsync(query), FIX_TIMEOUT_MS);
    if (!hit) return null;
    const coordinates = { latitude: hit.latitude, longitude: hit.longitude };
    // Show the geocoder's tidy version ("12 King St, Newtown"), or what they typed.
    const [place] = await withTimeout(Location.reverseGeocodeAsync(coordinates), FIX_TIMEOUT_MS).catch(() => []);
    const street = place?.street ? [place.streetNumber, place.street].filter(Boolean).join(' ') : place?.name;
    const label = [street, place?.district ?? place?.city].filter(Boolean).join(', ') || address.trim();
    return { label, coordinates };
  }

  static async getSavedLocation(): Promise<SavedLocation | null> {
    try {
      const raw = await AsyncStorage.getItem(ASYNC_STORAGE_KEYS.SAVED_LOCATION);
      return raw ? (JSON.parse(raw) as SavedLocation) : null;
    } catch {
      return null;
    }
  }

  /** null clears it. */
  static async setSavedLocation(saved: SavedLocation | null): Promise<void> {
    if (saved) await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.SAVED_LOCATION, JSON.stringify(saved));
    else await AsyncStorage.removeItem(ASYNC_STORAGE_KEYS.SAVED_LOCATION);
    savedLocationListeners.forEach((l) => l(saved));
  }

  /** Resolves to an unsubscribe function. */
  static onSavedLocationChange(listener: SavedLocationListener): () => void {
    savedLocationListeners.add(listener);
    return () => {
      savedLocationListeners.delete(listener);
    };
  }

  // FR-20: reverse-geocode → council. Reverse geocoding returns a suburb (not
  // the LGA) in Australian cities, so we match against each zone's `suburbs`
  // list. Tries every locality-ish field the geocoder gives us, most specific
  // first. Returns null for the explicit "zone not found" state.
  // Matches against the bundled dataset (the same one `seed:zones` uploads to
  // Firestore): instant, instead of a Firestore round trip per candidate suburb.
  static async resolveZone(coordinates: Coordinates): Promise<CouncilZone | null> {
    const [place] = await withTimeout(Location.reverseGeocodeAsync(coordinates), FIX_TIMEOUT_MS);
    if (!place) return null;

    const candidates = [place.district, place.city, place.subregion]
      .filter((v): v is string => !!v)
      .map((v) => v.toLowerCase())
      .filter((v, i, arr) => arr.indexOf(v) === i);

    for (const suburb of candidates) {
      const zone = AUSTRALIAN_LGAS.find((z) => z.suburbs.some((s) => s.toLowerCase() === suburb));
      if (zone) return zone;
    }
    return null;
  }

  static async getCurrentZone(): Promise<GeolocationResult> {
    const coordinates = await this.getApproximateCoordinates();
    const zone = await this.resolveZone(coordinates);
    return { coordinates, zone, resolvedAt: new Date().toISOString() };
  }

  // FR-22: search by council, suburb or state. Runs against the bundled
  // dataset (the same data seeded to Firestore) so it works offline and
  // as-you-type without Firestore's lack of substring search getting in the way.
  static searchZones(searchText: string): CouncilZone[] {
    const q = searchText.trim().toLowerCase();
    if (!q) return AUSTRALIAN_LGAS;
    return AUSTRALIAN_LGAS.filter(
      (z) =>
        z.councilName.toLowerCase().includes(q) ||
        z.state.toLowerCase() === q ||
        z.suburbs.some((s) => s.toLowerCase().includes(q))
    );
  }
}
