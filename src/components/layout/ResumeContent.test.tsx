import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ResumeContent } from "./ResumeContent";
import { ImageZoomProvider } from "../common/ImageZoomProvider";
import type { ResumeProfile } from "../../resume-data";
import {
  expectZoomPreview,
  hoverImage,
  setImageGeometry,
} from "../../test-fixtures/image-zoom";
import {
  installIntersectionObserverMock,
  observerFor,
} from "./resume-content.test-fixtures";

vi.mock("../../services/technology-icon-contrast", () => ({
  enhanceTechnologyIcon: vi.fn((src: string) =>
    Promise.resolve({ src, background: "#ffffff" }),
  ),
}));

const SECTION_IDS = ["about", "experience", "education", "skills", "profile"];

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

function section(container: HTMLElement, id: string): HTMLElement {
  const element = container.querySelector<HTMLElement>(id);
  if (!element) throw new Error(`Missing section ${id}`);
  return element;
}

function deferredWrapper(container: HTMLElement, id: string): HTMLElement {
  let element = section(container, id);
  while (element.parentElement && element.parentElement !== container) {
    element = element.parentElement;
  }
  return element;
}

function isLoading(container: HTMLElement, id: string): boolean {
  return (
    section(container, id).closest("[data-resume-defer-placeholder]") !== null
  );
}

function renderContent() {
  const view = (renderAll: boolean) => (
    <ImageZoomProvider>
      <ResumeContent profile={customProfile} renderAll={renderAll} />
    </ImageZoomProvider>
  );
  const result = render(view(false));

  return {
    ...result,
    renderAll: () => {
      result.rerender(view(true));
    },
  };
}

async function expectLoaded(container: HTMLElement, ids = SECTION_IDS) {
  await waitFor(() => {
    for (const id of ids) {
      expect(isLoading(container, `#${id}`)).toBe(false);
    }
  });
}

async function renderLoadedContent() {
  const result = renderContent();
  await expectLoaded(result.container);
  return result;
}

function expectUniqueIds(container: HTMLElement) {
  const ids = Array.from(
    container.querySelectorAll("[id]"),
    (element) => element.id,
  );
  expect(new Set(ids).size).toBe(ids.length);
  for (const element of container.querySelectorAll("[aria-labelledby]")) {
    const headingId = element.getAttribute("aria-labelledby");
    if (!headingId) throw new Error("Missing heading ID");
    expect(container.querySelectorAll(`[id="${headingId}"]`)).toHaveLength(1);
  }
}

function expectTexts(element: HTMLElement, texts: readonly string[]) {
  for (const text of texts) {
    expect(element.textContent).toContain(text);
  }
}

function expectPlaceholder(
  container: HTMLElement,
  id: string,
  texts: readonly string[],
) {
  const placeholder = section(container, `#${id}`);
  expect(isLoading(container, `#${id}`)).toBe(true);
  expect(placeholder.hasAttribute("data-resume-section")).toBe(true);
  expectTexts(placeholder, texts);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
  window.history.replaceState(null, "", "/");
});

describe("ResumeContent sections", () => {
  it("renders hero and summary sections with custom profile data", async () => {
    const { container } = await renderLoadedContent();

    expect(container.textContent).toContain("Custom Developer");
    expect(container.textContent).toContain("Cloud Architect");
    expect(section(container, "#about").textContent).toContain(
      "Custom summary bullet point 1",
    );
    expect(section(container, "#about").textContent).toContain(
      "Custom summary bullet point 2",
    );
  });

  it("renders experience and education sections with custom profile data", async () => {
    const { container } = await renderLoadedContent();

    expect(section(container, "#experience").textContent).toContain(
      "Lead Engineer",
    );
    expect(section(container, "#experience").textContent).toContain(
      "Acme Corp",
    );
    expect(section(container, "#education").textContent).toContain(
      "M.Sc. Computer Science",
    );
    expect(section(container, "#education").textContent).toContain("3.95");
  });

  it("renders skills and profile sections with custom profile data", async () => {
    const { container } = await renderLoadedContent();

    expect(section(container, "#skills").textContent).toContain(
      "Distributed Systems",
    );
    expect(section(container, "#profile").textContent).toContain(
      "custom.dev@example.com",
    );
    expect(section(container, "#profile").textContent).toContain(
      "089-999-9999",
    );
    expect(section(container, "#profile").textContent).toContain(
      "Custom Portfolio",
    );
  });

  it("previews logos from the images themselves without wrapper buttons", async () => {
    const { container } = await renderLoadedContent();
    const institutionLogo = section(container, "#education").querySelector(
      "img",
    );
    if (!institutionLogo) throw new Error("Missing institution logo");
    setImageGeometry(institutionLogo);

    hoverImage(institutionLogo);

    expectZoomPreview("Tech University", "https://tech.edu/logo.png");
    expect(section(container, "#education").querySelector("button")).toBeNull();
    expect(
      section(container, "#experience").querySelector("button"),
    ).toBeNull();
    expect(section(container, "#profile").querySelector("button")).toBeNull();
  });

  it("renders all sections when IntersectionObserver is unavailable", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);

    const { container } = await renderLoadedContent();

    expect(container.querySelector('[aria-busy="true"]')).toBeNull();
    expect(container.querySelectorAll("[data-resume-section]")).toHaveLength(5);
    expect(container.querySelectorAll(".resume-defer-target")).toHaveLength(3);
    expectUniqueIds(container);
  });
});

