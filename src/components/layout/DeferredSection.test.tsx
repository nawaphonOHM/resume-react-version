import { act, cleanup, render, screen } from "@testing-library/react";
import { lazy, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DeferredSection, type DeferredPlaceholder } from "./DeferredSection";
import {
  installIntersectionObserverMock,
  observerFor,
} from "./resume-content.test-fixtures";

const SUMMARY: readonly DeferredPlaceholder[] = [
  {
    id: "about",
    kicker: "Professional summary",
    loadingTitle: "Loading professional summary",
    loadingText:
      "The summary will appear when this section enters the viewport.",
    errorTitle: "Professional summary unavailable",
  },
];

const GROUP: readonly DeferredPlaceholder[] = [
  {
    id: "education",
    kicker: "Academic background",
    loadingTitle: "Loading education",
    loadingText:
      "Education details will appear when this group enters the viewport.",
    errorTitle: "Education unavailable",
  },
  {
    id: "skills",
    kicker: "Technical toolkit",
    loadingTitle: "Loading core skills",
    loadingText:
      "Technical skills will appear when this group enters the viewport.",
    errorTitle: "Core skills unavailable",
  },
];

const GROUP_LABEL = "education and skills sections";
const ERROR_TEXT =
  "This section could not be loaded. Please reload the page to try again.";

interface RenderOptions {
  placeholders?: readonly DeferredPlaceholder[];
  groupLabel?: string;
  renderAll?: boolean;
  children?: ReactNode;
}

function renderDeferred({
  placeholders = SUMMARY,
  groupLabel,
  renderAll = false,
  children = <section id="about">Summary content</section>,
}: RenderOptions = {}) {
  const view = (all: boolean) => (
    <DeferredSection
      placeholders={placeholders}
      groupLabel={groupLabel}
      renderAll={all}
    >
      {children}
    </DeferredSection>
  );
  const result = render(view(renderAll));
  const wrapper = result.container.firstElementChild;
  if (!wrapper) throw new Error("Deferred wrapper was not rendered");

  return {
    ...result,
    wrapper,
    renderAll: () => {
      result.rerender(view(true));
    },
  };
}

function intersect(wrapper: Element) {
  act(() => {
    observerFor(wrapper).intersect(wrapper);
  });
}

function changeHash(hash: string) {
  act(() => {
    window.history.replaceState(null, "", hash);
    window.dispatchEvent(new Event("hashchange"));
  });
}

function installScrollMock() {
  const scrollIntoView = vi.fn();
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: scrollIntoView,
  });
  return scrollIntoView;
}

function deferredModule() {
  let resolve!: () => void;
  let reject!: (reason: Error) => void;
  const loaded = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  const LazySection = lazy(async () => {
    await loaded;
    return {
      default: () => <section id="about">Lazy summary content</section>,
    };
  });
  return { LazySection, resolve, reject };
}

async function renderFailedChunk() {
  vi.stubGlobal("IntersectionObserver", undefined);
  vi.spyOn(console, "error").mockImplementation(() => {});
  const { LazySection, reject } = deferredModule();
  renderDeferred({ children: <LazySection /> });
  reject(new Error("Chunk failed"));
  return screen.findByRole("alert");
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
  window.history.replaceState(null, "", "/");
});

describe("DeferredSection placeholders", () => {
  it("shows an anchored loading placeholder until the section intersects", () => {
    installIntersectionObserverMock();
    const { wrapper } = renderDeferred();

    const placeholder = screen.getByRole("status");
    expect(placeholder.id).toBe("about");
    expect(placeholder.tagName).toBe("SECTION");
    expect(placeholder.getAttribute("aria-busy")).toBe("true");
    expect(placeholder.getAttribute("tabindex")).toBe("-1");
    expect(placeholder.hasAttribute("data-resume-section")).toBe(true);
    expect(placeholder.classList.contains("resume-defer-reserve--about")).toBe(
      true,
    );
    expect(wrapper.textContent).not.toContain("Summary content");
  });

  it("labels the placeholder with its kicker, title and text", () => {
    installIntersectionObserverMock();
    renderDeferred();

    const placeholder = screen.getByRole("status");
    expect(
      screen.getByRole("heading", { name: "Loading professional summary" }).id,
    ).toBe(placeholder.getAttribute("aria-labelledby"));
    expect(placeholder.textContent).toContain("Professional summary");
    expect(placeholder.textContent).toContain(
      "The summary will appear when this section enters the viewport.",
    );
    expect(placeholder.querySelector(".resume-defer-spinner")).not.toBeNull();
  });

  it("groups several anchors under one labelled status", () => {
    installIntersectionObserverMock();
    renderDeferred({ placeholders: GROUP, groupLabel: GROUP_LABEL });

    const group = screen.getByRole("status", {
      name: "Loading education and skills sections",
    });
    expect(group.tagName).toBe("DIV");
    expect(group.getAttribute("aria-busy")).toBe("true");

    const anchors = Array.from(group.querySelectorAll("section"));
    expect(anchors.map((anchor) => anchor.id)).toEqual(["education", "skills"]);
    expect(anchors.every((anchor) => !anchor.hasAttribute("role"))).toBe(true);
    expect(group.textContent).toContain("Loading education");
    expect(group.textContent).toContain("Loading core skills");
  });

  it("observes the wrapper with default intersection options", () => {
    installIntersectionObserverMock();
    const { wrapper } = renderDeferred();

    const observer = observerFor(wrapper);
    expect(observer.rootMargin).toBe("0px");
    expect(observer.thresholds).toEqual([0]);
  });
});

