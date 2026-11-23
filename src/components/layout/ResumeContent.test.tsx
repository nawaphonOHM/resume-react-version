import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ResumeContent } from "./ResumeContent";
import { PrintResumeSections } from "./PrintResumeSections";
import type { ResumeProfile } from "../../resume-data";
import { enhanceTechnologyIcon } from "../../services/technology-icon-contrast";
import {
  installIntersectionObserverMock,
  observerFor,
} from "./resume-content.test-fixtures";

vi.mock("../../services/technology-icon-contrast", () => ({
  enhanceTechnologyIcon: Object.assign(
    vi.fn((src: string) => Promise.resolve(src)),
    { surfaceFor: vi.fn(() => "dark" as const) },
  ),
}));

function section(container: HTMLElement, id: string): HTMLElement {
  const element = container.querySelector<HTMLElement>(id);
  if (!element) throw new Error(`Missing section ${id}`);
  return element;
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

function expectPrintContent(print: HTMLElement) {
  expect(print.textContent).toContain("Custom summary bullet point 1");
  expect(print.textContent).toContain("Lead Engineer");
  expect(print.textContent).toContain("M.Sc. Computer Science");
  expect(print.textContent).toContain("Distributed Systems");
  expect(print.querySelectorAll("[data-resume-section]")).toHaveLength(0);
  expect(print.querySelectorAll(".technology-chip img")).toHaveLength(0);
}

function expectInitialPlaceholders(container: HTMLElement) {
  expect(container.querySelector("#summary")?.getAttribute("aria-busy")).toBe(
    "true",
  );
  expect(container.querySelector("#education")).not.toBeNull();
  expect(container.querySelector("#skills")).not.toBeNull();
  expect(container.querySelector("#profile")).not.toBeNull();
  expect(
    section(container, '[data-deferred-section="experience"]').textContent,
  ).not.toContain("Lead Engineer");
  expect(
    section(container, '[data-deferred-section="education"]'),
  ).not.toBeNull();
}

function expectUpdatedPrintContent(print: HTMLElement, container: HTMLElement) {
  expect(print.textContent).toContain("Updated override");
  expect(print.textContent).not.toContain("Initial override");
  expect(print.textContent).toContain("Updated skill");
  expect(
    section(container, '[data-deferred-section="summary"]').textContent,
  ).not.toContain("Updated override");
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
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
    expect(section(container, "#summary").textContent).toContain(
      "Custom summary bullet point 1",
    );
    expect(section(container, "#summary").textContent).toContain(
      "Custom summary bullet point 2",
    );
  });

  it("renders experience and education sections with custom profile data", () => {
    const { container } = render(
      <ResumeContent profile={customProfile} onSelectImage={vi.fn()} />,
    );

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

  it("renders skills and profile sections with custom profile data", () => {
    const { container } = render(
      <ResumeContent profile={customProfile} onSelectImage={vi.fn()} />,
    );

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

  it("triggers image selection callback when clicking on logo buttons", () => {
    const handleSelectImage = vi.fn();
    const { container } = render(
      <ResumeContent
        profile={customProfile}
        onSelectImage={handleSelectImage}
      />,
    );

    const institutionLogoButton = Array.from(
      section(container, "#education").querySelectorAll("button"),
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
      width: customProfile.education.institutionLogo.width,
      height: customProfile.education.institutionLogo.height,
      origin: institutionLogoButton?.querySelector("img"),
      activation: "keyboard",
    });
  });

  it("renders all sections when IntersectionObserver is unavailable", () => {
    vi.stubGlobal("IntersectionObserver", undefined);

    const { container } = render(
      <ResumeContent profile={customProfile} onSelectImage={vi.fn()} />,
    );

    expect(container.querySelector('[aria-busy="true"]')).toBeNull();
    expect(section(container, "#summary").textContent).toContain(
      "Custom summary bullet point 1",
    );
    expect(section(container, "#experience").textContent).toContain(
      "Lead Engineer",
    );
    expect(section(container, "#education").textContent).toContain(
      "M.Sc. Computer Science",
    );
    expect(section(container, "#skills").textContent).toContain(
      "Distributed Systems",
    );
    expect(container.querySelectorAll("[data-resume-section]")).toHaveLength(6);
  });

  it("uses anchored placeholders until deferred sections intersect", () => {
    installIntersectionObserverMock();

    const { container } = render(
      <ResumeContent profile={customProfile} onSelectImage={vi.fn()} />,
    );

    const summaryPlaceholder = section(
      container,
      '[data-deferred-section="summary"]',
    );
    expectInitialPlaceholders(container);

    act(() => {
      observerFor(summaryPlaceholder).intersect(summaryPlaceholder);
    });

    expect(summaryPlaceholder.textContent).toContain(
      "Custom summary bullet point 1",
    );
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
    expect(section(container, "#skills").textContent).toContain(
      "Distributed Systems",
    );
    expect(scrollIntoView).toHaveBeenCalledOnce();
    expect(container.querySelector("#summary")?.getAttribute("aria-busy")).toBe(
      "true",
    );
    Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
  });

  it("keeps all print sections ready before printing without mounting screen sections", () => {
    installIntersectionObserverMock();
    vi.mocked(enhanceTechnologyIcon).mockClear();

    const { container } = render(
      <ResumeContent profile={customProfile} onSelectImage={vi.fn()} />,
    );

    const print = section(container, ".print-resume-sections");
    expect(
      section(container, '[data-deferred-section="experience"]').textContent,
    ).not.toContain("Lead Engineer");
    expectPrintContent(print);
    expect(enhanceTechnologyIcon).not.toHaveBeenCalled();

    act(() => {
      window.dispatchEvent(new Event("beforeprint"));
    });

    expect(
      section(container, '[data-deferred-section="experience"]').textContent,
    ).not.toContain("Lead Engineer");
    expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(3);
  });
});

describe("ResumeContent print and navigation updates", () => {
  it("isolates a print section rendering failure", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const invalidSummary = "invalid" as unknown as string[];
    const { container } = render(
      <PrintResumeSections summary={invalidSummary} onSelectImage={vi.fn()} />,
    );
    expect(section(container, "#print-summary").textContent).toContain(
      "This section could not be displayed.",
    );
    expect(section(container, "#print-experience").textContent).toContain(
      "Experience timeline",
    );
    expect(section(container, "#print-education")).not.toBeNull();
  });
  it("keeps screen and print identifiers unique before and after mounting", () => {
    installIntersectionObserverMock();
    const { container } = render(
      <ResumeContent profile={customProfile} onSelectImage={vi.fn()} />,
    );
    expectUniqueIds(container);
    const wrapper = section(container, '[data-deferred-section="education"]');
    act(() => {
      observerFor(wrapper).intersect(wrapper);
    });
    expectUniqueIds(container);
    for (const id of [
      "summary",
      "experience",
      "education",
      "skills",
      "profile",
    ]) {
      expect(
        section(container, `#print-${id}`).hasAttribute("data-resume-section"),
      ).toBe(false);
      expect(
        section(container, `#${id}`).hasAttribute("data-resume-section"),
      ).toBe(true);
    }
  });

  it("updates print content when profile and explicit overrides change", () => {
    installIntersectionObserverMock();
    const onSelectImage = vi.fn();
    const { container, rerender } = render(
      <ResumeContent
        profile={customProfile}
        onSelectImage={onSelectImage}
        summary={["Initial override"]}
      />,
    );
    const print = section(container, ".print-resume-sections");
    expect(print.textContent).toContain("Initial override");
    expect(print.textContent).not.toContain("Custom summary bullet point 1");
    rerender(
      <ResumeContent
        profile={{ ...customProfile, skills: ["Updated skill"] }}
        onSelectImage={onSelectImage}
        summary={["Updated override"]}
      />,
    );
    expectUpdatedPrintContent(print, container);
  });

  it("mounts the screen target after a fragment change despite the print copy", () => {
    installIntersectionObserverMock();
    const { container } = render(
      <ResumeContent profile={customProfile} onSelectImage={vi.fn()} />,
    );
    window.history.replaceState(null, "", "#skills");
    act(() => {
      window.dispatchEvent(new Event("hashchange"));
    });
    expect(
      section(container, "#skills").hasAttribute("data-resume-section"),
    ).toBe(true);
    expect(section(container, "#skills").textContent).toContain(
      "Distributed Systems",
    );
    expect(section(container, "#summary").getAttribute("aria-busy")).toBe(
      "true",
    );
  });
});
