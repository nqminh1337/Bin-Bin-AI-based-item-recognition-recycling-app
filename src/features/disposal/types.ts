import type { IdentifiedItem } from '@features/scan';
import type { Coordinates, CouncilZone } from '@features/geolocation';

/**
 * Domain types for the disposal feature: the core feature that matches
 * an identified item and the user's council/zone to disposal instructions.
 */

export type DisposalCategory =
  | 'recycle'
  | 'compost'
  | 'landfill'
  | 'hazardous'
  | 'ewaste'
  | 'container_deposit';

/** What an item is made of: the key rules are looked up by (FR-24). */
export type MaterialKey =
  | 'glass'
  | 'cardboard'
  | 'paper'
  | 'aluminium'
  | 'steel'
  | 'hard_plastic'
  | 'soft_plastic'
  | 'organics' // food scraps; keeps the name the pet's Organics skin is fed by
  | 'garden'
  | 'carton' // milk and juice cartons: yellow bin, or blue where a council's paper bin takes them
  | 'coffee_cup' // plastic-lined paper cups: red almost everywhere, yellow in Willoughby
  | 'ewaste'
  | 'battery'
  | 'textiles'
  | 'general_waste'
  | 'uncategorized';

/**
 * A disposal rule as stored in Firestore `disposalRules`. One doc per
 * (zoneId, material). zoneId 'default' holds the fallback used when a
 * council has no override for that material.
 */
export interface DisposalRule {
  ruleId: string;
  zoneId: string;
  material: MaterialKey;
  /** FR-25 */
  kerbsideAccepted: boolean;
  category: DisposalCategory;
  /** FR-26: e.g. "Yellow recycling bin" or "Council drop-off depot" */
  binLabel: string;
  binColor: string;
  /** FR-27: plain-language explanation */
  reason: string;
  /** FR-28: ordered */
  prepSteps: string[];
}

/** Where a council is on food organics, per the NSW EPA's FOGO services list. */
export type OrganicsService = 'fogo' | 'fogo_planned' | 'garden_only';

export type BinStream = 'general' | 'recycling' | 'paper' | 'garden' | 'fogo' | 'food';

/** One kerbside bin a standard house gets. */
export interface BinService {
  stream: BinStream;
  label: string;
  lidColor: string;
  /** null = not confirmed from a council source; the UI points to the council calendar. */
  frequency: 'weekly' | 'fortnightly' | null;
  note?: string;
}

/**
 * A council's kerbside system and where to read its official guidelines.
 * Stored in Firestore `councilGuidelines` (doc id = zoneId) and bundled with
 * the app so the "Show guidelines" sheet works offline.
 */
export interface CouncilGuideline {
  zoneId: string;
  councilName: string;
  organics: OrganicsService;
  /** e.g. when FOGO starts, or how it differs from the usual green bin. */
  organicsNote?: string;
  /** 'blue' = paper and cardboard go in their own blue-lid bin. */
  paperBin: 'yellow' | 'blue';
  bins: BinService[];
  tips: string[];
  /** The council's own waste and recycling guide: what goes in which bin. */
  guideUrl: string;
  /** The council's bin-day lookup. Collection days are set per street, so we link rather than store them. */
  binDayUrl: string;
  sources: string[];
  /** When this entry was last checked against the sources (ISO date). */
  checkedAt: string;
}

/** What sort of drop-off point a location is; DROP_OFF_KINDS holds the labels. */
export type DropOffKind =
  | 'return_and_earn' // NSW container deposit scheme: 10c per drink container
  | 'community_recycling_centre' // NSW EPA CRC: paint, gas bottles, batteries, oils...
  | 'council_recycling_station' // council bins in libraries / community centres
  | 'battery_drop_off'; // B-cycle battery bin in a shop

/** A place that takes materials not accepted kerbside (FR-29). */
export interface DropOffLocation {
  locationId: string;
  zoneId: string;
  kind: DropOffKind;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  hours: string;
  acceptedMaterials: MaterialKey[];
  /** FR-69: shown on the hub card, e.g. 2 for "2× points today". Defaults to 1. */
  pointsMultiplier?: number;
  /** Site-specific tip, e.g. where the bin is inside the building. */
  note?: string;
  /** Copied from the zone's CouncilGuideline at seed time, so each location doc links to its council's rules. */
  councilName?: string;
  guideUrl?: string;
  binDayUrl?: string;
}

export interface NearestDropOff {
  location: DropOffLocation;
  /** null when the user's coordinates weren't available */
  distanceKm: number | null;
}

/** The rule resolved for a specific item, plus the nearest drop-off if needed. */
export interface DisposalInstruction extends DisposalRule {
  itemId: string;
  itemLabel: string;
  nearestDropOff: NearestDropOff | null;
}

export interface DisposalMatchResult {
  item: IdentifiedItem;
  zone: CouncilZone;
  /** null = explicit "no rule found" (FR-24) */
  instruction: DisposalInstruction | null;
  matchedAt: string;
}

/** FR-31 */
export interface GuidanceReport {
  reportId: string;
  userId: string | null;
  itemId: string;
  zoneId: string;
  ruleId: string | null;
  note: string;
  createdAt: string;
}

/** FR-71: which arrow a direction step is drawn with. */
export type ManeuverIcon = 'depart' | 'arrive' | 'left' | 'right' | 'straight' | 'uturn' | 'roundabout';

/** FR-71: one turn-by-turn instruction. */
export interface RouteStep {
  instruction: string;
  icon: ManeuverIcon;
  /** Distance walked after this maneuver, up to the next one. */
  distanceM: number;
  /** Index into WalkingRoute.path where this maneuver happens. */
  pathIndex: number;
}

/** FR-71/72: a walking route from the user to a drop-off point. */
export interface WalkingRoute {
  distanceM: number;
  durationS: number;
  /** The route line, start to finish. */
  path: Coordinates[];
  /** cumulativeM[i] = metres along the route at path[i]. */
  cumulativeM: number[];
  steps: RouteStep[];
}

/** FR-72: where the user is along a WalkingRoute right now. */
export interface RouteProgress {
  remainingM: number;
  etaS: number;
  /** How far the user is from the route line; large means they've wandered off it. */
  offRouteM: number;
  /** Index into WalkingRoute.steps of the next maneuver ahead. */
  nextStepIndex: number;
  distanceToNextM: number;
  arrived: boolean;
}

/** FR-74/75: a depot-only item the user has saved to drop off later. */
export interface StashItem {
  itemId: string;
  itemLabel: string;
  zoneId: string;
  savedAt: string;
}
