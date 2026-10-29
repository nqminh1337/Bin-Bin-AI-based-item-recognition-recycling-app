import type { User } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { AuthService } from './AuthService';

export interface AuthSession {
  user: User | null;
  /** True until Firebase has restored (or ruled out) a persisted session. Gate routing on this. */
  isLoading: boolean;
}

/**
 * Subscribes to the Firebase auth state. On cold start Firebase reads the
 * persisted session from AsyncStorage asynchronously, so `isLoading` stays
 * true until the first callback; render a splash rather than the sign-in
 * screen during that window or logged-in users will see a flash of it.
 */
export function useAuthSession(): AuthSession {
  const [session, setSession] = useState<AuthSession>({ user: null, isLoading: true });

  useEffect(() => {
    return AuthService.onAuthStateChanged((user) => setSession({ user, isLoading: false }));
  }, []);

  return session;
}
