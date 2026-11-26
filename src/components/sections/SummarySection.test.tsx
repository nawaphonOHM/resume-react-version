import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { resumeProfile as resumeData } from "../../test-fixtures/resume-profile";
import { SummarySection } from "./SummarySection";

function renderSummary(summary: readonly string[] = resumeData.summary) {
  return render(<SummarySection summary={summary} />);
}

afterEach(() => {
  cleanup();
});

describe("SummarySection", () => {
  it("is the about anchor labelled by its heading", () => {
    const { container } = renderSummary();
    const section = container.querySelector("section");
    const heading = screen.getByRole("heading", {
      level: 2,
      name: "From interface to infrastructure",
    });

    expect(section?.id).toBe("about");
    expect(section?.hasAttribute("data-resume-section")).toBe(true);
    expect(section?.getAttribute("aria-labelledby")).toBe(heading.id);
    expect(heading.id).toBe("summary-title");
  });

  it("renders the section heading, kicker, title, and lead", () => {
    const { container } = renderSummary();

    expect(container.querySelector(".section-kicker")?.textContent).toBe(
      "Professional summary",
    );
    expect(container.querySelector(".section-lead")?.textContent).toBe(
      "Practical experience across front-end delivery, APIs, data operations, automation, and containerized systems.",
    );
  });

  it("renders formatted two-digit numbered badges for default summary items", () => {
    const { container } = renderSummary();

    const numbers = Array.from(
      container.querySelectorAll(".summary-number"),
    ).map((el) => el.textContent.trim());

    expect(numbers).toEqual(["01", "02", "03", "04"]);

    for (const item of resumeData.summary) {
      expect(container.textContent).toContain(item);
    }
  });

  it("lists every statement in order inside its own card", () => {
    const { container } = renderSummary();
    const items = Array.from(container.querySelectorAll("ol > li"));

    expect(items.map((item) => item.querySelector("p")?.textContent)).toEqual(
      resumeData.summary,
    );
    expect(
      items.every((item) => item.querySelector(".summary-card") !== null),
    ).toBe(true);
    expect(
      container.querySelector(".summary-number")?.getAttribute("aria-hidden"),
    ).toBe("true");
  });

  it("renders custom summary items provided through props", () => {
    const customSummary = [
      "Architected distributed event-driven systems.",
      "Engineered responsive user interfaces with React and Angular.",
    ];

    const { container } = renderSummary(customSummary);

    const numbers = Array.from(
      container.querySelectorAll(".summary-number"),
    ).map((el) => el.textContent.trim());

    expect(numbers).toEqual(["01", "02"]);
    expect(container.textContent).toContain(
      "Architected distributed event-driven systems.",
    );
    expect(container.textContent).toContain(
      "Engineered responsive user interfaces with React and Angular.",
    );
  });
});
