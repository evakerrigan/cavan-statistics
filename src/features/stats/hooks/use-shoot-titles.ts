import { loadShootTitles, saveShootTitles } from '@/lib/storage';
import type { ShootTitles } from '@/types/cavan';
import { useStoredState } from './use-stored-state';

const EMPTY: ShootTitles = {};

/** Names the user gave to older Cavan shoots, persisted in extension storage. */
export const useShootTitles = () =>
  useStoredState(loadShootTitles, saveShootTitles, EMPTY);
