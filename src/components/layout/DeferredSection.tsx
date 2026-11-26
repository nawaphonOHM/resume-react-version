import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import LoaderInline from "@jetbrains/ring-ui-built/components/loader-inline/loader-inline";
import type { ResumeSectionId } from "../../resume-data";

export interface DeferredPlaceholder {
  id: ResumeSectionId;
  kicker: string;
  loadingTitle: string;
  loadingText: string;
  errorTitle: string;
}

export interface DeferredSectionProps {
  placeholders: readonly DeferredPlaceholder[];
  groupLabel?: string;
  renderAll: boolean;
  children: ReactNode;
}

type PlaceholderState = "loading" | "error";

interface PlaceholderViewProps {
  placeholders: readonly DeferredPlaceholder[];
  groupLabel?: string;
  state: PlaceholderState;
}

interface PlaceholderAnchorProps {
  placeholder: DeferredPlaceholder;
  state: PlaceholderState;
  standalone: boolean;
}

const ERROR_TEXT =
  "This section could not be loaded. Please reload the page to try again.";

function stateClassName(state: PlaceholderState): string {
  return state === "error"
    ? "resume-defer-error resume-defer-target"
    : "resume-defer-placeholder";
}

function stateAttributes(state: PlaceholderState) {
  return state === "error"
    ? { role: "alert", "data-resume-defer-error": "" }
    : {
        role: "status",
        "aria-busy": true,
        "data-resume-defer-placeholder": "",
      };
}

function groupAriaLabel(groupLabel: string, state: PlaceholderState): string {
  return state === "error"
    ? `${groupLabel.charAt(0).toUpperCase()}${groupLabel.slice(1)} are unavailable`
    : `Loading ${groupLabel}`;
}

function PlaceholderMessage({
  placeholder,
  state,
}: Omit<PlaceholderAnchorProps, "standalone">) {
  const failed = state === "error";

  return (
    <div className="resume-defer-message flex w-full items-start gap-4 p-[clamp(1.35rem,3vw,2rem)] text-muted shadow-[0_0.75rem_2rem_rgba(8,35,62,0.05)]">
      {!failed && (
        <span className="resume-defer-spinner" aria-hidden="true">
          <LoaderInline />
        </span>
      )}
      <div>
        <p className="resume-defer-kicker mb-[0.55rem] text-xs font-extrabold uppercase tracking-[0.12em] text-accent">
          {placeholder.kicker}
        </p>
        <h2
          id={`${placeholder.id}-${state}-title`}
          className="m-0 text-[clamp(1.45rem,3vw,2rem)] font-bold leading-[1.15] text-ink"
        >
          {failed ? placeholder.errorTitle : placeholder.loadingTitle}
        </h2>
        <p className="mt-3 leading-[1.65]">
          {failed ? ERROR_TEXT : placeholder.loadingText}
        </p>
      </div>
    </div>
  );
}

function PlaceholderAnchor({
  placeholder,
  state,
  standalone,
}: PlaceholderAnchorProps) {
  const anchorClassName = `resume-defer-anchor resume-defer-reserve--${placeholder.id} scroll-mt-24`;

  return (
    <section
      id={placeholder.id}
      className={
        standalone
          ? `${stateClassName(state)} ${anchorClassName}`
          : anchorClassName
      }
      data-resume-section=""
      aria-labelledby={`${placeholder.id}-${state}-title`}
      tabIndex={-1}
      {...(standalone ? stateAttributes(state) : undefined)}
    >
      <PlaceholderMessage placeholder={placeholder} state={state} />
    </section>
  );
}

function PlaceholderView({
  placeholders,
  groupLabel,
  state,
}: PlaceholderViewProps) {
  const anchors = placeholders.map((placeholder) => (
    <PlaceholderAnchor
      key={placeholder.id}
      placeholder={placeholder}
      state={state}
      standalone={groupLabel === undefined}
    />
  ));

  if (groupLabel === undefined) {
    return anchors;
  }

  return (
    <div
      className={stateClassName(state)}
      aria-label={groupAriaLabel(groupLabel, state)}
      {...stateAttributes(state)}
    >
      {anchors}
    </div>
  );
}

