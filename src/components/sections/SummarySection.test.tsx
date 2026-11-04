import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { resumeData } from "../../resume-data";
import { SummarySection } from "./SummarySection";

describe("SummarySection", () => {
  it("renders the section heading, kicker, title, and lead", () => {
    const { container } = render(<SummarySection />);

    expect(container.textContent).toContain("Professional summary");
    expect(container.textContent).toContain("From interface to infrastructure");
    expect(container.textContent).toContain(
      "Practical experience across front-end delivery, APIs, data operations, automation, and containerized systems.",
    );
  });

  it("renders formatted two-digit numbered badges for default summary items", () => {
    const { container } = render(<SummarySection />);

    const numbers = Array.from(
      container.querySelectorAll(".summary-number"),
    ).map((el) => el.textContent.trim());

    expect(numbers).toEqual(["01", "02", "03", "04"]);

    for (const item of resumeData.summary) {
      expect(container.textContent).toContain(item);
    }
  });

  it("renders custom summary items provided through props", () => {
    const customSummary = [
      "Architected distributed event-driven systems.",
      "Engineered responsive user interfaces with React and Angular.",
    ];

    const { container } = render(<SummarySection summary={customSummary} />);

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
