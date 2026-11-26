import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { resumeProfile } from "../../test-fixtures/resume-profile";
import { SkillsSection } from "./SkillsSection";

function renderSkills(skills: readonly string[] = resumeProfile.skills) {
  return render(<SkillsSection skills={skills} />);
}

afterEach(() => {
  cleanup();
});

describe("SkillsSection", () => {
  it("is the skills anchor labelled by its heading", () => {
    const { container } = renderSkills();
    const section = container.querySelector("section");
    const heading = screen.getByRole("heading", {
      level: 2,
      name: "Core skills",
    });

    expect(section?.id).toBe("skills");
    expect(section?.hasAttribute("data-resume-section")).toBe(true);
    expect(section?.getAttribute("aria-labelledby")).toBe(heading.id);
  });

  it("shows the light kicker and the fixed lead inside the dark panel", () => {
    const { container } = renderSkills(["Go"]);
    const panel = container.querySelector(".skills-panel");

    expect(panel?.querySelector(".section-kicker-light")?.textContent).toBe(
      "Technical toolkit",
    );
    expect(panel?.querySelector(".skills-lead")?.textContent).toBe(
      "Six technologies highlighted in the original résumé.",
    );
  });

  it("lists every skill in order as a chip", () => {
    renderSkills();
    const group = screen.getByRole("group", { name: "Core technical skills" });
    const chips = Array.from(
      group.querySelectorAll(".chip-label"),
      (chip) => chip.textContent,
    );

    expect(chips).toEqual(resumeProfile.skills);
  });

  it("renders chips that cannot be activated or removed", () => {
    const { container } = renderSkills();

    expect(container.querySelector("button")).toBeNull();
    expect(container.querySelector("a")).toBeNull();
    expect(container.querySelector("[tabindex]")).toBeNull();
  });

  it("renders an empty chip group when no skills are supplied", () => {
    renderSkills([]);
    const group = screen.getByRole("group", { name: "Core technical skills" });

    expect(group.childElementCount).toBe(0);
  });
});
