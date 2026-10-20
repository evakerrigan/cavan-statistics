import { useCallback, useEffect, useRef, useState } from 'react';
import { loadManualShoots, saveManualShoots } from '@/lib/storage';
import type { ManualShoot } from '@/types/cavan';

export type ManualShootsUpdate = (shoots: ManualShoot[]) => ManualShoot[];

/** The user's hand-made shoots, persisted in extension storage. */
export const useManualShoots = () => {
  const [manualShoots, setManualShoots] = useState<ManualShoot[]>([]);
  const [ready, setReady] = useState(false);
  const current = useRef<ManualShoot[]>([]);

  useEffect(() => {
    loadManualShoots().then((stored) => {
      current.current = stored;
      setManualShoots(stored);
      setReady(true);
    });
  }, []);

  const update = useCallback((fn: ManualShootsUpdate) => {
    // A shoot with no images left is removed automatically.
    const next = fn(current.current).filter((s) => s.productIds.length);
    current.current = next;
    setManualShoots(next);
    saveManualShoots(next);
  }, []);

  return { manualShoots, ready, update };
};
