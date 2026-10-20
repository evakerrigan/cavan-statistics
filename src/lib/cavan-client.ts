/**
 * Talks to Cavan's own JSON API from inside a cavanimages.com tab.
 *
 * Requests are executed in the page itself (`world: 'MAIN'`), so they carry the
 * user's existing login session and CSRF token exactly like the site's own
 * requests do. Nothing is stored or sent anywhere else.
 */

export const CAVAN_ORIGIN = 'https://www.cavanimages.com';
const CAVAN_TAB_URL = `${CAVAN_ORIGIN}/account/reporting/sales`;
const REQUEST_DELAY_MS = 300;

export class CavanAuthError extends Error {
  constructor() {
    super(
      'Cavan не вернул данные. Проверьте, что вы вошли в аккаунт на cavanimages.com.'
    );
    this.name = 'CavanAuthError';
  }
}

export const isExtensionContext = (): boolean =>
  typeof chrome !== 'undefined' && !!chrome.scripting;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const waitForTabLoad = (tabId: number) =>
  new Promise<void>((resolve) => {
    const listener = (id: number, info: chrome.tabs.OnUpdatedInfo) => {
      if (id === tabId && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });

export type CavanSession = {
  post: <T>(path: string, body: unknown) => Promise<T>;
  close: () => Promise<void>;
};

/**
 * Finds an open cavanimages.com tab (or opens one in the background) and
 * returns a session for making API calls through it.
 */
export const openCavanSession = async (): Promise<CavanSession> => {
  const existing = await chrome.tabs.query({ url: `${CAVAN_ORIGIN}/*` });
  let tabId = existing.find((t) => t.status === 'complete')?.id;
  let createdTab = false;

  if (tabId === undefined) {
    const tab = await chrome.tabs.create({ url: CAVAN_TAB_URL, active: false });
    tabId = tab.id!;
    createdTab = true;
    await waitForTabLoad(tabId);
  }

  const targetTabId = tabId;

  const post = async <T>(path: string, body: unknown): Promise<T> => {
    const [injection] = await chrome.scripting.executeScript({
      target: { tabId: targetTabId },
      world: 'MAIN',
      args: [path, body],
      // Runs inside the Cavan page: must be self-contained.
      func: async (url: string, payload: unknown) => {
        const page = window as unknown as {
          Laravel?: { csrfToken?: string };
        };
        const token =
          page.Laravel?.csrfToken ??
          document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute('content') ??
          '';
        const res = await fetch(url, {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRF-TOKEN': token,
          },
          body: JSON.stringify(payload),
        });
        return { status: res.status, text: await res.text() };
      },
    });

    await sleep(REQUEST_DELAY_MS);

    const result = injection?.result;
    if (!result || result.status === 401 || result.status === 419) {
      throw new CavanAuthError();
    }
    if (result.status >= 400) {
      throw new Error(`Cavan ответил ошибкой ${result.status} на ${path}`);
    }
    try {
      return JSON.parse(result.text) as T;
    } catch {
      // A redirect to the login page comes back as HTML.
      throw new CavanAuthError();
    }
  };

  const close = async () => {
    if (createdTab) await chrome.tabs.remove(targetTabId);
  };

  return { post, close };
};
