import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExperienceSection as BaseExperienceSection } from "./ExperienceSection";
import { ImageZoomProvider } from "../common/ImageZoomProvider";
import { type ResumeExperience } from "../../resume-data";
import {
  expectZoomPreview as expectPreview,
  hoverImage,
  leaveImage,
  queryZoomPreview,
  setImageGeometry,
  tapImage,
} from "../../test-fixtures/image-zoom";
import { resumeProfile as resumeData } from "../../test-fixtures/resume-profile";

vi.mock("../../services/technology-icon-contrast", () => ({
  enhanceTechnologyIcon: vi.fn((src: string) =>
    Promise.resolve({ src, background: "#ffffff" }),
  ),
}));

function ExperienceSection({
  experience = resumeData.experience,
}: {
  experience?: readonly ResumeExperience[];
}) {
  return (
    <ImageZoomProvider>
      <BaseExperienceSection experience={experience} />
    </ImageZoomProvider>
  );
}

function getChip(container: HTMLElement, technology: string): Element {
  const chip = Array.from(
    container.querySelectorAll(".technology-chip-content"),
  ).find((element) => element.textContent.trim() === technology);
  if (!chip) throw new Error(`Missing ${technology} chip`);
  return chip;
}

function getCards(container: HTMLElement): Element[] {
  return Array.from(container.querySelectorAll(".experience-card"));
}

