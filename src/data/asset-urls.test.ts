import { describe, expect, it } from "vitest";
import { assetUrls } from "./asset-urls";

describe("assetUrls", () => {
  it("builds flat asset URLs and encodes file names", () => {
    expect(assetUrls.file("spring.svg")).toBe(
      "https://ohm-mho.space/assets/spring.svg",
    );
    expect(assetUrls.file("resume profile.pdf")).toBe(
      "https://ohm-mho.space/assets/resume%20profile.pdf",
    );
  });

  it.each(["available", "limited", "unavailable"] as const)(
    "builds the status favicon URL for %s",
    (status) => {
      const query = encodeURIComponent(JSON.stringify({ status }));
      expect(assetUrls.favicon(status)).toBe(
        `https://ohm-mho.space/assets/favicon.svg?${query}`,
      );
    },
  );
});
