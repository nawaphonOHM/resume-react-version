import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Header, type HeaderProps } from "./Header";

function createProps(overrides: Partial<HeaderProps> = {}): HeaderProps {
  return {
    name: "Nawaphon Isarathanachaikul",
    title: "Backend Engineer",
    activeSection: "experience",
    theme: "light",
    onToggleTheme: vi.fn(),
    downloadPending: false,
    downloadControlLabel: "Download résumé as PDF",
    downloadControlText: "Download PDF",
    onDownloadRequest: vi.fn(),
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});

function openMobileMenu(): HTMLElement {
  fireEvent.click(screen.getByRole("button", { name: "Open section menu" }));
  return screen.getByRole("button", { name: "Close section menu" });
}

describe("Header navigation and controls", () => {
  it("provides a skip link and marks the active desktop section", () => {
    render(<Header {...createProps()} />);

    expect(
      screen
        .getByRole("link", { name: "Skip to main content" })
        .getAttribute("href"),
    ).toBe("#main-content");

    const desktopNavigation = screen.getByRole("navigation", {
      name: "Portfolio sections",
    });
    expect(
      within(desktopNavigation)
        .getByRole("link", { name: "Experience" })
        .getAttribute("aria-current"),
    ).toBe("location");
  });

  it("opens the mobile section disclosure and closes it after navigation", () => {
    render(<Header {...createProps()} />);

    const openButton = screen.getByRole("button", {
      name: "Open section menu",
    });
    expect(openButton.getAttribute("aria-expanded")).toBe("false");

    const closeButton = openMobileMenu();
    expect(closeButton.getAttribute("aria-expanded")).toBe("true");
    expect(closeButton.getAttribute("aria-controls")).toBe(
      "mobile-section-menu",
    );

    const mobileNavigation = screen.getByRole("navigation", {
      name: "Mobile section navigation",
    });
    fireEvent.click(
      within(mobileNavigation).getByRole("link", { name: "Summary" }),
    );

    expect(
      screen.queryByRole("navigation", { name: "Mobile section navigation" }),
    ).toBeNull();
    expect(
      screen
        .getByRole("button", { name: "Open section menu" })
        .getAttribute("aria-expanded"),
    ).toBe("false");
  });

  it("closes the mobile menu with Escape and restores focus to its control", () => {
    render(<Header {...createProps()} />);

    const closeButton = openMobileMenu();
    const experienceLink = within(
      screen.getByRole("navigation", { name: "Mobile section navigation" }),
    ).getByRole("link", { name: "Experience" });

    experienceLink.focus();
    fireEvent.keyDown(experienceLink, { key: "Escape" });

    expect(
      screen.queryByRole("navigation", { name: "Mobile section navigation" }),
    ).toBeNull();
    expect(document.activeElement).toBe(closeButton);
  });

  it("labels the theme control with the action it will perform", () => {
    render(<Header {...createProps({ theme: "dark" })} />);

    expect(
      screen
        .getByRole("button", { name: "Switch to light theme" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });
});
