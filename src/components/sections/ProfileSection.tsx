import Panel from "@jetbrains/ring-ui-built/components/panel/panel";
import { getImageZoomHandlers } from "../common/image-zoom";
import {
  resumeData,
  type ResumeDetails,
  type ResumeLink,
} from "../../resume-data";
import type { ZoomImage } from "../common/image-zoom";

export interface ProfileSectionProps {
  details?: ResumeDetails;
  links?: readonly ResumeLink[] | ResumeLink[];
  onSelectImage: (image: ZoomImage) => void;
  print?: boolean;
}

interface ProfileLinkCardProps {
  link: ResumeLink;
  onSelectImage: (image: ZoomImage) => void;
}

function ProfileLinkCard({ link, onSelectImage }: ProfileLinkCardProps) {
  const logo = link.logo;
  const logoAlt = `${link.label} logo`;

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-raised)] p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
      <div>
        <p className="text-sm text-[var(--app-muted)]">External link</p>
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex text-base font-semibold text-[var(--app-heading)] hover:text-[var(--app-accent)] hover:underline"
        >
          {link.label}
        </a>
      </div>
      {logo ? (
        <button
          {...getImageZoomHandlers({ ...logo, alt: logoAlt }, onSelectImage)}
          type="button"
          aria-label={`Open enlarged ${logoAlt}`}
          className={`inline-flex rounded-xl border border-[color:var(--app-border)] p-3 ${logo.surface === "dark" ? "bg-[#071a2e]" : "bg-white/90"}`}
        >
          <img
            src={logo.src}
            alt={logoAlt}
            className="h-8 w-auto object-contain"
          />
        </button>
      ) : (
        <span className="text-sm font-medium text-[var(--app-accent)]">
          Open ↗
        </span>
      )}
    </div>
  );
}

export function ProfileSection({
  details: propsDetails,
  links: propsLinks,
  onSelectImage,
  print = false,
}: ProfileSectionProps) {
  const details = propsDetails ?? resumeData.details;
  const links = propsLinks ?? resumeData.links;
  const sectionId = print ? "print-profile" : "profile";

  return (
    <section
      id={sectionId}
      data-resume-section={print ? undefined : ""}
      aria-labelledby={`${sectionId}-title`}
      className="scroll-mt-24 py-16 sm:py-20"
    >
      <div className="section-heading section-heading--split grid gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--app-accent)] sm:text-sm">
            Public details
          </p>
          <h2
            id={`${sectionId}-title`}
            className="mt-2 text-3xl font-bold tracking-tight text-[var(--app-heading)]"
          >
            Profile and links
          </h2>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-[var(--app-muted)]">
          Public contact and personal details from the résumé, with the phone
          number kept private.
        </p>
      </div>

      <div className="profile-cards mt-10 grid gap-5 lg:grid-cols-2">
        <Panel className="profile-card rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3 border-b border-[color:var(--app-border)] pb-4">
            <span
              aria-hidden="true"
              className="grid size-10 shrink-0 place-items-center rounded-xl bg-[color:var(--app-accent-soft)] text-sm font-bold text-[var(--app-accent)]"
            >
              ID
            </span>
            <div>
              <h3 className="font-semibold text-[var(--app-heading)]">
                Profile details
              </h3>
              <p className="text-sm text-[var(--app-muted)]">
                Public résumé information
              </p>
            </div>
          </div>
          <dl className="profile-details">
            <div>
              <dt className="text-sm text-[var(--app-muted)]">Location</dt>
              <dd className="mt-1 text-base font-medium text-[var(--app-heading)]">
                {details.location}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-[var(--app-muted)]">Phone</dt>
              <dd className="mt-1 text-base font-medium text-[var(--app-heading)]">
                {details.phoneLabel}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-[var(--app-muted)]">Email</dt>
              <dd className="mt-1 break-words text-base font-medium text-[var(--app-heading)]">
                <a
                  href={`mailto:${details.email}`}
                  className="hover:text-[var(--app-accent)] hover:underline"
                >
                  {details.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-[var(--app-muted)]">Nationality</dt>
              <dd className="mt-1 text-base font-medium text-[var(--app-heading)]">
                {details.nationality}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-[var(--app-muted)]">Date of birth</dt>
              <dd className="mt-1 text-base font-medium text-[var(--app-heading)]">
                {details.birthDate}
              </dd>
            </div>
          </dl>
        </Panel>

        <Panel className="profile-card rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3 border-b border-[color:var(--app-border)] pb-4">
            <span
              aria-hidden="true"
              className="grid size-10 shrink-0 place-items-center rounded-xl bg-[color:var(--app-accent-soft)] text-lg font-bold text-[var(--app-accent)]"
            >
              ↗
            </span>
            <div>
              <h3 className="font-semibold text-[var(--app-heading)]">
                Online
              </h3>
              <p className="text-sm text-[var(--app-muted)]">
                External profiles and projects
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {links.map((link) => (
              <ProfileLinkCard
                key={link.label}
                link={link}
                onSelectImage={onSelectImage}
              />
            ))}
          </div>
        </Panel>
      </div>
    </section>
  );
}
