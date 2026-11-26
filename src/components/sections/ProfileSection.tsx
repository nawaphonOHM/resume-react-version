import { type ReactNode } from "react";
import Button from "@jetbrains/ring-ui-built/components/button/button";
import { ControlsHeight } from "@jetbrains/ring-ui-built/components/global/controls-height";
import Icon from "@jetbrains/ring-ui-built/components/icon/icon";
import Island from "@jetbrains/ring-ui-built/components/island/island";
import { useImageZoom } from "../../hooks/use-image-zoom";
import {
  type ImageAsset,
  type ResumeDetails,
  type ResumeLink,
} from "../../resume-data";
import {
  badgeIcon,
  linkIcon,
  openInNewIcon,
  resizeIcon,
} from "../common/material-icons";

export interface ProfileSectionProps {
  details: ResumeDetails;
  links: readonly ResumeLink[];
}

interface ProfileCardProps {
  glyph: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}

interface LinkLogoProps {
  logo: ImageAsset;
  label: string;
}

// A tap on the GitHub logo must follow the link instead of opening a preview.
const TOUCH_ZOOM_EXCLUDED_LABEL = "GitHub";
const LINK_ICON_SIZE = 18;
const openInNewGlyph = resizeIcon(openInNewIcon, LINK_ICON_SIZE);

function ProfileCard({ glyph, title, subtitle, children }: ProfileCardProps) {
  return (
    <div className="profile-card">
      <Island>
        <div className="profile-card-header">
          <span className="profile-card-avatar" aria-hidden="true">
            <Icon glyph={glyph} />
          </span>
          <div className="profile-card-heading">
            <div className="profile-card-title">{title}</div>
            <div className="profile-card-subtitle">{subtitle}</div>
          </div>
        </div>
        <hr className="card-divider" />
        <div className="profile-card-content">{children}</div>
      </Island>
    </div>
  );
}

function ProfileDetails({ details }: Pick<ProfileSectionProps, "details">) {
  return (
    <dl className="profile-details">
      <div>
        <dt>Location</dt>
        <dd>{details.location}</dd>
      </div>
      <div>
        <dt>Phone</dt>
        <dd>{details.phoneLabel}</dd>
      </div>
      <div>
        <dt>Email</dt>
        <dd>
          <a href={`mailto:${details.email}`}>{details.email}</a>
        </dd>
      </div>
      <div>
        <dt>Nationality</dt>
        <dd>{details.nationality}</dd>
      </div>
      <div>
        <dt>Date of birth</dt>
        <dd>{details.birthDate}</dd>
      </div>
    </dl>
  );
}

function LinkLogo({ logo, label }: LinkLogoProps) {
  const zoom = useImageZoom({
    logo,
    label,
    touch: label !== TOUCH_ZOOM_EXCLUDED_LABEL,
  });

  return (
    <span
      className={`link-logo-frame link-logo-frame--${logo.surface} grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg border border-solid border-outline p-1.5`}
      aria-hidden="true"
    >
      <img
        {...zoom}
        className="link-logo block h-full w-full object-contain"
        src={logo.src}
        width={logo.width}
        height={logo.height}
        loading="lazy"
        alt=""
      />
    </span>
  );
}

function ProfileLink({ link }: { link: ResumeLink }) {
  return (
    <span className="profile-link">
      <Button
        transparent
        inline={false}
        height={ControlsHeight.L}
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        <span className="profile-link-content flex min-w-0 items-center gap-3">
          <span className="link-identity flex min-w-0 flex-1 items-center gap-2.5 text-left">
            {link.logo && <LinkLogo logo={link.logo} label={link.label} />}
            <span className="link-label min-w-0 leading-tight whitespace-normal [overflow-wrap:anywhere]">
              {link.label}
            </span>
          </span>
          <span className="link-open-icon" aria-hidden="true">
            <Icon glyph={openInNewGlyph} />
          </span>
        </span>
      </Button>
    </span>
  );
}

export function ProfileSection({ details, links }: ProfileSectionProps) {
  return (
    <section
      id="profile"
      className="profile-section scroll-mt-24 py-16 sm:py-20"
      data-resume-section=""
      aria-labelledby="profile-title"
    >
      <div className="section-heading">
        <div>
          <p className="section-kicker">Public details</p>
          <h2 id="profile-title" className="section-title">
            Profile and links
          </h2>
        </div>
        <p className="section-lead">
          Public contact and personal details from the résumé, with the phone
          number kept private.
        </p>
      </div>

      <div className="profile-cards mt-10 grid gap-5 lg:grid-cols-2">
        <ProfileCard
          glyph={badgeIcon}
          title="Profile details"
          subtitle="Public résumé information"
        >
          <ProfileDetails details={details} />
        </ProfileCard>

        <ProfileCard
          glyph={linkIcon}
          title="Online"
          subtitle="External profiles and projects"
        >
          <div className="links-list grid gap-[0.8rem]">
            {links.map((link) => (
              <ProfileLink key={link.url} link={link} />
            ))}
          </div>
        </ProfileCard>
      </div>
    </section>
  );
}
