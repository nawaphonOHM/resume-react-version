import {
  createContext,
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { ImageAsset } from "../../resume-data";
import { ImageZoomPreview } from "./ImageZoomPreview";

export type ImageZoomActivation = "hover" | "touch";

export interface ImageZoomRequest {
  origin: HTMLImageElement;
  logo: ImageAsset;
  label: string;
  background?: string;
  activation: ImageZoomActivation;
}

export interface ImageZoomController {
  open(request: ImageZoomRequest): void;
  toggle(request: ImageZoomRequest): void;
  close(origin?: HTMLImageElement, activation?: ImageZoomActivation): void;
  isOpenFor(
    origin: HTMLImageElement,
    activation?: ImageZoomActivation,
  ): boolean;
}

export interface ImageZoomProviderProps {
  children: ReactNode;
}

interface ImageZoomStore {
  controller: ImageZoomController;
  subscribe: (listener: () => void) => () => void;
  getRequest: () => ImageZoomRequest | null;
}

const PREVIEW_SELECTOR = "[data-image-zoom-preview]";

const INERT_CONTROLLER: ImageZoomController = {
  open: () => {},
  toggle: () => {},
  close: () => {},
  isOpenFor: () => false,
};

export const ImageZoomContext =
  createContext<ImageZoomController>(INERT_CONTROLLER);

function createImageZoomStore(): ImageZoomStore {
  let current: ImageZoomRequest | null = null;
  const listeners = new Set<() => void>();

  const setRequest = (next: ImageZoomRequest | null) => {
    current = next;
    for (const notify of [...listeners]) {
      notify();
    }
  };
  const isOwnedBy = (
    origin?: HTMLImageElement,
    activation?: ImageZoomActivation,
  ) =>
    current !== null &&
    (!origin || current.origin === origin) &&
    (!activation || current.activation === activation);

  return {
    controller: {
      open: (request) => {
        if (current?.origin !== request.origin) {
          setRequest(request);
        }
      },
      toggle: (request) => {
        setRequest(isOwnedBy(request.origin) ? null : request);
      },
      close: (origin, activation) => {
        if (isOwnedBy(origin, activation)) {
          setRequest(null);
        }
      },
      isOpenFor: (origin, activation) => isOwnedBy(origin, activation),
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getRequest: () => current,
  };
}

function isOutsidePress(
  target: EventTarget | null,
  origin: HTMLImageElement,
): boolean {
  if (target === origin) {
    return false;
  }
  return !(
    target instanceof Element && target.closest(PREVIEW_SELECTOR) !== null
  );
}

function useImageZoomDismissal(
  request: ImageZoomRequest | null,
  controller: ImageZoomController,
): void {
  useEffect(() => {
    if (!request) {
      return;
    }

    const { origin } = request;
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (isOutsidePress(event.target, origin)) {
        controller.close(origin);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        controller.close(origin);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [request, controller]);
}

export function ImageZoomProvider({ children }: ImageZoomProviderProps) {
  const [store] = useState(createImageZoomStore);
  const request = useSyncExternalStore(store.subscribe, store.getRequest);
  const { controller } = store;
  const closeRequest = useCallback(() => {
    if (request) {
      controller.close(request.origin);
    }
  }, [controller, request]);

  useImageZoomDismissal(request, controller);

  return (
    <ImageZoomContext value={controller}>
      {children}
      {request && <ImageZoomPreview request={request} onClose={closeRequest} />}
    </ImageZoomContext>
  );
}
