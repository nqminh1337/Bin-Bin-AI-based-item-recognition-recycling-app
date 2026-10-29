import type { Coordinates, CouncilZone } from '@features/geolocation';
import { GeolocationService, haversineKm } from '@features/geolocation';
import { POINT_REASONS, POINT_VALUES, PointsService } from '@features/gamification/points';
import { PetService, MATERIAL_ORDER, type MaterialType } from '@features/gamification/pet';
import type { IdentifiedItem } from '@features/scan';
import { AuthService } from '@services/AuthService';
import { FirestoreClient } from '@services/FirestoreClient';
import { FIRESTORE_COLLECTIONS, generateId } from '@utils/index';
import { where } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ASYNC_STORAGE_KEYS } from '@utils/constants';
import { Linking, Platform } from 'react-native';
import { matchMaterial } from './itemMatcher';
import type {
  DisposalInstruction,
  DisposalMatchResult,
  DisposalRule,
  DropOffLocation,
  GuidanceReport,
  MaterialKey,
  NearestDropOff,
  StashItem,
} from './types';

// FR-45: which of Bin Bin's diet meters a correct sort feeds. Each skin's
// material feeds its own meter; materials without a skin feed the closest one.
const PET_MATERIAL: Partial<Record<MaterialKey, MaterialType>> = {
  ...Object.fromEntries(MATERIAL_ORDER.map((m) => [m, m])),
  garden: 'organics',
  carton: 'cardboard',
  coffee_cup: 'general_waste',
};

export class DisposalService {
  // FR-45/FR-48: feed Bin Bin and report whether a skin was newly unlocked.
  // Never throws: a Firestore hiccup here shouldn't block the points flow
  // that already succeeded.
  private static async feedPet(userId: string, material: MaterialKey): Promise<MaterialType | null> {
    const petMaterial = PET_MATERIAL[material];
    if (!petMaterial) return null;
    try {
      const { newlyUnlockedSkin } = await PetService.feed(userId, petMaterial);
      return newlyUnlockedSkin;
    } catch (error) {
      console.error('Failed to feed Bin Bin:', error);
      return null;
    }
  }

  // FR-40: reward detection is best-effort and must not undo points already saved.
  private static async getStreakMilestone(userId: string, entryId: string): Promise<number | null> {
    try {
      return await PointsService.getUnlockedStreakMilestone(userId, entryId);
    } catch (error) {
      console.error('Failed to check streak milestone:', error);
      return null;
    }
  }

  // FR-24: zone-specific rule first, then the 'default' baseline. null = no rule found.
  static async getRule(material: MaterialKey, zoneId: string): Promise<DisposalRule | null> {
    for (const scope of [zoneId, 'default']) {
      const [rule] = await FirestoreClient.queryCollection<DisposalRule>(
        FIRESTORE_COLLECTIONS.DISPOSAL_RULES,
        where('zoneId', '==', scope),
        where('material', '==', material)
      );
      if (rule) return rule;
    }
    return null;
  }

  static async getInstructionsForItem(
    item: Pick<IdentifiedItem, 'itemId' | 'label'>,
    zoneId: string
  ): Promise<DisposalInstruction | null> {
    const match = await matchMaterial(item);
    if (!match) return null;
    const { material } = match;

    const rule = await this.getRule(material, zoneId);
    if (!rule) return null;

    // FR-29: only look for a drop-off when the kerbside bin won't take it.
    const nearestDropOff = rule.kerbsideAccepted
      ? null
      : await this.findNearestDropOff(material, zoneId);

    // zoneId is the user's council even when the rule is the 'default' one
    // (ruleId says which); guidelines, routing and reports all key off it.
    return { ...rule, zoneId, itemId: item.itemId, itemLabel: item.label, nearestDropOff };
  }

  static async matchItemToZone(item: IdentifiedItem, zone: CouncilZone): Promise<DisposalMatchResult> {
    const instruction = await this.getInstructionsForItem(item, zone.zoneId);
    return { item, zone, instruction, matchedAt: new Date().toISOString() };
  }

  // FR-68: every drop-off point / hub in the zone, for the Home map.
  static async getHubsForZone(zoneId: string): Promise<DropOffLocation[]> {
    return FirestoreClient.queryCollection<DropOffLocation>(
      FIRESTORE_COLLECTIONS.DROP_OFF_LOCATIONS,
      where('zoneId', '==', zoneId)
    );
  }

  static async getHub(locationId: string): Promise<DropOffLocation | null> {
    return FirestoreClient.getDocument<DropOffLocation>(FIRESTORE_COLLECTIONS.DROP_OFF_LOCATIONS, locationId);
  }

  // FR-29: nearest location in the zone that takes this material. Distance is
  // best-effort: if we can't get a fix we still return the location, with null distance.
  static async findNearestDropOff(material: MaterialKey, zoneId: string): Promise<NearestDropOff | null> {
    const locations = await FirestoreClient.queryCollection<DropOffLocation>(
      FIRESTORE_COLLECTIONS.DROP_OFF_LOCATIONS,
      where('zoneId', '==', zoneId),
      where('acceptedMaterials', 'array-contains', material)
    );
    if (locations.length === 0) return null;

    let here: Coordinates | null = null;
    try {
      here = await GeolocationService.getCurrentCoordinates();
    } catch {
      // permission off / GPS unavailable, fall through with no distance
    }
    if (!here) return { location: locations[0], distanceKm: null };

    const ranked = locations
      .map((location) => ({ location, distanceKm: haversineKm(here!, location) }))
      .sort((a, b) => a.distanceKm - b.distanceKm);
    return ranked[0];
  }