describe("DeferredSection mounting", () => {
  it("replaces the placeholder with animated content after intersecting", () => {
    installIntersectionObserverMock();
    const { wrapper } = renderDeferred();

    intersect(wrapper);

    expect(screen.queryByRole("status")).toBeNull();
    const content = screen.getByText("Summary content");
    expect(content.id).toBe("about");
    expect(
      content.parentElement?.classList.contains("resume-defer-target"),
    ).toBe(true);
    expect(wrapper.querySelectorAll("#about")).toHaveLength(1);
  });

  it("keeps the placeholder while a lazy section chunk is loading", async () => {
    installIntersectionObserverMock();
    const { LazySection, resolve } = deferredModule();
    const { wrapper } = renderDeferred({ children: <LazySection /> });

    intersect(wrapper);
    expect(screen.getByRole("status").id).toBe("about");

    resolve();
    expect(await screen.findByText("Lazy summary content")).not.toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("mounts immediately when IntersectionObserver is unavailable", () => {
    vi.stubGlobal("IntersectionObserver", undefined);

    renderDeferred();

    expect(screen.getByText("Summary content")).not.toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("mounts without intersecting when every section must render", () => {
    installIntersectionObserverMock();
    const view = renderDeferred();
    expect(screen.queryByText("Summary content")).toBeNull();

    view.renderAll();

    expect(screen.getByText("Summary content")).not.toBeNull();
  });
});

describe("DeferredSection errors", () => {
  it("shows an anchored error state when a chunk fails", async () => {
    const alert = await renderFailedChunk();

    expect(alert.id).toBe("about");
    expect(alert.hasAttribute("aria-busy")).toBe(false);
    expect(alert.classList.contains("resume-defer-error")).toBe(true);
    expect(
      screen.getByRole("heading", { name: "Professional summary unavailable" })
        .id,
    ).toBe(alert.getAttribute("aria-labelledby"));
  });

  it("explains the failure without a spinner or retry control", async () => {
    const alert = await renderFailedChunk();

    expect(alert.textContent).toContain(ERROR_TEXT);
    expect(alert.querySelector(".resume-defer-spinner")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("labels a failed group and keeps every anchor", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    vi.spyOn(console, "error").mockImplementation(() => {});

    function BrokenSection(): ReactNode {
      throw new Error("Section render failed");
    }

    renderDeferred({
      placeholders: GROUP,
      groupLabel: GROUP_LABEL,
      children: <BrokenSection />,
    });

    const alert = screen.getByRole("alert", {
      name: "Education and skills sections are unavailable",
    });
    expect(alert.querySelector("#education")?.textContent).toContain(
      "Education unavailable",
    );
    expect(alert.querySelector("#skills")?.textContent).toContain(
      "Core skills unavailable",
    );
  });
});

describe("DeferredSection fragments", () => {
  it("mounts a section named by the initial fragment and scrolls to it", () => {
    installIntersectionObserverMock();
    const scrollIntoView = installScrollMock();
    window.history.replaceState(null, "", "#about");

    renderDeferred();

    expect(screen.getByText("Summary content")).not.toBeNull();
    expect(scrollIntoView).toHaveBeenCalledOnce();
    expect(scrollIntoView.mock.contexts[0]).toBe(
      document.getElementById("about"),
    );
  });

  it("mounts and scrolls when the fragment changes to a grouped anchor", () => {
    installIntersectionObserverMock();
    const scrollIntoView = installScrollMock();
    renderDeferred({
      placeholders: GROUP,
      groupLabel: GROUP_LABEL,
      children: <section id="skills">Skills content</section>,
    });

    changeHash("#profile");
    expect(screen.queryByText("Skills content")).toBeNull();

    changeHash("#skills");
    expect(screen.getByText("Skills content")).not.toBeNull();
    expect(scrollIntoView).toHaveBeenCalledOnce();
    expect(scrollIntoView.mock.contexts[0]).toBe(
      document.getElementById("skills"),
    );
  });

  it("leaves scrolling to the browser once the section is mounted", () => {
    installIntersectionObserverMock();
    const scrollIntoView = installScrollMock();
    const { wrapper } = renderDeferred();
    intersect(wrapper);

    changeHash("#about");

    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("renders a fragment target when scrolling is unavailable", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    window.history.replaceState(null, "", "#about");

    renderDeferred();

    expect(screen.getByText("Summary content")).not.toBeNull();
  });
});
