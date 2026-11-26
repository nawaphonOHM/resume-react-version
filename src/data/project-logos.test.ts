import { describe, expect, it } from "vitest";
import {
  normalizeProjectLogo,
  projectLogoFileNameFromSource,
} from "./project-logos";

describe("project logo sources", () => {
  it.each([
    ["/company-logos/wisesoft.png", "wisesoft.png"],
    ["https://ohm-mho.space/company-logos/wisesoft.png", "wisesoft.png"],
    ["/link-logos/github.svg", "github.svg"],
  ])("maps %s to the flat asset file %s", (source, fileName) => {
    expect(projectLogoFileNameFromSource(source)).toBe(fileName);
  });

  it.each([
    "https://example.com/company-logos/wisesoft.png",
    "https://ohm-mho.space/assets/wisesoft.png?variant=large",
    "not a URL",
    undefined,
    42,
  ])("leaves unknown source %s unmapped", (source) => {
    expect(projectLogoFileNameFromSource(source)).toBeUndefined();
  });

  it("normalizes known sources while preserving image metadata", () => {
    const logo = {
      src: "/company-logos/wisesoft.png",
      width: 120,
      height: 80,
      surface: "dark" as const,
    };

    expect(normalizeProjectLogo(logo)).toEqual({
      ...logo,
      src: "https://ohm-mho.space/assets/wisesoft.png",
    });
  });

  it("passes unknown logos through unchanged", () => {
    const logo = {
      src: "https://example.com/logo.png",
      width: 120,
      height: 80,
      surface: "light" as const,
    };

    expect(normalizeProjectLogo(logo)).toBe(logo);
  });
});