interface SectionErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

interface SectionErrorBoundaryState {
  hasError: boolean;
}

class SectionErrorBoundary extends Component<
  SectionErrorBoundaryProps,
  SectionErrorBoundaryState
> {
  state: SectionErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): SectionErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

interface DeferredContentProps {
  onMount: (content: HTMLElement | null) => void;
  children: ReactNode;
}

function DeferredContent({ onMount, children }: DeferredContentProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    onMount(contentRef.current);
  }, [onMount]);

  return (
    <div ref={contentRef} className="resume-defer-target">
      {children}
    </div>
  );
}

function hasCurrentFragment(
  placeholders: readonly DeferredPlaceholder[],
): boolean {
  const fragment = window.location.hash.slice(1);
  return placeholders.some((placeholder) => placeholder.id === fragment);
}

function shouldInitiallyRender(
  placeholders: readonly DeferredPlaceholder[],
): boolean {
  return (
    typeof IntersectionObserver === "undefined" ||
    hasCurrentFragment(placeholders)
  );
}

function scrollToCurrentFragment(container: HTMLElement | null): void {
  const target = document.getElementById(window.location.hash.slice(1));
  if (!target || !container?.contains(target)) {
    return;
  }

  const scrollIntoView: unknown = Reflect.get(target, "scrollIntoView");
  if (typeof scrollIntoView === "function") {
    scrollIntoView.call(target);
  }
}

function useViewportEntry(
  targetRef: RefObject<HTMLElement | null>,
  active: boolean,
  onEnter: () => void,
): void {
  useEffect(() => {
    const target = targetRef.current;
    if (!active || !target) {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        onEnter();
      }
    });
    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [targetRef, active, onEnter]);
}

function useFragmentEntry(
  placeholders: readonly DeferredPlaceholder[],
  onEnter: () => void,
): void {
  useEffect(() => {
    const handleHashChange = () => {
      if (hasCurrentFragment(placeholders)) {
        onEnter();
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [placeholders, onEnter]);
}

function useDeferredTrigger(placeholders: readonly DeferredPlaceholder[]) {
  const [triggered, setTriggered] = useState(() =>
    shouldInitiallyRender(placeholders),
  );
  const [startedOnFragment] = useState(() => hasCurrentFragment(placeholders));
  const pendingScrollRef = useRef(startedOnFragment);
  const mountedRef = useRef(false);

  const enterViewport = useCallback(() => {
    setTriggered(true);
  }, []);
  const enterFragment = useCallback(() => {
    pendingScrollRef.current = !mountedRef.current;
    setTriggered(true);
  }, []);
  const handleMount = useCallback((content: HTMLElement | null) => {
    mountedRef.current = true;
    if (pendingScrollRef.current) {
      pendingScrollRef.current = false;
      scrollToCurrentFragment(content);
    }
  }, []);

  useFragmentEntry(placeholders, enterFragment);

  return { triggered, enterViewport, handleMount };
}

export function DeferredSection({
  placeholders,
  groupLabel,
  renderAll,
  children,
}: DeferredSectionProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { triggered, enterViewport, handleMount } =
    useDeferredTrigger(placeholders);
  const shouldRender = renderAll || triggered;

  useViewportEntry(wrapperRef, !shouldRender, enterViewport);

  const renderPlaceholder = (state: PlaceholderState) => (
    <PlaceholderView
      placeholders={placeholders}
      groupLabel={groupLabel}
      state={state}
    />
  );

  return (
    <div ref={wrapperRef}>
      {shouldRender ? (
        <SectionErrorBoundary fallback={renderPlaceholder("error")}>
          <Suspense fallback={renderPlaceholder("loading")}>
            <DeferredContent onMount={handleMount}>{children}</DeferredContent>
          </Suspense>
        </SectionErrorBoundary>
      ) : (
        renderPlaceholder("loading")
      )}
    </div>
  );
}
