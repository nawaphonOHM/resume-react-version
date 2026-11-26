type MediaQueryListener = (event: MediaQueryListEvent) => void;

interface MediaQueryStub {
  readonly list: MediaQueryList;
  readonly listeners: Set<MediaQueryListener>;
  matches: boolean;
}

const mediaQueryStubs = new Map<string, MediaQueryStub>();

type MediaQueryListStub = Pick<
  MediaQueryList,
  "media" | "matches" | "onchange" | "dispatchEvent"
> & {
  addEventListener(type: string, listener: MediaQueryListener): void;
  removeEventListener(type: string, listener: MediaQueryListener): void;
};

function createMediaQueryStub(media: string): MediaQueryStub {
  const listeners = new Set<MediaQueryListener>();
  const list: MediaQueryListStub = {
    media,
    onchange: null,
    get matches() {
      return stub.matches;
    },
    addEventListener: (_type, listener) => {
      listeners.add(listener);
    },
    removeEventListener: (_type, listener) => {
      listeners.delete(listener);
    },
    dispatchEvent: () => true,
  };
  const stub: MediaQueryStub = {
    listeners,
    matches: false,
    list: list as MediaQueryList,
  };

  return stub;
}

function getMediaQueryStub(media: string): MediaQueryStub {
  const existing = mediaQueryStubs.get(media);
  if (existing) {
    return existing;
  }

  const created = createMediaQueryStub(media);
  mediaQueryStubs.set(media, created);
  return created;
}

export const DARK_SCHEME_QUERY = "(prefers-color-scheme: dark)";

export function installMatchMedia(): void {
  window.matchMedia = (query: string) => getMediaQueryStub(query).list;
}

export function setMediaQueryMatches(media: string, matches: boolean): void {
  const stub = getMediaQueryStub(media);
  stub.matches = matches;
  const event = { matches, media } as MediaQueryListEvent;
  for (const listener of [...stub.listeners]) {
    listener(event);
  }
}

export function mediaQueryListenerCount(media: string): number {
  return getMediaQueryStub(media).listeners.size;
}

export function resetMatchMedia(): void {
  for (const stub of mediaQueryStubs.values()) {
    stub.matches = false;
  }
  installMatchMedia();
}

installMatchMedia();
