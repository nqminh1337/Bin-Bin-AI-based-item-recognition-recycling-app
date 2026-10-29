/**
 * Domain types for Bin Bin, the virtual pet fed by each correctly sorted
 * material. These material names are intentionally specific because the pet's
 * diet is tracked separately for each material type.
 */
export type MaterialType =
  | 'glass'
  | 'cardboard'
  | 'paper'
  | 'aluminium'
  | 'steel'
  | 'hard_plastic'
  | 'soft_plastic'
  | 'organics'
  | 'ewaste'
  | 'battery'
  | 'textiles'
  | 'general_waste'
  | 'uncategorized';

export interface DietMeter {
  fed: number;
  goal: number;
}

export interface PetSkin {
  skinId: MaterialType;
  name: string;
  unlocked: boolean;
  /** Items of the material that must be fed to unlock it. */
  unlockRequirementItems: number;
}

export interface PetState {
  petId: string;
  userId: string;
  level: number;
  equippedSkinId: MaterialType | null;
  unlockedSkinIds: MaterialType[];
  diet: Record<MaterialType, DietMeter>;
  /** epoch ms of the most recent feed; null if never fed. Drives the "hungry" badge. */
  lastFedAt: number | null;
}

export interface FeedResult {
  pet: PetState;
  materialFed: MaterialType;
  fedAmount: number;
  /** Set only on the feed that crossed a material's goal, exactly once per skin (FR-48). */
  newlyUnlockedSkin: MaterialType | null;
}

/** One confirmed correct sort, logged so the weekly recap can break it down by material (FR-57). */
export interface PetFeedEvent {
  eventId: string;
  userId: string;
  material: MaterialType;
  quantity: number;
  createdAt: string; // ISO
}
