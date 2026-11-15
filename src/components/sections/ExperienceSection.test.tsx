import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ExperienceSection } from "./ExperienceSection";
import { resumeData, type ResumeExperience } from "../../resume-data";

function getReactChipSpan(container: HTMLElement) {
  const chips = Array.from(container.querySelectorAll(".technology-chip"));
  return chips.find((el) => el.textContent.trim() === "React");
}

describe("ExperienceSection", () => {
  describe("timeline rendering and content", () => {
    it("renders all experience records with numbered timeline markers", () => {
      const onSelectImage = vi.fn();
      const { container } = render(
        <ExperienceSection onSelectImage={onSelectImage} />,
      );

      const markers = container.querySelectorAll(".timeline-marker span");
      expect(markers).toHaveLength(resumeData.experience.length);
      markers.forEach((marker, index) => {
        expect(marker.textContent).toBe(String(index + 1));
      });

      const cards = container.querySelectorAll(".experience-card");
      expect(cards).toHaveLength(resumeData.experience.length);
    });

    it("renders roles, companies, periods, locations, and highlights", () => {
      const onSelectImage = vi.fn();
      const { container } = render(
        <ExperienceSection onSelectImage={onSelectImage} />,
      );

      for (const exp of resumeData.experience) {
        expect(container.textContent).toContain(exp.role);
        expect(container.textContent).toContain(exp.company);
        expect(container.textContent).toContain(exp.period);
        expect(container.textContent).toContain(exp.location);

        for (const highlight of exp.highlights) {
          expect(container.textContent).toContain(highlight);
        }
      }
    });

    it("displays employer and client relationship with arrow for outsourced roles", () => {
      const onSelectImage = vi.fn();
      const { container } = render(
        <ExperienceSection onSelectImage={onSelectImage} />,
      );

      const outsourcedRoles = resumeData.experience.filter((exp) => exp.client);
      expect(outsourcedRoles.length).toBe(3);

      const arrows = container.querySelectorAll(".company-relationship-arrow");
      expect(arrows).toHaveLength(outsourcedRoles.length);

      for (const exp of outsourcedRoles) {
        if (exp.client) {
          expect(container.textContent).toContain(exp.client.name);
        }
      }
    });

    it("renders custom experience list passed via props", () => {
      const onSelectImage = vi.fn();
      const customExperience: ResumeExperience[] = [
        {
          role: "Lead Architect",
          company: "Acme Corp",
          companyLogo: {
            src: "https://example.com/acme.png",
            width: 100,
            height: 100,
            surface: "light",
          },
          location: "Remote",
          period: "2025 — Present",
          employmentTypes: ["Full-time"],
          highlights: ["Architected microservices"],
          technologies: ["Go", "Kafka"],
        },
      ];

      const { container } = render(
        <ExperienceSection
          experience={customExperience}
          onSelectImage={onSelectImage}
        />,
      );

      expect(container.textContent).toContain("Lead Architect");
      expect(container.textContent).toContain("Acme Corp");
      expect(container.querySelectorAll(".timeline-marker")).toHaveLength(1);
    });

    it("includes client name in print-only company line for outsourced roles", () => {
      const onSelectImage = vi.fn();
      const { container } = render(
        <ExperienceSection onSelectImage={onSelectImage} />,
      );

      const printCompanyElements = Array.from(
        container.querySelectorAll(".company"),
      );
      expect(printCompanyElements).toHaveLength(resumeData.experience.length);

      resumeData.experience.forEach((exp, index) => {
        const text = printCompanyElements[index]?.textContent?.trim();
        if (exp.client) {
          expect(text).toBe(`${exp.company} → ${exp.client.name}`);
        } else {
          expect(text).toBe(exp.company);
        }
      });
    });
  });

  describe("company and client logo zoom interactions", () => {
    it("triggers onSelectImage when clicking company logo", () => {
      const onSelectImage = vi.fn();
      const { container } = render(
        <ExperienceSection onSelectImage={onSelectImage} />,
      );

      const firstExp = resumeData.experience[0];
      const companyLogoBtn = container.querySelector(
        `button[aria-label="Open enlarged ${firstExp.company} logo"]`,
      );
      expect(companyLogoBtn).not.toBeNull();
      if (!companyLogoBtn) throw new Error("button not found");

      fireEvent.click(companyLogoBtn);
      expect(onSelectImage).toHaveBeenCalledWith({
        src: firstExp.companyLogo.src,
        alt: `${firstExp.company} logo`,
        surface: firstExp.companyLogo.surface,
      });
    });

    it("triggers onSelectImage when clicking client logo", () => {
      const onSelectImage = vi.fn();
      const { container } = render(
        <ExperienceSection onSelectImage={onSelectImage} />,
      );

      const firstExp = resumeData.experience[0];
      expect(firstExp.client).toBeDefined();
      if (!firstExp.client) throw new Error("client not found");

      const clientLogoBtn = container.querySelector(
        `button[aria-label="Open enlarged ${firstExp.client.name} logo"]`,
      );
      expect(clientLogoBtn).not.toBeNull();
      if (!clientLogoBtn) throw new Error("button not found");

      fireEvent.click(clientLogoBtn);
      expect(onSelectImage).toHaveBeenCalledWith({
        src: firstExp.client.logo.src,
        alt: `${firstExp.client.name} logo`,
        surface: firstExp.client.logo.surface,
      });
    });
  });

  describe("technology chips and fallback handling", () => {
    it("triggers onSelectImage when clicking a technology chip with a brand icon", () => {
      const onSelectImage = vi.fn();
      const { container } = render(
        <ExperienceSection onSelectImage={onSelectImage} />,
      );

      const reactChip = container.querySelector(
        'button[aria-label="Open enlarged React icon"]',
      );
      expect(reactChip).not.toBeNull();
      if (!reactChip) throw new Error("button not found");

      fireEvent.click(reactChip);
      expect(onSelectImage).toHaveBeenCalledWith({
        src: "https://resume-images.ohm-mho.space/technology-icons/react.svg",
        alt: "React icon",
        surface: "light",
      });
    });

    it("renders non-button chip for unmapped technologies with fallback icon", () => {
      const onSelectImage = vi.fn();
      const { container } = render(
        <ExperienceSection onSelectImage={onSelectImage} />,
      );

      const chipElements = Array.from(
        container.querySelectorAll(".technology-chip"),
      );
      const restApiChip = chipElements.find(
        (el) => el.textContent.trim() === "REST APIs",
      );

      expect(restApiChip).toBeDefined();
      expect(restApiChip?.tagName.toLowerCase()).toBe("span");
      expect(
        restApiChip?.querySelector(".technology-fallback-icon"),
      ).not.toBeNull();
    });

    it("disables zoom interaction when a technology icon image fails to load", () => {
      const onSelectImage = vi.fn();
      const { container } = render(
        <ExperienceSection onSelectImage={onSelectImage} />,
      );

      const img = container.querySelector(
        'button[aria-label="Open enlarged React icon"] img',
      );
      if (img) fireEvent.error(img);

      expect(
        container.querySelector(
          'button[aria-label="Open enlarged React icon"]',
        ),
      ).toBeNull();

      const reactChipSpan = getReactChipSpan(container);
      expect(reactChipSpan?.tagName.toLowerCase()).toBe("span");
      if (reactChipSpan) fireEvent.click(reactChipSpan);
      expect(onSelectImage).not.toHaveBeenCalled();
    });

    it("renders technology chips container with role='group' and descriptive aria-label", () => {
      const onSelectImage = vi.fn();
      const { container } = render(
        <ExperienceSection onSelectImage={onSelectImage} />,
      );

      const techGroups = container.querySelectorAll('div[role="group"]');
      expect(techGroups).toHaveLength(resumeData.experience.length);

      techGroups.forEach((group, index) => {
        expect(group.getAttribute("aria-label")).toBe(
          `Technologies used at ${resumeData.experience[index]?.company}`,
        );
      });
    });
  });
});
