import { FirestoreClient } from '@services/FirestoreClient';
import { FIRESTORE_COLLECTIONS, generateId } from '@utils/index';
import { where } from 'firebase/firestore';
import { createInitialPet, normalisePet } from './petLogic';
import type { MaterialType, PetFeedEvent, PetState } from './types';

/**
 * Persists through FirestoreClient, same as PointsService/LeaderboardService.
 * One PetState doc per user (docId = userId), same "deterministic doc id"
 * pattern LeaderboardService uses for its one-row-per-user collection.
 *
 * Known limitation: like the rest of the app's Firestore layer, this is a
 * plain read-then-write, not a transaction (FirestoreClient has no
 * transaction helper). Two feeds firing back-to-back on the same device
 * faster than a round trip could in theory race; not a concern for a
 * single-device prototype.
 */
export class PetRepository {
  static async getState(userId: string): Promise<PetState> {
    const doc = await FirestoreClient.getDocument<PetState>(FIRESTORE_COLLECTIONS.PET_STATE, userId);
    return normalisePet(userId, doc);
  }

  static async saveState(pet: PetState): Promise<void> {
    await FirestoreClient.setDocument(FIRESTORE_COLLECTIONS.PET_STATE, pet.userId, pet);
  }

  /** FR-57: one doc per correct sort, so the weekly recap can break totals down by material. */
  static async logFeedEvent(userId: string, material: MaterialType, quantity: number): Promise<void> {
    const event: PetFeedEvent = {
      eventId: generateId(),
      userId,
      material,
      quantity,
      createdAt: new Date().toISOString(),
    };
    await FirestoreClient.setDocument(FIRESTORE_COLLECTIONS.PET_FEED_EVENTS, event.eventId, event);
  }

  static async getFeedEvents(userId: string): Promise<PetFeedEvent[]> {
    return FirestoreClient.queryCollection<PetFeedEvent>(
      FIRESTORE_COLLECTIONS.PET_FEED_EVENTS,
      where('userId', '==', userId),
    );
  }
}

// Re-exported so petLogic's pure helpers don't need their own public surface.
export { createInitialPet };
