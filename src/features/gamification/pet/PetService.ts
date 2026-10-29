import { MATERIAL_ORDER, SKINS } from './constants';
import { applyEquip, applyFeed } from './petLogic';
import { PetRepository } from './petRepository';
import type { FeedResult, MaterialType, PetSkin, PetState } from './types';

type Listener = () => void;

/**
 * Public API for the pet feature. Other features call `feed()` after a
 * confirmed correct sort (see DisposalService.completeGuidance /
 * confirmDropOff); if it returns `newlyUnlockedSkin`, the caller should
 * route to the Skin Unlocked screen (FR-49).
 */
export class PetService {
  private static listeners = new Set<Listener>();

  private static emit() {
    PetService.listeners.forEach((l) => l());
  }

  static async getState(userId: string): Promise<PetState> {
    return PetRepository.getState(userId);
  }

  /** FR-45 / FR-48. quantity defaults to 1: one correctly sorted item. */
  static async feed(userId: string, material: MaterialType, quantity = 1): Promise<FeedResult> {
    const current = await PetRepository.getState(userId);
    const result = applyFeed(current, material, quantity, Date.now());
    await PetRepository.saveState(result.pet);
    if (result.fedAmount > 0) {
      await PetRepository.logFeedEvent(userId, material, result.fedAmount);
    }
    PetService.emit();
    return result;
  }

  /** Every skin, each marked with this user's unlock status (for Profile's skin grid). */
  static async getAvailableSkins(userId: string): Promise<PetSkin[]> {
    const pet = await PetRepository.getState(userId);
    return MATERIAL_ORDER.map((id) => ({
      skinId: id,
      name: SKINS[id].name,
      unlocked: pet.unlockedSkinIds.includes(id),
      unlockRequirementItems: pet.diet[id].goal,
    }));
  }

  /** FR-50 */
  static async equipSkin(userId: string, skinId: MaterialType | null): Promise<PetState> {
    const current = await PetRepository.getState(userId);
    const next = applyEquip(current, skinId);
    await PetRepository.saveState(next);
    PetService.emit();
    return next;
  }

  /** Lets every screen showing the pet re-render after a change (FR-50: "everywhere"). */
  static subscribe(listener: Listener): () => void {
    PetService.listeners.add(listener);
    return () => {
      PetService.listeners.delete(listener);
    };
  }
}
