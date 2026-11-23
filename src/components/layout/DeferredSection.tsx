import {
  Component,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ResumeSectionId } from "../../resume-data";

const NO_ANCHORS: readonly ResumeSectionId[] = [];

interface DeferredSectionProps {
  sectionId: ResumeSectionId;
  anchorIds?: readonly ResumeSectionId[];
  title: string;
  children: ReactNode;
  renderAll: boolean;
}

interface SectionPlaceholderProps {
  sectionId: ResumeSectionId;
  anchorIds: readonly ResumeSectionId[];
  title: string;
  failed?: boolean;
  onRetry?: () => void;
}

function SectionPlaceholder({
  sectionId,
  anchorIds,
  title,
  failed = false,
  onRetry,
}: SectionPlaceholderProps) {
  const headingId = `${sectionId}-deferred-title`;

  return (
    <section
      id={sectionId}
      data-resume-section
      aria-labelledby={headingId}
      aria-busy={!failed}
      className={`deferred-section deferred-section--${sectionId} scroll-mt-24 rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] p-6 sm:p-8`}
      role={failed ? "alert" : undefined}
    >
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--app-accent)] sm:text-sm">
        {failed ? "Section unavailable" : "Preparing résumé"}
      </p>
      <h2
        id={headingId}
        className="mt-2 text-2xl font-bold tracking-tight text-[var(--app-heading)] sm:text-3xl"
      >
        {failed ? `Unable to display ${title}` : title}
      </h2>
      {failed ? (
        <div className="mt-4">
          <p className="text-sm leading-relaxed text-[var(--app-muted)]">
            This section could not be displayed. You can try loading it again.
          </p>
          <button
            type="button"
            className="mt-4 rounded-lg border border-[color:var(--app-border)] px-4 py-2 text-sm font-semibold text-[var(--app-heading)] hover:bg-[var(--app-surface-raised)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-accent)]"
            onClick={onRetry}
          >
            Retry section
          </button>
        </div>
      ) : (
        <>
          <p
            className="mt-3 text-sm text-[var(--app-muted)]"
            role="status"
            aria-live="polite"
          >
            Loading {title.toLowerCase()}…
          </p>
          <div
            aria-hidden="true"
            className="mt-6 h-24 animate-pulse rounded-2xl bg-[var(--app-surface-raised)]"
          />
        </>
      )}
      {anchorIds.length > 0 && (
        <div className="sr-only" aria-hidden="true">
          {anchorIds.map((id) => (
            <span id={id} key={id} />
          ))}
        </div>
      )}
    </section>
  );
}

interface SectionErrorBoundaryProps {
  sectionId: ResumeSectionId;
  anchorIds: readonly ResumeSectionId[];
  title: string;
  onRetry: () => void;
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
    if (this.state.hasError) {
      return (
        <SectionPlaceholder
          sectionId={this.props.sectionId}
          anchorIds={this.props.anchorIds}
          title={this.props.title}
          failed
          onRetry={this.props.onRetry}
        />
      );
    }

    return this.props.children;
  }
}

function hasCurrentFragment(sectionIds: readonly ResumeSectionId[]): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return sectionIds.includes(window.location.hash.slice(1) as ResumeSectionId);
}

function shouldInitiallyRender(
  sectionIds: readonly ResumeSectionId[],
): boolean {
  return (
    typeof window === "undefined" ||
    typeof IntersectionObserver === "undefined" ||
    hasCurrentFragment(sectionIds)
  );
}

export function DeferredSection({
  sectionId,
  anchorIds = NO_ANCHORS,
  title,
  children,
  renderAll,
}: DeferredSectionProps) {
  const sectionIds = useMemo(
    () => [sectionId, ...anchorIds],
    [sectionId, anchorIds],
  );
  const [hasEnteredViewport, setHasEnteredViewport] = useState(() =>
    shouldInitiallyRender(sectionIds),
  );
  const [retryCount, setRetryCount] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const scrollToFragmentRef = useRef(hasCurrentFragment(sectionIds));
  const shouldRender =
    renderAll ||
    hasEnteredViewport ||
    typeof IntersectionObserver === "undefined";

  useEffect(() => {
    if (shouldRender) {
      return;
    }

    const wrapper = wrapperRef.current;
    if (!wrapper) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setHasEnteredViewport(true);
        }
      },
      {
        rootMargin: "200px 0px",
        threshold: 0.01,
      },
    );
    observer.observe(wrapper);

    return () => {
      observer.disconnect();
    };
  }, [shouldRender]);

  useEffect(() => {
    const handleHashChange = () => {
      if (hasCurrentFragment(sectionIds)) {
        scrollToFragmentRef.current = !shouldRender;
        setHasEnteredViewport(true);
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [sectionIds, shouldRender]);

  useLayoutEffect(() => {
    if (!shouldRender || !scrollToFragmentRef.current) {
      return;
    }
    scrollToFragmentRef.current = false;
    const target = document.getElementById(window.location.hash.slice(1));
    if (target && wrapperRef.current?.contains(target)) {
      // DOM implementations such as jsdom may not provide scrolling.
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      target.scrollIntoView?.();
    }
  }, [shouldRender]);

  return (
    <div
      ref={wrapperRef}
      className={shouldRender ? "resume-defer-target" : undefined}
      data-deferred-section={sectionId}
    >
      {shouldRender ? (
        <SectionErrorBoundary
          key={retryCount}
          sectionId={sectionId}
          anchorIds={anchorIds}
          title={title}
          onRetry={() => {
            setRetryCount((count) => count + 1);
          }}
        >
          {children}
        </SectionErrorBoundary>
      ) : (
        <SectionPlaceholder
          sectionId={sectionId}
          anchorIds={anchorIds}
          title={title}
        />
      )}
    </div>
  );
}
