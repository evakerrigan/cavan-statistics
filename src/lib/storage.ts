import type { Dataset, ManualShoot } from '@/types/cavan';

const DATASET_KEY = 'dataset';
const MANUAL_SHOOTS_KEY = 'manualShoots';

// Outside the extension (plain `npm run dev`) chrome.storage is unavailable,
// so fall back to localStorage to keep the UI usable while developing.
const hasChromeStorage = () =>
  typeof chrome !== 'undefined' && !!chrome.storage?.local;

const read = async <T>(key: string): Promise<T | null> => {
  if (hasChromeStorage()) {
    const stored = await chrome.storage.local.get(key);
    return (stored[key] as T | undefined) ?? null;
  }
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

const write = async (key: string, value: unknown): Promise<void> => {
  if (hasChromeStorage()) {
    await chrome.storage.local.set({ [key]: value });
    return;
  }
  localStorage.setItem(key, JSON.stringify(value));
};

export const loadDataset = () => read<Dataset>(DATASET_KEY);

export const saveDataset = (dataset: Dataset) => write(DATASET_KEY, dataset);

export const loadManualShoots = async () =>
  (await read<ManualShoot[]>(MANUAL_SHOOTS_KEY)) ?? [];

export const saveManualShoots = (shoots: ManualShoot[]) =>
  write(MANUAL_SHOOTS_KEY, shoots);
