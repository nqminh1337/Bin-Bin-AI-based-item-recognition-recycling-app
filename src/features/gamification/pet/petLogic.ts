import { DIET_GOAL, HUNGRY_AFTER_MS, ITEMS_PER_LEVEL, LEVELS_PER_SKIN, MATERIAL_ORDER } from './constants';
import type { FeedResult, MaterialType, PetState } from './types';

/** Pure functions only: no IO, so they're trivial to unit test. */

export function createInitialPet(userId: string): PetState {
  const diet = {} as PetState['diet'];
  MATERIAL_ORDER.forEach((m) => {
    diet[m] = { fed: 0, goal: DIET_GOAL };
  });
  return {
    petId: `pet-${userId}`,
    userId,
    level: 1,
    equippedSkinId: null,
    unlockedSkinIds: [],
    diet,
    lastFedAt: null,
  };
}

/** Fill in any missing fields so an older/partial Firestore doc never crashes the UI. */
export function normalisePet(userId: string, raw: Partial<PetState> | null | undefined): PetState {
  const base = createInitialPet(userId);
  if (!raw) return base;
  MATERIAL_ORDER.forEach((m) => {
    const meter = raw.diet?.[m];
    if (meter) base.diet[m] = { fed: meter.fed ?? 0, goal: meter.goal ?? DIET_GOAL };
  });
  return {
    ...base,
    equippedSkinId: raw.equippedSkinId ?? null,
    unlockedSkinIds: raw.unlockedSkinIds ?? [],
    lastFedAt: raw.lastFedAt ?? null,
  };
}

function totalFed(pet: PetState): number {
  return MATERIAL_ORDER.reduce((sum, m) => sum + pet.diet[m].fed, 0);
}

/** FR-52-ish: level grows with total items fed, plus a bonus per skin owned. */
export function computeLevel(pet: PetState): number {
  return 1 + Math.floor(totalFed(pet) / ITEMS_PER_LEVEL) + LEVELS_PER_SKIN * pet.unlockedSkinIds.length;
}

/** FR-45 / FR-48: feed a material; unlock its skin exactly once at the goal. */
export function applyFeed(pet: PetState, material: MaterialType, quantity: number, now: number): FeedResult {
  if (quantity <= 0) return { pet, materialFed: material, fedAmount: 0, newlyUnlockedSkin: null };

  const meter = pet.diet[material];
  const fed = Math.min(meter.goal, meter.fed + quantity);
  const alreadyUnlocked = pet.unlockedSkinIds.includes(material);
  const unlockNow = fed >= meter.goal && !alreadyUnlocked;

  const next: PetState = {
    ...pet,
    lastFedAt: now,
    diet: { ...pet.diet, [material]: { ...meter, fed } },
    unlockedSkinIds: unlockNow ? [...pet.unlockedSkinIds, material] : pet.unlockedSkinIds,
  };
  next.level = computeLevel(next);

  return { pet: next, materialFed: material, fedAmount: fed - meter.fed, newlyUnlockedSkin: unlockNow ? material : null };
}

/** FR-50 */
export function applyEquip(pet: PetState, skinId: MaterialType | null): PetState {
  if (skinId !== null && !pet.unlockedSkinIds.includes(skinId)) {
    throw new Error(`Skin "${skinId}" is not unlocked`);
  }
  return { ...pet, equippedSkinId: skinId };
}

export function isHungry(pet: PetState, now: number = Date.now()): boolean {
  return pet.lastFedAt === null || now - pet.lastFedAt > HUNGRY_AFTER_MS;
}