  // FR-30: hand off to the device's map app with walking directions pre-filled.
  // Apple / Google Maps links open the native app when it's installed (the
  // browser otherwise), so there's no canOpenURL check that can fail.
  static async openDirections(location: Pick<DropOffLocation, 'latitude' | 'longitude'>): Promise<void> {
    const { latitude, longitude } = location;
    const url =
      Platform.OS === 'ios'
        ? `https://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=w`
        : `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=walking`;
    await Linking.openURL(url);
  }

  // FR-31
  static async reportIncorrectGuidance(
    instruction: Pick<DisposalInstruction, 'itemId' | 'zoneId' | 'ruleId'>,
    note = ''
  ): Promise<GuidanceReport> {
    const report: GuidanceReport = {
      reportId: generateId(),
      userId: AuthService.getCurrentUser()?.uid ?? null,
      itemId: instruction.itemId,
      zoneId: instruction.zoneId,
      ruleId: instruction.ruleId,
      note,
      createdAt: new Date().toISOString(),
    };
    await FirestoreClient.setDocument(FIRESTORE_COLLECTIONS.GUIDANCE_REPORTS, report.reportId, report);
    return report;
  }

  // FR-32 "Got it" marks the scan complete. For kerbside items that is also the
  // FR-33 moment: points land now. Depot-only items get nothing here; FR-73
  // awards them only after the user confirms the physical drop-off.
  static async completeGuidance(instruction: DisposalInstruction): Promise<{ pointsAwarded: number; newlyUnlockedSkin: MaterialType | null; streakMilestoneDays: number | null }> {
    const user = AuthService.getCurrentUser();
    if (!user || !instruction.kerbsideAccepted) return { pointsAwarded: 0, newlyUnlockedSkin: null, streakMilestoneDays: null };
    const entry = await PointsService.addPoints(user.uid, POINT_VALUES.CORRECT_SORT, POINT_REASONS.CORRECT_SORT);
    const [newlyUnlockedSkin, streakMilestoneDays] = await Promise.all([
      this.feedPet(user.uid, instruction.material),
      this.getStreakMilestone(user.uid, entry.entryId),
    ]);
    return { pointsAwarded: POINT_VALUES.CORRECT_SORT, newlyUnlockedSkin, streakMilestoneDays };
  }

  // FR-73: the ONLY place depot-only items earn points, after the user taps
  // "I dropped it off" on the route screen. Never call this at identification.
  static async confirmDropOff(
    instruction: Pick<DisposalInstruction, 'itemId' | 'kerbsideAccepted' | 'material'>
  ): Promise<{ pointsAwarded: number; newlyUnlockedSkin: MaterialType | null; streakMilestoneDays: number | null }> {
    const user = AuthService.getCurrentUser();
    if (!user) return { pointsAwarded: 0, newlyUnlockedSkin: null, streakMilestoneDays: null };
    if (instruction.kerbsideAccepted) {
      // Kerbside items are paid at "Got it" (FR-33). Don't double-pay.
      return { pointsAwarded: 0, newlyUnlockedSkin: null, streakMilestoneDays: null };
    }
    const entry = await PointsService.addPoints(user.uid, POINT_VALUES.CORRECT_SORT, POINT_REASONS.CORRECT_SORT);
    const [newlyUnlockedSkin, streakMilestoneDays] = await Promise.all([
      this.feedPet(user.uid, instruction.material),
      this.getStreakMilestone(user.uid, entry.entryId),
    ]);
    await this.removeFromStash(instruction.itemId);
    return { pointsAwarded: POINT_VALUES.CORRECT_SORT, newlyUnlockedSkin, streakMilestoneDays };
  }

  // FR-74/75: stash lives in AsyncStorage so it survives app restarts; an
  // item leaves the stash only when its drop-off is confirmed.
  static async getStash(): Promise<StashItem[]> {
    try {
      const raw = await AsyncStorage.getItem(ASYNC_STORAGE_KEYS.STASH);
      return raw ? (JSON.parse(raw) as StashItem[]) : [];
    } catch {
      return [];
    }
  }

  static async saveForLater(instruction: Pick<DisposalInstruction, 'itemId' | 'itemLabel' | 'zoneId'>): Promise<StashItem[]> {
    const stash = (await this.getStash()).filter((s) => s.itemId !== instruction.itemId);
    stash.unshift({
      itemId: instruction.itemId,
      itemLabel: instruction.itemLabel,
      zoneId: instruction.zoneId,
      savedAt: new Date().toISOString(),
    });
    await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.STASH, JSON.stringify(stash));
    return stash;
  }

  static async removeFromStash(itemId: string): Promise<void> {
    const stash = (await this.getStash()).filter((s) => s.itemId !== itemId);
    await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.STASH, JSON.stringify(stash));
  }
}
