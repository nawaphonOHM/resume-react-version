import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resumeData } from "../../resume-data";
import { AboutSection } from "./AboutSection";

describe("AboutSection presentation and content", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the hero content, name, role title, and bio", () => {
    const { container } = render(
      <AboutSection
        availabilityStatus="available"
        availabilityLabel="Available in Bangkok business hours"
        bangkokTime="Wednesday, 4 November 2026 at 01:36"
      />,
    );

    expect(container.textContent).toContain(resumeData.name);
    expect(container.textContent).toContain(resumeData.title);
    expect(container.textContent).toContain(
      `${resumeData.title} · ${resumeData.details.location}`,
    );
    expect(container.textContent).toContain(resumeData.summary[0]);
  });

  it("renders the NI monogram avatar and orbital code badges", () => {
    const { container } = render(<AboutSection />);

    const monogram = container.querySelector(".hero-monogram");
    expect(monogram).not.toBeNull();
    expect(monogram?.textContent.trim()).toBe("NI");

    expect(container.querySelector(".hero-orbit")).not.toBeNull();
    expect(container.querySelector(".hero-orbit-inner")).not.toBeNull();
    expect(container.querySelector(".hero-code-left")?.textContent).toBe("</>");
    expect(container.querySelector(".hero-code-right")?.textContent).toBe(
      "{...}",
    );
  });

  it("renders dynamic Bangkok status dot and time indicator", () => {
    const { container } = render(
      <AboutSection
        availabilityStatus="available"
        availabilityLabel="Available in Bangkok business hours"
        bangkokTime="Wednesday, 4 November 2026 at 01:36"
      />,
    );

    expect(container.textContent).toContain(
      "UTC+7 · Wednesday, 4 November 2026 at 01:36",
    );

    const statusDot = container.querySelector<HTMLElement>(".status-dot");
    expect(statusDot?.getAttribute("role")).toBe("img");
    expect(statusDot?.getAttribute("aria-label")).toBe(
      "Available in Bangkok business hours",
    );
  });

  it("renders quick action links for email and experience anchor", () => {
    const { container } = render(
      <AboutSection
        email="nawaphon2539@gmail.com"
        links={[
          {
            label: "GitHub",
            url: "https://github.com/nawaphonOHM",
          },
        ]}
      />,
    );

    const touchLink = Array.from(container.querySelectorAll("a")).find((a) =>
      a.textContent.includes("Get in touch"),
    );
    expect(touchLink).toBeDefined();
    expect(touchLink?.getAttribute("href")).toBe(
      "mailto:nawaphon2539@gmail.com",
    );

    const expLink = Array.from(container.querySelectorAll("a")).find((a) =>
      a.textContent.includes("View experience"),
    );
    expect(expLink).toBeDefined();
    expect(expLink?.getAttribute("href")).toBe("#experience");

    const githubLink = Array.from(container.querySelectorAll("a")).find((a) =>
      a.textContent.includes("View GitHub"),
    );
    expect(githubLink).toBeDefined();
    expect(githubLink?.getAttribute("href")).toBe(
      "https://github.com/nawaphonOHM",
    );
  });

  it("renders custom profile information passed via props", () => {
    const { container } = render(
      <AboutSection
        name="Jane Developer"
        title="Principal Cloud Architect"
        introduction="Architecting highly scalable cloud native distributed systems."
        email="jane.dev@example.com"
      />,
    );

    expect(container.textContent).toContain("Jane Developer");
    expect(container.textContent).toContain("Principal Cloud Architect");
    expect(container.textContent).toContain(
      "Architecting highly scalable cloud native distributed systems.",
    );

    const monogram = container.querySelector(".hero-monogram");
    expect(monogram?.textContent.trim()).toBe("JD");

    const touchLink = Array.from(container.querySelectorAll("a")).find((a) =>
      a.textContent.includes("Get in touch"),
    );
    expect(touchLink?.getAttribute("href")).toBe("mailto:jane.dev@example.com");
  });

  it("renders download availability hint when downloadAvailable is provided", () => {
    const { container: availableContainer } = render(
      <AboutSection downloadAvailable={true} />,
    );
    expect(availableContainer.textContent).toContain(
      "The hosted résumé PDF is available for direct download.",
    );

    const { container: unavailableContainer } = render(
      <AboutSection downloadAvailable={false} />,
    );
    expect(unavailableContainer.textContent).toContain(
      "The hosted résumé PDF may be unavailable.",
    );
  });
});

describe("AboutSection animation styles and status bindings", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("binds correct --status-dot-color for each availability status", () => {
    const { container: availableContainer } = render(
      <AboutSection availabilityStatus="available" />,
    );
    const availableSection = availableContainer.querySelector("section");
    expect(availableSection?.style.getPropertyValue("--status-dot-color")).toBe(
      "#92C353",
    );

    const { container: limitedContainer } = render(
      <AboutSection availabilityStatus="limited" />,
    );
    const limitedSection = limitedContainer.querySelector("section");
    expect(limitedSection?.style.getPropertyValue("--status-dot-color")).toBe(
      "#F7A600",
    );

    const { container: unavailableContainer } = render(
      <AboutSection availabilityStatus="unavailable" />,
    );
    const unavailableSection = unavailableContainer.querySelector("section");
    expect(
      unavailableSection?.style.getPropertyValue("--status-dot-color"),
    ).toBe("#D1D1D1");
  });

  it("binds initial luminance and orbital CSS custom properties to section", () => {
    const { container } = render(<AboutSection />);
    const section = container.querySelector("section");

    expect(section).not.toBeNull();
    const luminance = Number(
      section?.style.getPropertyValue("--status-dot-luminance"),
    );
    expect(luminance).toBeGreaterThanOrEqual(0);
    expect(luminance).toBeLessThanOrEqual(1);

    expect(section?.style.getPropertyValue("--hero-code-left-x")).toMatch(/%/);
    expect(section?.style.getPropertyValue("--hero-code-left-y")).toMatch(/%/);
    expect(section?.style.getPropertyValue("--hero-code-right-x")).toMatch(/%/);
    expect(section?.style.getPropertyValue("--hero-code-right-y")).toMatch(/%/);
  });

  it("updates CSS properties on animation frame without throwing", () => {
    let rafCallback: FrameRequestCallback = () => {};
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallback = cb;
      return 1;
    });

    const { container } = render(<AboutSection />);
    const section = container.querySelector("section");

    rafCallback(1000);

    const lum = Number(
      section?.style.getPropertyValue("--status-dot-luminance"),
    );
    expect(lum).toBeGreaterThanOrEqual(0);
    expect(lum).toBeLessThanOrEqual(1);
  });

  it("does not start animation loop when prefers-reduced-motion is active", () => {
    const rafSpy = vi.spyOn(window, "requestAnimationFrame");
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(<AboutSection />);
    expect(rafSpy).not.toHaveBeenCalled();
  });
});
