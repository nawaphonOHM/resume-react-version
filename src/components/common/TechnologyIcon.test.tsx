import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TechnologyIcon } from "./TechnologyIcon";
import { enhanceTechnologyIcon } from "../../services/technology-icon-contrast";
import type { TechnologyIconMetadata } from "../../data/technology-icons";

vi.mock("../../services/technology-icon-contrast", () => ({
  enhanceTechnologyIcon: Object.assign(
    vi.fn((src: string) => Promise.resolve(src)),
    { surfaceFor: vi.fn(() => "dark" as const) },
  ),
}));

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

beforeEach(() => {
  vi.mocked(enhanceTechnologyIcon).mockReset();
  vi.mocked(enhanceTechnologyIcon).mockImplementation((src) =>
    Promise.resolve(src),
  );
});

function expectIconSource(container: HTMLElement, src: string) {
  expect(container.querySelector("img")?.getAttribute("src")).toBe(src);
}

function expectIconBackground(container: HTMLElement, className: string) {
  expect(
    container
      .querySelector(".technology-icon-frame")
      ?.classList.contains(className),
  ).toBe(true);
}

async function resolveEnhancementAndAssert(
  resolveEnhancement: (value: string) => void,
  container: HTMLElement,
) {
  await act(async () => {
    resolveEnhancement("data:image/png;base64,enhanced");
    await Promise.resolve();
  });
  expectIconSource(container, "data:image/png;base64,enhanced");
  expectIconBackground(container, "bg-[#071a2e]");
}

function expectOriginalIconRestored(
  container: HTMLElement,
  onError: () => void,
) {
  expectIconSource(container, mockLightIcon.src);
  expectIconBackground(container, "bg-white");
  expect(onError).not.toHaveBeenCalled();
}

describe("TechnologyIcon", () => {
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

  it("keeps the original while processing and restores it if enhancement fails to display", async () => {
    const onError = vi.fn();
    let resolveEnhancement: (value: string) => void = () => {};
    vi.mocked(enhanceTechnologyIcon).mockReturnValue(
      new Promise((resolve) => {
        resolveEnhancement = resolve;
      }),
    );
    const { container } = render(
      <TechnologyIcon icon={mockLightIcon} label="React" onError={onError} />,
    );
    expectIconSource(container, mockLightIcon.src);
    await resolveEnhancementAndAssert(resolveEnhancement, container);
    fireEvent.error(container.querySelector("img") as HTMLImageElement);
    expectOriginalIconRestored(container, onError);
    fireEvent.error(container.querySelector("img") as HTMLImageElement);
    expect(onError).toHaveBeenCalledOnce();
  });

  it("ignores stale enhancement results after the source changes", async () => {
    let resolveFirst: (value: string) => void = () => {};
    vi.mocked(enhanceTechnologyIcon)
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
      )
      .mockResolvedValueOnce("data:image/png;base64,aws");
    const { container, rerender, unmount } = render(
      <TechnologyIcon icon={mockLightIcon} label="React" />,
    );
    rerender(<TechnologyIcon icon={mockDarkIcon} label="AWS" />);
    await waitFor(() => {
      expect(container.querySelector("img")?.getAttribute("src")).toBe(
        "data:image/png;base64,aws",
      );
    });
    await act(async () => {
      resolveFirst("data:image/png;base64,react");
      await Promise.resolve();
    });
    expect(container.querySelector("img")?.getAttribute("src")).toBe(
      "data:image/png;base64,aws",
    );
    unmount();
  });

  it("ignores an enhancement completing after unmount", async () => {
    let resolveEnhancement: (value: string) => void = () => {};
    vi.mocked(enhanceTechnologyIcon).mockReturnValue(
      new Promise((resolve) => {
        resolveEnhancement = resolve;
      }),
    );
    const { container, unmount } = render(
      <TechnologyIcon icon={mockLightIcon} label="React" />,
    );
    unmount();
    await act(async () => {
      resolveEnhancement("data:image/png;base64,late");
      await Promise.resolve();
    });
    expect(container.querySelector("img")).toBeNull();
  });
});
