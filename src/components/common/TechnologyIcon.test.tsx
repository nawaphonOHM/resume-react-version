import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TechnologyIcon } from "./TechnologyIcon";
import type { TechnologyIconMetadata } from "../../data/technology-icons";

describe("TechnologyIcon", () => {
  const mockLightIcon: TechnologyIconMetadata = {
    src: "https://resume-images.ohm-mho.space/technology-icons/react.svg",
    width: 24,
    height: 24,
    surface: "light",
  };

  const mockDarkIcon: TechnologyIconMetadata = {
    src: "https://resume-images.ohm-mho.space/technology-icons/aws.svg",
    width: 24,
    height: 24,
    surface: "dark",
  };

  it("renders a brand icon image with correct attributes and light surface background", () => {
    const { container } = render(
      <TechnologyIcon icon={mockLightIcon} label="React" />,
    );

    const frame = container.querySelector(".technology-icon-frame");
    expect(frame).not.toBeNull();
    expect(frame?.classList.contains("bg-white")).toBe(true);

    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe(mockLightIcon.src);
    expect(img?.getAttribute("width")).toBe("24");
    expect(img?.getAttribute("height")).toBe("24");
    expect(img?.getAttribute("data-label")).toBe("React");
  });

  it("applies dark surface styling when icon surface is dark", () => {
    const { container } = render(
      <TechnologyIcon icon={mockDarkIcon} label="AWS" />,
    );

    const frame = container.querySelector(".technology-icon-frame");
    expect(frame?.classList.contains("bg-[#071a2e]")).toBe(true);
  });

  it("renders fallback code icon when icon is undefined", () => {
    const { container } = render(
      <TechnologyIcon icon={undefined} label="REST APIs" />,
    );

    expect(container.querySelector(".technology-fallback-icon")).not.toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });

  it("renders fallback code icon when icon is null", () => {
    const { container } = render(
      <TechnologyIcon icon={null} label="Caffeine" />,
    );

    expect(container.querySelector(".technology-fallback-icon")).not.toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });

  it("falls back to code icon when the image fails to load", () => {
    const { container } = render(
      <TechnologyIcon icon={mockLightIcon} label="React" />,
    );

    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    if (!img) throw new Error("Image not found");
    fireEvent.error(img);

    expect(container.querySelector(".technology-fallback-icon")).not.toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });

  it("calls onError callback when image fails to load", () => {
    const onError = vi.fn();
    const { container } = render(
      <TechnologyIcon icon={mockLightIcon} label="React" onError={onError} />,
    );

    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    if (!img) throw new Error("Image not found");
    fireEvent.error(img);

    expect(onError).toHaveBeenCalledTimes(1);
    expect(container.querySelector(".technology-fallback-icon")).not.toBeNull();
  });

  it("resets error state when icon src changes", () => {
    const { container, rerender } = render(
      <TechnologyIcon icon={mockLightIcon} label="React" />,
    );

    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    if (!img) return;
    fireEvent.error(img);

    expect(container.querySelector(".technology-fallback-icon")).not.toBeNull();

    rerender(<TechnologyIcon icon={mockDarkIcon} label="AWS" />);
    expect(container.querySelector("img")?.getAttribute("src")).toBe(
      mockDarkIcon.src,
    );
  });
});
