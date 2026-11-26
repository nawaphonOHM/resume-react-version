import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ImageZoomProvider } from "../common/ImageZoomProvider";
import type { ResumeLink } from "../../resume-data";
import {
  expectZoomPreview,
  hoverImage,
  queryZoomPreview,
  setImageGeometry,
  tapImage,
} from "../../test-fixtures/image-zoom";
import { resumeProfile } from "../../test-fixtures/resume-profile";
import { ProfileSection } from "./ProfileSection";

const { details } = resumeProfile;
const [githubLink, websiteLink] = resumeProfile.links;
const websiteLogo = {
  src: "https://ohm-mho.space/assets/leader-board.svg",
  width: 64,
  height: 64,
  surface: "dark",
} as const;

function renderProfile(links: readonly ResumeLink[] = resumeProfile.links) {
  return render(
    <ImageZoomProvider>
      <ProfileSection details={details} links={links} />
    </ImageZoomProvider>,
  );
}

function getCard(container: HTMLElement, index: number): Element {
  const card = container.querySelectorAll(".profile-card")[index];
  return card;
}

function getLogo(link: HTMLElement): HTMLImageElement {
  const logo = link.querySelector<HTMLImageElement>(".link-logo");
  if (!logo) throw new Error("Link logo was not rendered");
  return logo;
}

function getFrame(logo: HTMLImageElement): HTMLElement {
  const frame = logo.parentElement;
  if (!frame) throw new Error("Link logo frame was not rendered");
  return frame;
}

function getDownscaledLogo(link: HTMLElement): HTMLImageElement {
  const logo = getLogo(link);
  setImageGeometry(logo);
  return logo;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ProfileSection details", () => {
  it("is the profile anchor labelled by its heading", () => {
    const { container } = renderProfile();
    const section = container.querySelector("section");
    const heading = screen.getByRole("heading", {
      level: 2,
      name: "Profile and links",
    });

    expect(section?.id).toBe("profile");
    expect(section?.hasAttribute("data-resume-section")).toBe(true);
    expect(section?.getAttribute("aria-labelledby")).toBe(heading.id);
    expect(container.querySelector(".section-kicker")?.textContent).toBe(
      "Public details",
    );
    expect(container.querySelector(".section-lead")?.textContent).toBe(
      "Public contact and personal details from the résumé, with the phone number kept private.",
    );
  });

  it("titles both cards with a decorative glyph avatar", () => {
    const { container } = renderProfile();
    const headers = Array.from(
      container.querySelectorAll(".profile-card-header"),
    );

    expect(
      headers.map((header) => [
        header.querySelector(".profile-card-title")?.textContent,
        header.querySelector(".profile-card-subtitle")?.textContent,
      ]),
    ).toEqual([
      ["Profile details", "Public résumé information"],
      ["Online", "External profiles and projects"],
    ]);
    expect(
      headers.every(
        (header) =>
          header.querySelector(
            '.profile-card-avatar[aria-hidden="true"] svg',
          ) !== null,
      ),
    ).toBe(true);
  });

  it("lists the public details as a definition list", () => {
    const { container } = renderProfile();
    const rows = Array.from(
      getCard(container, 0).querySelectorAll("dl > div"),
      (row) => [
        row.querySelector("dt")?.textContent,
        row.querySelector("dd")?.textContent,
      ],
    );

    expect(rows).toEqual([
      ["Location", details.location],
      ["Phone", details.phoneLabel],
      ["Email", details.email],
      ["Nationality", details.nationality],
      ["Date of birth", details.birthDate],
    ]);
  });

  it("links the email address to a mail composer", () => {
    renderProfile();

    expect(
      screen.getByRole("link", { name: details.email }).getAttribute("href"),
    ).toBe(`mailto:${details.email}`);
  });
});

describe("ProfileSection links", () => {
  it("renders each link as one control that opens in a new tab", () => {
    const { container } = renderProfile();
    const links = Array.from(
      getCard(container, 1).querySelectorAll<HTMLAnchorElement>(
        ".links-list a",
      ),
    );

    expect(links.map((link) => link.getAttribute("href"))).toEqual(
      resumeProfile.links.map((link) => link.url),
    );
    expect(links.map((link) => link.textContent)).toEqual(
      resumeProfile.links.map((link) => link.label),
    );
    expect(links.every((link) => link.target === "_blank")).toBe(true);
    expect(links.every((link) => link.rel === "noopener noreferrer")).toBe(
      true,
    );
    expect(container.querySelector("button")).toBeNull();
  });

  it("shows the logo, the label and an open-in-new glyph inside the link", () => {
    renderProfile();
    const link = screen.getByRole("link", { name: githubLink.label });
    const logo = getLogo(link);
    const frame = getFrame(logo);

    expect(logo.getAttribute("src")).toBe(githubLink.logo?.src);
    expect(logo.getAttribute("alt")).toBe("");
    expect(frame.getAttribute("aria-hidden")).toBe("true");
    expect(frame.classList.contains("link-logo-frame--light")).toBe(true);
    expect(
      link.querySelector('.link-open-icon[aria-hidden="true"] svg'),
    ).not.toBeNull();
  });

  it("renders a link without a logo with its label and glyph only", () => {
    renderProfile();
    const link = screen.getByRole("link", { name: websiteLink.label });

    expect(link.querySelector("img")).toBeNull();
    expect(link.querySelector(".link-open-icon svg")).not.toBeNull();
  });

  it("previews a link logo on hover", () => {
    renderProfile();
    const link = screen.getByRole("link", { name: githubLink.label });

    hoverImage(getDownscaledLogo(link));

    expectZoomPreview(githubLink.label, githubLink.logo?.src ?? "");
  });

  it("lets a tap on the GitHub logo follow the link instead of zooming", () => {
    renderProfile();
    const link = screen.getByRole("link", { name: githubLink.label });

    tapImage(getDownscaledLogo(link));

    expect(queryZoomPreview()).toBeNull();
  });

  it("toggles the preview of other link logos on touch", () => {
    renderProfile([{ ...websiteLink, logo: websiteLogo }]);
    const link = screen.getByRole("link", { name: websiteLink.label });
    const logo = getDownscaledLogo(link);

    tapImage(logo);
    expectZoomPreview(websiteLink.label, websiteLogo.src);
    expect(getFrame(logo).classList.contains("link-logo-frame--dark")).toBe(
      true,
    );

    tapImage(logo);
    expect(queryZoomPreview()).toBeNull();
  });
});
