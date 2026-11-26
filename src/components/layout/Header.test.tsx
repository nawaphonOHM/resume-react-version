import "../../test-fixtures/match-media";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Header, type HeaderProps } from "./Header";

const SECTION_LABELS = [
  "About",
  "Experience",
  "Education",
  "Skills",
  "Profile",
];

function createProps(overrides: Partial<HeaderProps> = {}): HeaderProps {
  return {
    activeSection: "experience",
    theme: "light",
    onToggleTheme: vi.fn(),
    downloadAvailable: true,
    downloadPending: false,
    downloadControlLabel: "Download résumé as PDF",
    downloadControlText: "Download PDF",
    onDownloadRequest: vi.fn(),
    ...overrides,
  };
}

function renderHeader(overrides: Partial<HeaderProps> = {}) {
  const props = createProps(overrides);
  const view = render(<Header {...props} />);
  return { props, ...view };
}

function getButton(name: string): HTMLButtonElement {
  return screen.getByRole<HTMLButtonElement>("button", { name });
}

function glyphOf(button: HTMLElement): string {
  return button.querySelector("svg")?.innerHTML ?? "";
}

function openMobileMenu(): HTMLElement {
  fireEvent.click(getButton("Open section menu"));
  return screen.getByRole("grid", { name: "Section menu" });
}

function menuLabels(menu: HTMLElement): (string | null)[] {
  return Array.from(
    menu.querySelectorAll("[data-test=ring-list-item-label]"),
    (label) => label.textContent,
  );
}

function menuDownloadItem(menu: HTMLElement): HTMLButtonElement {
  const item = within(menu).getByText("Download PDF").closest("button");
  if (!item) throw new Error("Download menu item was not rendered");
  return item;
}

afterEach(() => {
  cleanup();
});

describe("Header toolbar", () => {
  it("provides the skip link and the static brand mark", () => {
    renderHeader();

    expect(
      screen
        .getByRole("link", { name: "Skip to main content" })
        .getAttribute("href"),
    ).toBe("#main-content");

    const brand = screen.getByRole("link", { name: "Go to About section" });
    expect(brand.getAttribute("href")).toBe("#about");
    expect(brand.textContent).toBe("NI");
  });

  it("lists the five sections and marks the active one", () => {
    renderHeader();

    const links = within(
      screen.getByRole("navigation", { name: "Portfolio sections" }),
    ).getAllByRole("link");

    expect(links.map((link) => link.textContent)).toEqual(SECTION_LABELS);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "#about",
      "#experience",
      "#education",
      "#skills",
      "#profile",
    ]);
    expect(links.map((link) => link.getAttribute("aria-current"))).toEqual([
      null,
      "location",
      null,
      null,
      null,
    ]);
  });

  it("offers no print control", () => {
    renderHeader();

    expect(screen.queryByRole("button", { name: /print/i })).toBeNull();
    expect(screen.queryByText("Print")).toBeNull();
  });
});

describe("Header theme control", () => {
  it("names and shows the theme it will switch to", () => {
    const { rerender, props } = renderHeader({ theme: "light" });
    const darkGlyph = glyphOf(getButton("Switch to dark theme"));

    rerender(<Header {...props} theme="dark" />);
    const lightButton = getButton("Switch to light theme");

    expect(glyphOf(lightButton)).not.toBe(darkGlyph);
    expect(lightButton.hasAttribute("aria-pressed")).toBe(false);
    expect(screen.queryByRole("button", { name: "Switch to dark theme" })).toBe(
      null,
    );
  });

  it("requests a theme toggle", () => {
    const { props } = renderHeader();

    fireEvent.click(getButton("Switch to dark theme"));

    expect(props.onToggleTheme).toHaveBeenCalledOnce();
  });
});

describe("Header download control", () => {
  it("requests a download from the icon button", () => {
    const { props } = renderHeader();
    const button = getButton("Download résumé as PDF");

    fireEvent.click(button);

    expect(button.textContent).toBe("");
    expect(button.disabled).toBe(false);
    expect(button.getAttribute("aria-busy")).toBe("false");
    expect(props.onDownloadRequest).toHaveBeenCalledOnce();
  });

  it("switches to the download-off icon only when the PDF is unavailable", () => {
    const { rerender, props } = renderHeader({ downloadAvailable: true });
    const availableGlyph = glyphOf(getButton("Download résumé as PDF"));

    rerender(<Header {...props} downloadAvailable={null} />);
    expect(glyphOf(getButton("Download résumé as PDF"))).toBe(availableGlyph);

    rerender(<Header {...props} downloadAvailable={false} />);
    expect(glyphOf(getButton("Download résumé as PDF"))).not.toBe(
      availableGlyph,
    );
  });

  it("is busy and disabled while a download is pending", () => {
    const { props } = renderHeader({
      downloadPending: true,
      downloadControlLabel: "Downloading résumé PDF (42%)",
    });
    const button = getButton("Downloading résumé PDF (42%)");

    fireEvent.click(button);

    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(props.onDownloadRequest).not.toHaveBeenCalled();
  });
});

describe("Header mobile menu", () => {
  it("stays closed until the menu control is used", () => {
    renderHeader();

    const control = getButton("Open section menu");

    expect(control.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("grid", { name: "Section menu" })).toBeNull();
  });

  it("lists the sections, a separator and the download action", () => {
    renderHeader();

    const menu = openMobileMenu();
    const links = within(menu).getAllByRole("link");

    expect(getButton("Open section menu").getAttribute("aria-expanded")).toBe(
      "true",
    );
    expect(menuLabels(menu)).toEqual([...SECTION_LABELS, "Download PDF"]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "#about",
      "#experience",
      "#education",
      "#skills",
      "#profile",
    ]);
    expect(
      links.filter((link) => link.getAttribute("aria-current") === "location"),
    ).toEqual([links[1]]);
    expect(
      menu.querySelectorAll("[data-test~=ring-list-separator]"),
    ).toHaveLength(1);
  });

  it("requests a download from the menu", () => {
    const { props } = renderHeader();

    fireEvent.click(menuDownloadItem(openMobileMenu()));

    expect(props.onDownloadRequest).toHaveBeenCalledOnce();
  });

  it("shows the state text and blocks the action while pending", () => {
    const { props } = renderHeader({
      downloadPending: true,
      downloadControlText: "Downloading PDF…",
    });

    const menu = openMobileMenu();
    const item = within(menu).getByText("Downloading PDF…").closest("button");
    if (item) fireEvent.click(item);

    expect(item?.disabled).toBe(true);
    expect(props.onDownloadRequest).not.toHaveBeenCalled();
  });
});
