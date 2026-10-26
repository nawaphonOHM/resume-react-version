import Panel from "@jetbrains/ring-ui-built/components/panel/panel";
import { resumeData, type ResumeLink } from "../../resume-data";

export interface ProfileSectionProps {
  onSelectImage: (image: { src: string; alt: string }) => void;
}

interface ProfileLinkCardProps {
  link: ResumeLink;
  onSelectImage: (image: { src: string; alt: string }) => void;
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
          type="button"
          aria-label={`Open enlarged ${logoAlt}`}
          className="inline-flex rounded-xl border border-[color:var(--app-border)] bg-white/90 p-3"
          onClick={() => {
            onSelectImage({
              src: logo.src,
              alt: logoAlt,
            });
          }}
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

export function ProfileSection({ onSelectImage }: ProfileSectionProps) {
  return (
    <section id="profile" className="scroll-mt-36">
      <div className="mb-4">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--app-accent)]">
          Public details
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-[var(--app-heading)]">
          Profile
        </h2>
      </div>

      <Panel className="rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
        <div className="space-y-6">
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div>
              <dt className="text-sm text-[var(--app-muted)]">Email</dt>
              <dd className="mt-1 text-base font-medium text-[var(--app-heading)]">
                {resumeData.details.email}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-[var(--app-muted)]">Phone</dt>
              <dd className="mt-1 text-base font-medium text-[var(--app-heading)]">
                {resumeData.details.phoneLabel}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-[var(--app-muted)]">Nationality</dt>
              <dd className="mt-1 text-base font-medium text-[var(--app-heading)]">
                {resumeData.details.nationality}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-[var(--app-muted)]">Birth date</dt>
              <dd className="mt-1 text-base font-medium text-[var(--app-heading)]">
                {resumeData.details.birthDate}
              </dd>
            </div>
          </dl>

          <div className="space-y-3">
            {resumeData.links.map((link) => (
              <ProfileLinkCard
                key={link.label}
                link={link}
                onSelectImage={onSelectImage}
              />
            ))}
          </div>
        </div>
      </Panel>
    </section>
  );
}
