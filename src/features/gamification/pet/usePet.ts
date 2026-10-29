import { useAuthSession } from '@services/useAuthSession';
import { useCallback, useEffect, useState } from 'react';
import { PetService } from './PetService';
import type { PetState } from './types';

export function usePet() {
  const { user } = useAuthSession();
  const userId = user?.uid ?? null;
  const [pet, setPet] = useState<PetState | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      setPet(await PetService.getState(userId));
      setError(null);
    } catch (e) {
      setError(e as Error);
    }
  }, [userId]);

  useEffect(() => {
    load();
    return PetService.subscribe(load);
  }, [load]);

  return { pet, userId, loading: pet === null && error === null, error, refresh: load };
}
