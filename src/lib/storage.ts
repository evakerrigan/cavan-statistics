import type { Dataset } from '@/types/cavan';

const DATASET_KEY = 'dataset';

// Outside the extension (plain `npm run dev`) chrome.storage is unavailable,
// so fall back to localStorage to keep the UI usable while developing.
const hasChromeStorage = () =>
  typeof chrome !== 'undefined' && !!chrome.storage?.local;

export const loadDataset = async (): Promise<Dataset | null> => {
  if (hasChromeStorage()) {
    const stored = await chrome.storage.local.get(DATASET_KEY);
    return (stored[DATASET_KEY] as Dataset | undefined) ?? null;
  }
  try {
    const raw = localStorage.getItem(DATASET_KEY);
    return raw ? (JSON.parse(raw) as Dataset) : null;
  } catch {
    return null;
  }
};

export const saveDataset = async (dataset: Dataset): Promise<void> => {
  if (hasChromeStorage()) {
    await chrome.storage.local.set({ [DATASET_KEY]: dataset });
    return;
  }
  localStorage.setItem(DATASET_KEY, JSON.stringify(dataset));
};
