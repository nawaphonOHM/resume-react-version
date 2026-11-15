import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ResumeContent } from "./ResumeContent";
import type { ResumeProfile } from "../../resume-data";

class TestIntersectionObserver implements IntersectionObserver {
  static instances: TestIntersectionObserver[] = [];

  readonly root = null;
  readonly rootMargin: string;
  readonly scrollMargin = "0px";
  readonly thresholds: readonly number[];
  readonly observedTargets: Element[] = [];
  readonly callback: IntersectionObserverCallback;

  constructor(
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit,
  ) {
    this.callback = callback;
    this.rootMargin = options?.rootMargin ?? "0px";
    this.thresholds = Array.isArray(options?.threshold)
      ? options.threshold
      : [options?.threshold ?? 0];
    TestIntersectionObserver.instances.push(this);
  }

  observe(target: Element): void {
    this.observedTargets.push(target);
  }

  unobserve(target: Element): void {
    const index = this.observedTargets.indexOf(target);
    if (index >= 0) {
      this.observedTargets.splice(index, 1);
    }
  }

  disconnect(): void {}

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  intersect(target: Element): void {
    const entry = {
      target,
      isIntersecting: true,
      intersectionRatio: 1,
      boundingClientRect: {} as DOMRectReadOnly,
      intersectionRect: {} as DOMRectReadOnly,
      rootBounds: null,
      time: 0,
    } satisfies IntersectionObserverEntry;
    this.callback([entry], this);
  }
}

function installIntersectionObserverMock(): void {
  TestIntersectionObserver.instances = [];
  vi.stubGlobal("IntersectionObserver", TestIntersectionObserver);
}

