import AsyncStorage from '@react-native-async-storage/async-storage';
import { ASYNC_STORAGE_KEYS } from '@utils/constants';
import { useCallback, useEffect, useState } from 'react';
import { GeolocationService } from './GeolocationService';
import type { CouncilZone, ZoneStatus } from './types';

/** Outcome of a GPS lookup, so the zone picker can tell the user what happened. */
export type DeviceZoneResult =
  | { kind: 'found'; zone: CouncilZone }
  | { kind: 'not_found' | 'permission_denied' | 'services_off' | 'error' };

export interface ZoneState {
  zone: CouncilZone | null;
  status: ZoneStatus;
  // FR-22: set a zone manually. Persists and stops GPS from overriding it. 
  setManualZone: (zone: CouncilZone) => Promise<void>;
  // Re-resolve from GPS, replacing any manual override. Only replaces the
  // current zone on success; on failure the old one stays active.
  useDeviceLocation: () => Promise<DeviceZoneResult>;
}

// FR-23: The system shall persist a manual zone override across app sessions.
export function useZone(): ZoneState {
  const [zone, setZone] = useState<CouncilZone | null>(null);
  const [status, setStatus] = useState<ZoneStatus>('loading');

  const persist = useCallback(
    async (next: CouncilZone, isManual: boolean) => {
      setZone(next);
      setStatus(isManual ? 'manual' : 'resolved');
      await AsyncStorage.multiSet([
        [ASYNC_STORAGE_KEYS.CURRENT_ZONE, JSON.stringify(next)],
        [ASYNC_STORAGE_KEYS.ZONE_IS_MANUAL, String(isManual)],
      ]);
    },
    []
  );

  const locate = useCallback(async (): Promise<DeviceZoneResult> => {
    try {
      if ((await GeolocationService.getAccess()) === 'services_off') return { kind: 'services_off' };
      const permission = await GeolocationService.requestPermission();
      if (permission !== 'granted') return { kind: 'permission_denied' };
      const result = await GeolocationService.getCurrentZone();
      return result.zone ? { kind: 'found', zone: result.zone } : { kind: 'not_found' };
    } catch {
      // GPS off, airplane mode, geocoder/network failure: never leave the UI stuck on loading.
      return { kind: 'error' };
    }
  }, []);

  const resolveFromDevice = useCallback(async () => {
    setStatus('loading');
    const result = await locate();
    if (result.kind === 'found') await persist(result.zone, false);
    else setStatus(result.kind);
  }, [locate, persist]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [[, cached], [, isManual]] = await AsyncStorage.multiGet([
          ASYNC_STORAGE_KEYS.CURRENT_ZONE,
          ASYNC_STORAGE_KEYS.ZONE_IS_MANUAL,
        ]);
        if (cancelled) return;
        if (cached) {
          const parsed = JSON.parse(cached) as CouncilZone;
          setZone(parsed);
          setStatus(isManual === 'true' ? 'manual' : 'resolved');
          return;
        }
      } catch {
        // Corrupt cache, fall through to GPS.
      }
      if (!cancelled) await resolveFromDevice();
    })();
    return () => {
      cancelled = true;
    };
  }, [resolveFromDevice]);

  const setManualZone = useCallback((next: CouncilZone) => persist(next, true), [persist]);

  const useDeviceLocation = useCallback(async () => {
    const result = await locate();
    if (result.kind === 'found') {
      // Overwrites the cache with isManual=false, so GPS is in charge again.
      await persist(result.zone, false);
    } else {
      // Keep whatever zone was active; only surface the failure if there isn't one.
      setStatus((s) => (s === 'resolved' || s === 'manual' ? s : result.kind));
    }
    return result;
  }, [locate, persist]);

  return { zone, status, setManualZone, useDeviceLocation };
}