function getDownscaledImage(
  container: Element,
  selector: string,
  index = 0,
): HTMLImageElement {
  const image = container.querySelectorAll<HTMLImageElement>(selector)[index];
  setImageGeometry(image);
  return image;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ExperienceSection", () => {
  describe("timeline rendering and content", () => {
    it("renders all experience records with numbered timeline markers", () => {
      const { container } = render(<ExperienceSection />);

      const markers = container.querySelectorAll(".timeline-marker span");
      expect(markers).toHaveLength(resumeData.experience.length);
      markers.forEach((marker, index) => {
        expect(marker.textContent).toBe(String(index + 1));
      });

      const cards = container.querySelectorAll(".experience-card");
      expect(cards).toHaveLength(resumeData.experience.length);
    });

    it("renders roles, companies, periods, locations, and highlights", () => {
      const { container } = render(<ExperienceSection />);

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
      const { container } = render(<ExperienceSection />);

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
        <ExperienceSection experience={customExperience} />,
      );

      expect(container.textContent).toContain("Lead Architect");
      expect(container.textContent).toContain("Acme Corp");
      expect(container.querySelectorAll(".timeline-marker")).toHaveLength(1);
    });

    it("keeps a company-only line for the printed résumé", () => {
      const { container } = render(<ExperienceSection />);

      const printCompanies = Array.from(
        container.querySelectorAll(".company"),
        (element) => element.textContent,
      );

      expect(printCompanies).toEqual(
        resumeData.experience.map((exp) => exp.company),
      );
    });

    it("is the experience anchor labelled by its heading", () => {
      const { container } = render(<ExperienceSection />);
      const section = container.querySelector("section");
      const heading = screen.getByRole("heading", {
        level: 2,
        name: "Experience timeline",
      });

      expect(section?.id).toBe("experience");
      expect(section?.hasAttribute("data-resume-section")).toBe(true);
      expect(section?.getAttribute("aria-labelledby")).toBe(heading.id);
      expect(container.querySelector(".section-kicker")?.textContent).toBe(
        "Employment",
      );
      expect(container.querySelector(".section-lead")?.textContent).toBe(
        "Five roles spanning full-stack delivery, banking systems, data platforms, integrations, and backend services.",
      );
    });
  });

  describe("card header", () => {
    it("labels the employer and client of an outsourced role", () => {
      const { container } = render(<ExperienceSection />);
      const [card] = getCards(container);
      const labels = Array.from(
        card.querySelectorAll(".company-label"),
        (label) => label.textContent,
      );

      expect(labels).toEqual(["Employer", "Client"]);
      expect(card.querySelector(".company-identity--client")).not.toBeNull();
    });

    it("labels a direct role with a single company identity", () => {
      const { container } = render(<ExperienceSection />);
      const directIndex = resumeData.experience.findIndex((exp) => !exp.client);
      const card = getCards(container)[directIndex];
      const labels = Array.from(
        card.querySelectorAll(".company-label"),
        (label) => label.textContent,
      );

      expect(labels).toEqual(["Company"]);
      expect(card.querySelector(".company-relationship-arrow")).toBeNull();
    });

    it("shows the role with its employment types joined by an arrow", () => {
      const { container } = render(
        <ExperienceSection
          experience={[
            {
              ...resumeData.experience[0],
              employmentTypes: ["Internship", "Full-time"],
            },
          ]}
        />,
      );
      const employment = container.querySelector(".employment-type");

      expect(
        screen.getByRole("heading", {
          level: 3,
          name: resumeData.experience[0].role,
        }),
      ).not.toBeNull();
      expect(employment?.textContent).toBe("Internship → Full-time");
      expect(employment?.getAttribute("aria-label")).toBe(
        "Employment type: Internship → Full-time",
      );
    });

    it("shows the location with a decorative glyph and the period", () => {
      const { container } = render(<ExperienceSection />);
      const [card] = getCards(container);
      const [job] = resumeData.experience;
      const location = card.querySelector(".location");

      expect(location?.textContent).toBe(job.location);
      expect(
        location?.querySelector('.location-icon[aria-hidden="true"] svg'),
      ).not.toBeNull();
      expect(card.querySelector(".period")?.textContent).toBe(job.period);
      expect(card.querySelector("hr.card-divider")).not.toBeNull();
    });

    it("lists the highlights of each role in order", () => {
      const { container } = render(<ExperienceSection />);
      const [card] = getCards(container);
      const highlights = Array.from(
        card.querySelectorAll(".highlights > li"),
        (item) => item.textContent,
      );

      expect(highlights).toEqual(resumeData.experience[0].highlights);
    });
  });

  describe("company and client logo zoom", () => {
    it("renders logos as decorative framed images without wrapper buttons", () => {
      const { container } = render(<ExperienceSection />);
      const firstExp = resumeData.experience[0];
      const logo = container.querySelector(".company-logo-frame > img");

      expect(container.querySelector("button")).toBeNull();
      expect(logo?.getAttribute("src")).toBe(firstExp.companyLogo.src);
      expect(logo?.getAttribute("alt")).toBe("");
      expect(
        logo?.parentElement?.classList.contains(
          `company-logo-frame--${firstExp.companyLogo.surface}`,
        ),
      ).toBe(true);
    });

    it("previews the company logo on hover and closes when the pointer leaves", () => {
      const { container } = render(<ExperienceSection />);
      const firstExp = resumeData.experience[0];
      const logo = getDownscaledImage(container, ".company-logo");

      hoverImage(logo);
      expectPreview(firstExp.company, firstExp.companyLogo.src);

      leaveImage(logo);
      expect(queryZoomPreview()).toBeNull();
    });

    it("toggles the client logo preview on touch", () => {
      const { container } = render(<ExperienceSection />);
      const client = resumeData.experience[0].client;
      if (!client) throw new Error("client not found");
      const logo = getDownscaledImage(container, ".company-logo", 1);

      tapImage(logo);
      expectPreview(client.name, client.logo.src);

      tapImage(logo);
      expect(queryZoomPreview()).toBeNull();
    });
  });

  describe("technology chips and fallback handling", () => {
    it("previews a technology icon from the image inside a plain chip", () => {
      const { container } = render(<ExperienceSection />);
      const reactChip = getChip(container, "React");
      const icon = getDownscaledImage(reactChip, "img");

      expect(reactChip.closest("button")).toBeNull();
      hoverImage(icon);

      expectPreview("React", "https://ohm-mho.space/assets/react.svg");
    });

    it("renders the fallback icon for unmapped technologies", () => {
      const { container } = render(<ExperienceSection />);
      const restApiChip = getChip(container, "REST APIs");

      expect(restApiChip.closest("button")).toBeNull();
      expect(
        restApiChip.querySelector(".technology-fallback-icon"),
      ).not.toBeNull();
      expect(restApiChip.querySelector("img")).toBeNull();
    });

    it("shows the fallback icon when a technology icon fails to load", () => {
      const { container } = render(<ExperienceSection />);
      const reactChip = getChip(container, "React");
      const icon = getDownscaledImage(reactChip, "img");
      hoverImage(icon);

      fireEvent.error(icon);

      expect(queryZoomPreview()).toBeNull();
      expect(reactChip.querySelector("img")).toBeNull();
      expect(
        reactChip.querySelector(".technology-fallback-icon"),
      ).not.toBeNull();
    });

    it("renders technology chips container with role='group' and descriptive aria-label", () => {
      const { container } = render(<ExperienceSection />);

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