function observerFor(target: Element): TestIntersectionObserver {
  const observer = TestIntersectionObserver.instances.find((instance) =>
    instance.observedTargets.includes(target),
  );
  if (!observer) {
    throw new Error("No intersection observer is watching the section");
  }
  return observer;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

const customProfile: ResumeProfile = {
  name: "Custom Developer",
  title: "Cloud Architect",
  summary: ["Custom summary bullet point 1", "Custom summary bullet point 2"],
  details: {
    location: "Chiang Mai, Thailand",
    phoneLabel: "089-999-9999",
    email: "custom.dev@example.com",
    nationality: "Thai",
    birthDate: "1 January 2000",
  },
  links: [
    {
      label: "Custom Portfolio",
      url: "https://custom.portfolio.dev",
      logo: {
        src: "https://custom.portfolio.dev/logo.png",
        width: 32,
        height: 32,
        surface: "light",
      },
    },
  ],
  skills: ["Rust", "Distributed Systems", "WebAssembly"],
  experience: [
    {
      role: "Lead Engineer",
      company: "Acme Corp",
      companyLogo: {
        src: "https://acme.org/logo.png",
        width: 48,
        height: 48,
        surface: "light",
      },
      location: "Bangkok",
      period: "2023 - Present",
      employmentTypes: ["Full-time"],
      highlights: ["Spearheaded core platform rewrite"],
      technologies: ["Rust", "Kubernetes"],
    },
  ],
  education: {
    degree: "M.Sc. Computer Science",
    institution: "Tech University",
    institutionLogo: {
      src: "https://tech.edu/logo.png",
      width: 48,
      height: 48,
      surface: "light",
    },
    period: "2020 - 2022",
    gpax: "3.95",
    seniorProject: {
      name: "Distributed Consensus Engine",
      url: "https://github.com/example/engine",
    },
  },
};

describe("ResumeContent component", () => {
  it("renders hero, about, and summary sections with custom profile data", () => {
    const { container } = render(
      <ResumeContent profile={customProfile} onSelectImage={vi.fn()} />,
    );

    expect(container.textContent).toContain("Custom Developer");
    expect(container.textContent).toContain("Cloud Architect");
    expect(container.textContent).toContain("Custom summary bullet point 1");
    expect(container.textContent).toContain("Custom summary bullet point 2");
  });

  it("renders experience and education sections with custom profile data", () => {
    const { container } = render(
      <ResumeContent profile={customProfile} onSelectImage={vi.fn()} />,
    );

    expect(container.textContent).toContain("Lead Engineer");
    expect(container.textContent).toContain("Acme Corp");
    expect(container.textContent).toContain("M.Sc. Computer Science");
    expect(container.textContent).toContain("3.95");
  });

  it("renders skills and profile sections with custom profile data", () => {
    const { container } = render(
      <ResumeContent profile={customProfile} onSelectImage={vi.fn()} />,
    );

    expect(container.textContent).toContain("Distributed Systems");
    expect(container.textContent).toContain("custom.dev@example.com");
    expect(container.textContent).toContain("089-999-9999");
    expect(container.textContent).toContain("Custom Portfolio");
  });

  it("triggers image selection callback when clicking on logo buttons", () => {
    const handleSelectImage = vi.fn();
    const { container } = render(
      <ResumeContent
        profile={customProfile}
        onSelectImage={handleSelectImage}
      />,
    );

    const institutionLogoButton = Array.from(
      container.querySelectorAll("button"),
    ).find((btn) =>
      btn.getAttribute("aria-label")?.includes("Tech University"),
    );

    expect(institutionLogoButton).toBeDefined();
    if (institutionLogoButton) {
      fireEvent.click(institutionLogoButton);
    }

    expect(handleSelectImage).toHaveBeenCalledWith({
      src: "https://tech.edu/logo.png",
      alt: "Tech University logo",
      surface: "light",
    });
  });

  it("renders all sections when IntersectionObserver is unavailable", () => {
    vi.stubGlobal("IntersectionObserver", undefined);

    const { container } = render(
      <ResumeContent profile={customProfile} onSelectImage={vi.fn()} />,
    );

    expect(container.querySelector('[aria-busy="true"]')).toBeNull();
    expect(container.textContent).toContain("Custom summary bullet point 1");
    expect(container.textContent).toContain("Lead Engineer");
    expect(container.textContent).toContain("M.Sc. Computer Science");
    expect(container.textContent).toContain("Distributed Systems");
    expect(container.querySelectorAll("[data-resume-section]")).toHaveLength(6);
  });

  // eslint-disable-next-line max-statements
  it("uses anchored placeholders until deferred sections intersect", () => {
    installIntersectionObserverMock();

    const { container } = render(
      <ResumeContent profile={customProfile} onSelectImage={vi.fn()} />,
    );

    const summaryPlaceholder = container.querySelector(
      '[data-deferred-section="summary"]',
    );
    const experiencePlaceholder = container.querySelector(
      '[data-deferred-section="experience"]',
    );
    const profileGroupPlaceholder = container.querySelector(
      '[data-deferred-section="education"]',
    );

    expect(container.querySelector("#summary")?.getAttribute("aria-busy")).toBe(
      "true",
    );
    expect(container.querySelector("#education")).not.toBeNull();
    expect(container.querySelector("#skills")).not.toBeNull();
    expect(container.querySelector("#profile")).not.toBeNull();
    expect(container.textContent).not.toContain("Lead Engineer");

    if (
      !summaryPlaceholder ||
      !experiencePlaceholder ||
      !profileGroupPlaceholder
    ) {
      throw new Error("Expected deferred section wrappers");
    }

    act(() => {
      observerFor(summaryPlaceholder).intersect(summaryPlaceholder);
    });

    expect(container.textContent).toContain("Custom summary bullet point 1");
    expect(container.querySelector("#summary")?.getAttribute("aria-busy")).toBe(
      null,
    );
  });

  it("renders a direct fragment target immediately", () => {
    installIntersectionObserverMock();
    window.history.replaceState(null, "", "/#skills");
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });

    const { container } = render(
      <ResumeContent profile={customProfile} onSelectImage={vi.fn()} />,
    );

    expect(
      container.querySelector("#skills")?.hasAttribute("data-resume-section"),
    ).toBe(true);
    expect(container.textContent).toContain("Distributed Systems");
    expect(scrollIntoView).toHaveBeenCalledOnce();
    expect(container.querySelector("#summary")?.getAttribute("aria-busy")).toBe(
      "true",
    );
    Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
  });

  it("synchronously renders every section before printing", () => {
    installIntersectionObserverMock();

    const { container } = render(
      <ResumeContent profile={customProfile} onSelectImage={vi.fn()} />,
    );

    expect(container.textContent).not.toContain("Lead Engineer");

    act(() => {
      window.dispatchEvent(new Event("beforeprint"));
    });

    expect(container.textContent).toContain("Custom summary bullet point 1");
    expect(container.textContent).toContain("Lead Engineer");
    expect(container.textContent).toContain("M.Sc. Computer Science");
    expect(container.textContent).toContain("Distributed Systems");
    expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(0);
  });
});
