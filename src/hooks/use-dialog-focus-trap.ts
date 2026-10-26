import { type RefObject, useEffect, useRef } from "react";

export function getFocusableElements(
  container: HTMLElement | null,
): HTMLElement[] {
  return Array.from(
    container?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ) ?? [],
  );
}

function cycleTabFocus(
  event: KeyboardEvent,
  first: HTMLElement,
  last: HTMLElement,
): void {
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
    return;
  }
  if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function trapSingleFocus(
  event: KeyboardEvent,
  focusable: HTMLElement[],
): boolean {
  if (focusable.length === 0) {
    event.preventDefault();
    return true;
  }
  if (focusable.length === 1) {
    event.preventDefault();
    focusable[0].focus();
    return true;
  }
  return false;
}

function handleEscapedFocus(
  event: KeyboardEvent,
  first: HTMLElement,
  last: HTMLElement,
): void {
  event.preventDefault();
  if (event.shiftKey) {
    last.focus();
    return;
  }
  first.focus();
}

function handleTabKey(
  event: KeyboardEvent,
  container: HTMLElement | null,
): void {
  const focusable = getFocusableElements(container);
  if (trapSingleFocus(event, focusable)) {
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (container && !container.contains(document.activeElement)) {
    handleEscapedFocus(event, first, last);
    return;
  }
  cycleTabFocus(event, first, last);
}

export interface UseDialogFocusTrapOptions<
  TElement extends HTMLElement = HTMLButtonElement,
> {
  isOpen?: boolean;
  onClose: () => void;
  containerRef?: RefObject<HTMLDivElement | null>;
  initialFocusRef?: RefObject<TElement | null>;
}

export function useDialogFocusTrap<
  TElement extends HTMLElement = HTMLButtonElement,
>({
  isOpen = true,
  onClose,
  containerRef: externalContainerRef,
  initialFocusRef: externalInitialFocusRef,
}: UseDialogFocusTrapOptions<TElement>) {
  const internalContainerRef = useRef<HTMLDivElement | null>(null);
  const internalInitialFocusRef = useRef<TElement | null>(null);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const containerRef = externalContainerRef ?? internalContainerRef;
  const initialFocusRef = externalInitialFocusRef ?? internalInitialFocusRef;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    lastFocusedElementRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const focusTimeout = window.setTimeout(() => {
      if (initialFocusRef.current) {
        initialFocusRef.current.focus();
      } else {
        const focusable = getFocusableElements(containerRef.current);
        focusable[0]?.focus();
      }
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (event.key === "Tab") {
        handleTabKey(event, containerRef.current);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimeout);
      window.removeEventListener("keydown", handleKeyDown);
      lastFocusedElementRef.current?.focus();
    };
  }, [isOpen, containerRef, initialFocusRef]);

  return { containerRef, initialFocusRef };
}