describe("ResumeContent deferred loading", () => {
  it("shows a placeholder for every section before it intersects", () => {
    installIntersectionObserverMock();

    const { container } = renderContent();

    expectPlaceholder(container, "about", [
      "Professional summary",
      "Loading professional summary",
      "The summary will appear when this section enters the viewport.",
    ]);
    expectPlaceholder(container, "experience", [
      "Employment",
      "Loading experience timeline",
      "The employment history will appear when this section enters the viewport.",
    ]);
    expectPlaceholder(container, "education", [
      "Academic background",
      "Loading education",
      "Education details will appear when this group enters the viewport.",
    ]);
    expectPlaceholder(container, "skills", [
      "Technical toolkit",
      "Loading core skills",
      "Technical skills will appear when this group enters the viewport.",
    ]);
    expectPlaceholder(container, "profile", [
      "Public details",
      "Loading profile and links",
      "Public profile details will appear when this group enters the viewport.",
    ]);
    expect(
      container
        .querySelector("#education")
        ?.parentElement?.getAttribute("aria-label"),
    ).toBe("Loading education, skills, and profile sections");
    expect(container.textContent).not.toContain("Lead Engineer");
    expectUniqueIds(container);
  });

  it("mounts only the section that intersects", async () => {
    installIntersectionObserverMock();
    const { container } = renderContent();
    const summaryWrapper = deferredWrapper(container, "#about");

    act(() => {
      observerFor(summaryWrapper).intersect(summaryWrapper);
    });

    await expectLoaded(container, ["about"]);
    expect(summaryWrapper.textContent).toContain(
      "Custom summary bullet point 1",
    );
    expect(isLoading(container, "#experience")).toBe(true);
    expect(isLoading(container, "#education")).toBe(true);
    expectUniqueIds(container);
  });

  it("mounts education, skills and profile as one group", async () => {
    installIntersectionObserverMock();
    const { container } = renderContent();
    const groupWrapper = deferredWrapper(container, "#skills");
    expect(deferredWrapper(container, "#education")).toBe(groupWrapper);
    expect(deferredWrapper(container, "#profile")).toBe(groupWrapper);

    act(() => {
      observerFor(groupWrapper).intersect(groupWrapper);
    });

    await expectLoaded(container, ["education", "skills", "profile"]);
    expectTexts(groupWrapper, [
      "M.Sc. Computer Science",
      "Distributed Systems",
      "custom.dev@example.com",
    ]);
    expect(isLoading(container, "#about")).toBe(true);
    expectUniqueIds(container);
  });

  it("mounts a direct fragment target and scrolls to it", async () => {
    installIntersectionObserverMock();
    window.history.replaceState(null, "", "/#skills");
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });

    const { container } = renderContent();

    await expectLoaded(container, ["skills"]);
    expect(section(container, "#skills").textContent).toContain(
      "Distributed Systems",
    );
    expect(scrollIntoView).toHaveBeenCalledOnce();
    expect(scrollIntoView.mock.contexts[0]).toBe(section(container, "#skills"));
    expect(isLoading(container, "#about")).toBe(true);
  });

  it("mounts the target after a fragment change", async () => {
    installIntersectionObserverMock();
    const { container } = renderContent();

    window.history.replaceState(null, "", "#experience");
    act(() => {
      window.dispatchEvent(new Event("hashchange"));
    });

    await expectLoaded(container, ["experience"]);
    expect(section(container, "#experience").textContent).toContain(
      "Lead Engineer",
    );
    expect(isLoading(container, "#about")).toBe(true);
    expect(isLoading(container, "#skills")).toBe(true);
  });

  it("mounts every section when all sections must render", async () => {
    installIntersectionObserverMock();
    const view = renderContent();
    expect(isLoading(view.container, "#experience")).toBe(true);

    view.renderAll();

    await expectLoaded(view.container);
    expect(view.container.textContent).toContain("Lead Engineer");
    expect(view.container.textContent).toContain("M.Sc. Computer Science");
    expect(
      view.container.querySelectorAll("[data-resume-section]"),
    ).toHaveLength(5);
    expectUniqueIds(view.container);
  });
});
