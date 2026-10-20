import { useSyncExternalStore } from 'react';

/** Whether a CSS media query currently matches; updates live on resize. */
export const useMediaQuery = (query: string) =>
  useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches
  );

/** Below this width tables switch to their compact layout. */
export const COMPACT_QUERY = '(max-width: 1023px)';
