import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ResumeContent } from "./ResumeContent";
import type { ResumeProfile } from "../../resume-data";

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
    });
  });
});
