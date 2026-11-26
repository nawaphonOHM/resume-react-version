import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ImageZoomProvider } from "../common/ImageZoomProvider";
import type { ResumeEducation } from "../../resume-data";
import {
  expectZoomPreview,
  hoverImage,
  leaveImage,
  queryZoomPreview,
  setImageGeometry,
  tapImage,
} from "../../test-fixtures/image-zoom";
import { resumeProfile } from "../../test-fixtures/resume-profile";
import { EducationSection } from "./EducationSection";

const { education } = resumeProfile;

function renderEducation(value: ResumeEducation = education) {
  return render(
    <ImageZoomProvider>
      <EducationSection education={value} />
    </ImageZoomProvider>,
  );
}

function getLogo(container: HTMLElement): HTMLImageElement {
  const logo = container.querySelector<HTMLImageElement>(".institution-logo");
  if (!logo) throw new Error("Institution logo was not rendered");
  return logo;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("EducationSection content", () => {
  it("is the education anchor labelled by its heading", () => {
    const { container } = renderEducation();
    const section = container.querySelector("section");
    const heading = screen.getByRole("heading", {
      level: 2,
      name: "Education",
    });

    expect(section?.id).toBe("education");
    expect(section?.hasAttribute("data-resume-section")).toBe(true);
    expect(section?.getAttribute("aria-labelledby")).toBe(heading.id);
    expect(container.querySelector(".section-kicker")?.textContent).toBe(
      "Academic background",
    );
    expect(container.querySelector(".section-lead")?.textContent).toBe(
      "Computer engineering studies grounded in software development and completed with a senior project.",
    );
  });

  it("shows the degree and the institution", () => {
    const { container } = renderEducation();

    expect(
      screen.getByRole("heading", { level: 3, name: education.degree }),
    ).not.toBeNull();
    expect(container.querySelector(".institution")?.textContent).toBe(
      education.institution,
    );
  });

  it("lists the study period and GPAX as labelled degree details", () => {
    const { container } = renderEducation();
    const metadata = container.querySelector(".education-metadata");
    const rows = Array.from(metadata?.querySelectorAll(":scope > div") ?? []);

    expect(metadata?.tagName).toBe("DL");
    expect(metadata?.getAttribute("aria-label")).toBe("Degree details");
    expect(
      rows.map((row) => [
        row.querySelector("dt")?.textContent,
        row.querySelector("dd")?.textContent,
      ]),
    ).toEqual([
      ["Study period", education.period],
      ["GPAX", education.gpax],
    ]);
  });

  it("describes the senior project after a divider", () => {
    const { container } = renderEducation();

    expect(container.querySelector("hr.card-divider")).not.toBeNull();
    expect(container.querySelector(".project-title")?.textContent).toBe(
      `Senior project: ${education.seniorProject.name}`,
    );
    expect(container.querySelector(".project-description")?.textContent).toBe(
      "Academic capstone project repository",
    );
  });

  it("links to the project source code in a new tab", () => {
    renderEducation();
    const link = screen.getByRole("link", {
      name: `View source code for ${education.seniorProject.name} (opens in a new tab)`,
    });

    expect(link.textContent).toBe("View source code");
    expect(link.getAttribute("href")).toBe(education.seniorProject.url);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    expect(link.querySelector("svg")).not.toBeNull();
  });
});

describe("EducationSection logo", () => {
  it("frames the institution logo on its surface as decoration", () => {
    const { container } = renderEducation();
    const logo = getLogo(container);
    const frame = logo.parentElement;

    expect(logo.getAttribute("src")).toBe(education.institutionLogo.src);
    expect(logo.getAttribute("alt")).toBe("");
    expect(frame?.getAttribute("aria-hidden")).toBe("true");
    expect(
      frame?.classList.contains(
        `institution-logo-frame--${education.institutionLogo.surface}`,
      ),
    ).toBe(true);
    expect(container.querySelector("button")).toBeNull();
  });

  it("uses the dark frame for a logo made for dark surfaces", () => {
    const { container } = renderEducation({
      ...education,
      institutionLogo: { ...education.institutionLogo, surface: "dark" },
    });

    expect(
      getLogo(container).parentElement?.classList.contains(
        "institution-logo-frame--dark",
      ),
    ).toBe(true);
  });

  it("keeps a decorative school glyph for the printed résumé", () => {
    const { container } = renderEducation();
    const printIcon = container.querySelector(".education-icon--print");

    expect(printIcon?.getAttribute("aria-hidden")).toBe("true");
    expect(printIcon?.querySelector("svg")).not.toBeNull();
  });

  it("previews the logo on hover and closes when the pointer leaves", () => {
    const { container } = renderEducation();
    const logo = getLogo(container);
    setImageGeometry(logo);

    hoverImage(logo);
    expectZoomPreview(education.institution, education.institutionLogo.src);

    leaveImage(logo);
    expect(queryZoomPreview()).toBeNull();
  });

  it("toggles the logo preview on touch", () => {
    const { container } = renderEducation();
    const logo = getLogo(container);
    setImageGeometry(logo);

    tapImage(logo);
    expectZoomPreview(education.institution, education.institutionLogo.src);

    tapImage(logo);
    expect(queryZoomPreview()).toBeNull();
  });
});
