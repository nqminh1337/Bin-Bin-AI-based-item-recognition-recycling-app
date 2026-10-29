/**
 * Shared constants used across multiple features. Feature-specific
 * constants belong inside that feature's own folder, not here.
 */

export const APP_NAME = 'Bin Bin';

// Firestore top-level collection names, kept in one place so a rename is a one-line change.
export const FIRESTORE_COLLECTIONS = {
  USERS: 'users',
  ZONES: 'zones',
  DISPOSAL_RULES: 'disposalRules',
  DROP_OFF_LOCATIONS: 'dropOffLocations',
  /** One doc per zoneId: bins, frequencies and official guideline links. */
  COUNCIL_GUIDELINES: 'councilGuidelines',
  GUIDANCE_REPORTS: 'guidanceReports',
  POINTS_LEDGER: 'pointsLedger',
  LEADERBOARD: 'leaderboard',
  PET_STATE: 'petState',
  /** One doc per correctly-sorted item, written by PetService.feed(). Weekly
   *  recap material breakdown (FR-57) reads this; pointsLedger has no material field. */
  PET_FEED_EVENTS: 'petFeedEvents',
  /** One doc per (userId, weekStartDate), written when a weekly recap is
   *  generated. Lets the *next* recap report a rank change (FR-56). */
  PROFILE_WEEKLY_SNAPSHOTS: 'profileWeeklySnapshots',
} as const;

export const ASYNC_STORAGE_KEYS = {
  // Serialised CouncilZone, cached so cold start needs no GPS/network (FR-23).
  CURRENT_ZONE: 'binbin:currentZone',
  // 'true' when the user picked the zone manually; stops GPS from overriding it.
  ZONE_IS_MANUAL: 'binbin:zoneIsManual',
  /** Serialised SavedLocation: the address typed in as a stand-in for GPS. */
  SAVED_LOCATION: 'binbin:savedLocation',
  /** Scan label → catalog item id Gemini picked, so a repeat scan needs no AI call. */
  ITEM_MATCHES: 'binbin:itemMatches',
  /** FR-74/75: depot-only items saved for later, until drop-off is confirmed. */
  STASH: 'binbin:stash',
  /** FR-61: persists the user's push-notification on/off choice. */
  PUSH_NOTIFICATIONS_ENABLED: 'binbin:pushNotificationsEnabled',
} as const;
