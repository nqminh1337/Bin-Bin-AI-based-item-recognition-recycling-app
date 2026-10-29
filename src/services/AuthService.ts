import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { auth } from './firebaseConfig';
import { FirestoreClient } from './FirestoreClient';
import type { UserProfile } from './types';
import { FIRESTORE_COLLECTIONS } from '@utils/constants';

/**
 * Thin wrapper around Firebase Auth shared across features. Screens and
 * feature services call through this rather than importing `firebase/auth`
 * directly, so the auth provider can be swapped or mocked in one place.
 */
export class AuthService {
  /** Currently signed-in user, or null. Synchronous snapshot; prefer useAuthSession() in components. */
  static getCurrentUser(): User | null {
    return auth.currentUser;
  }

  static async signUp(email: string, password: string, displayName?: string): Promise<User> {
    const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);
    const trimmedName = displayName?.trim() || null;
    if (trimmedName) {
      await updateProfile(user, { displayName: trimmedName });
    }

    // users/{uid} is the account record other features join against
    // (points ledger, pet state, leaderboard rows all key off this uid).
    const profile: UserProfile = {
      userId: user.uid,
      email: user.email ?? email.trim(),
      displayName: trimmedName,
      createdAt: new Date().toISOString(),
    };
    await FirestoreClient.setDocument(FIRESTORE_COLLECTIONS.USERS, user.uid, profile);

    return user;
  }

  /** Fetches the users/{uid} profile doc written at sign-up. Null if missing (e.g. account created before this existed). */
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    return FirestoreClient.getDocument<UserProfile>(FIRESTORE_COLLECTIONS.USERS, userId);
  }

  static async signIn(email: string, password: string): Promise<User> {
    const { user } = await signInWithEmailAndPassword(auth, email.trim(), password);
    return user;
  }

  static async signOut(): Promise<void> {
    await signOut(auth);
  }

  /** Fires immediately with the persisted session (if any), then on every change. Returns an unsubscribe fn. */
  static onAuthStateChanged(listener: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, listener);
  }

  /** Maps Firebase error codes to copy we can show the user. */
  static describeError(error: unknown): string {
    const code = (error as { code?: string })?.code ?? '';
    switch (code) {
      case 'auth/invalid-email':
        return 'That email address is not valid.';
      case 'auth/missing-password':
        return 'Please enter a password.';
      case 'auth/weak-password':
        return 'Password must be at least 6 characters.';
      case 'auth/email-already-in-use':
        return 'An account with that email already exists. Try signing in.';
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return 'Incorrect email or password.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please wait a moment and try again.';
      case 'auth/network-request-failed':
        return 'Network error. Check your connection and try again.';
      case 'auth/configuration-not-found':
      case 'auth/operation-not-allowed':
        return 'Email/password sign-in is not enabled for this Firebase project.';
      default:
        return 'Something went wrong. Please try again.';
    }
  }
}
