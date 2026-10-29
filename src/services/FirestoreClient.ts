import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  type DocumentData,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from './firebaseConfig';

/**
 * Thin, generic wrapper around Firestore reads/writes shared across
 * features. Feature services call through this rather than importing
 * `firebase/firestore` directly, so the data layer can be swapped or
 * mocked in one place.
 *
 * `collectionPath` is a path relative to FIRESTORE_COLLECTIONS in
 * @utils/constants, e.g. FirestoreClient.getDocument(FIRESTORE_COLLECTIONS.USERS, userId).
 */
export class FirestoreClient {
  static async getDocument<T = DocumentData>(
    collectionPath: string,
    docId: string
  ): Promise<T | null> {
    const snapshot = await getDoc(doc(db, collectionPath, docId));
    return snapshot.exists() ? ({ ...snapshot.data(), id: snapshot.id } as T) : null;
  }

  static async setDocument<T extends DocumentData>(
    collectionPath: string,
    docId: string,
    data: T
  ): Promise<void> {
    await setDoc(doc(db, collectionPath, docId), data);
  }

  static async updateDocument<T extends Partial<DocumentData>>(
    collectionPath: string,
    docId: string,
    data: T
  ): Promise<void> {
    await updateDoc(doc(db, collectionPath, docId), data);
  }

  static async deleteDocument(collectionPath: string, docId: string): Promise<void> {
    await deleteDoc(doc(db, collectionPath, docId));
  }

  static async queryCollection<T = DocumentData>(
    collectionPath: string,
    ...constraints: QueryConstraint[]
  ): Promise<T[]> {
    const snapshot = await getDocs(query(collection(db, collectionPath), ...constraints));
    return snapshot.docs.map((d) => ({ ...d.data(), id: d.id }) as T);
  }
}
