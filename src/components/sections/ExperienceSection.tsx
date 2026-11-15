import { useState } from "react";
import Panel from "@jetbrains/ring-ui-built/components/panel/panel";
import { resolveTechnologyIcon } from "../../data/technology-icons";
import { resumeData, type ResumeExperience } from "../../resume-data";
import { TechnologyIcon } from "../common/TechnologyIcon";
import type { ZoomImage } from "../dialogs/ImageZoomDialog";

export interface ExperienceSectionProps {
  experience?: readonly ResumeExperience[] | ResumeExperience[];
  items?: readonly ResumeExperience[] | ResumeExperience[];
  onSelectImage: (image: ZoomImage) => void;
}

interface ExperienceCardProps {
  item: ResumeExperience;
  onSelectImage: (image: ZoomImage) => void;
}

interface TechnologyChipProps {
  technology: string;
  onSelectImage: (image: ZoomImage) => void;
}

function TechnologyChip({ technology, onSelectImage }: TechnologyChipProps) {
  const icon = resolveTechnologyIcon(technology);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const hasImageError = Boolean(icon && failedSrc === icon.src);

  const canZoom = Boolean(icon && !hasImageError);

  if (canZoom && icon) {
    return (
      <button
        type="button"
        aria-label={`Open enlarged ${technology} icon`}
        onClick={() => {
          onSelectImage({
            src: icon.src,
            alt: `${technology} icon`,
            surface: icon.surface,
          });
        }}
        className="technology-chip inline-flex max-w-full items-center gap-1.5 rounded-full border border-[color:var(--app-border)] bg-[var(--app-surface-raised)] px-2.5 py-1 text-xs font-medium text-[var(--app-heading)] transition hover:border-[color:var(--app-accent)] hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)] cursor-pointer"
      >
        <TechnologyIcon
          icon={icon}
          label={technology}
          onError={() => {
            setFailedSrc(icon.src);
          }}
        />
        <span className="technology-label min-w-0 truncate">{technology}</span>
      </button>
    );
  }

  return (
    <span className="technology-chip inline-flex max-w-full items-center gap-1.5 rounded-full border border-[color:var(--app-border)] bg-[var(--app-surface-raised)] px-2.5 py-1 text-xs font-medium text-[var(--app-heading)]">
      <TechnologyIcon
        icon={icon && !hasImageError ? icon : null}
        label={technology}
        onError={() => {
          setFailedSrc(icon?.src ?? null);
        }}
      />
      <span className="technology-label min-w-0 truncate">{technology}</span>
    </span>
  );
}

function LocationIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 text-[var(--app-muted)] ${className}`}
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
    </svg>
  );
}

function ExperienceCard({ item, onSelectImage }: ExperienceCardProps) {
  const client = item.client;
  const employmentLabel = item.employmentTypes.join(" → ");

  return (
    <Panel className="experience-card print-break-inside-avoid min-w-0 rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] shadow-sm">
      <div className="p-6 sm:p-8">
        {/* Header section with company identities, role, and period */}
        <div className="experience-header flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            {/* Employer and Client identities */}
            <div className="company-identities mb-4 flex flex-wrap items-start gap-x-5 gap-y-3 max-sm:flex-col">
              <div className="company-identity min-w-0 max-w-full">
                <span className="company-label mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--app-accent)]">
                  {client ? "Employer" : "Company"}
                </span>
                <div className="company-identity-content flex min-w-0 max-w-full items-center gap-3">
                  <button
                    type="button"
                    aria-label={`Open enlarged ${item.company} logo`}
                    onClick={() => {
                      onSelectImage({
                        src: item.companyLogo.src,
                        alt: `${item.company} logo`,
                        surface: item.companyLogo.surface,
                      });
                    }}
                    className={`company-logo-frame grid shrink-0 place-items-center overflow-hidden rounded-xl border border-[color:var(--app-border)] p-1.5 transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
                      item.companyLogo.surface === "dark"
                        ? "bg-[#071a2e]"
                        : "bg-white"
                    }`}
                  >
                    <img
                      src={item.companyLogo.src}
                      alt=""
                      width={item.companyLogo.width}
                      height={item.companyLogo.height}
                      className="company-logo block h-full w-full object-contain"
                      loading="lazy"
                    />
                  </button>
                  <span className="company-name min-w-0 font-semibold text-[var(--app-heading)]">
                    {item.company}
                  </span>
                </div>
              </div>

              {client && (
                <div className="company-client-relationship flex min-w-0 max-w-full items-start gap-4 max-sm:w-full max-sm:flex-col max-sm:gap-2">
                  <span
                    className="company-relationship-arrow mt-5 grid h-12 w-5 shrink-0 place-items-center text-xl font-extrabold text-[var(--app-accent)] max-sm:mt-0 max-sm:h-6 max-sm:w-auto max-sm:rotate-90"
                    aria-hidden="true"
                  >
                    →
                  </span>
                  <div className="company-identity company-identity--client min-w-0 max-w-full">
                    <span className="company-label mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--app-accent)]">
                      Client
                    </span>
                    <div className="company-identity-content flex min-w-0 max-w-full items-center gap-3">
                      <button
                        type="button"
                        aria-label={`Open enlarged ${client.name} logo`}
                        onClick={() => {
                          onSelectImage({
                            src: client.logo.src,
                            alt: `${client.name} logo`,
                            surface: client.logo.surface,
                          });
                        }}
                        className={`company-logo-frame grid shrink-0 place-items-center overflow-hidden rounded-xl border border-[color:var(--app-border)] p-1.5 transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
                          client.logo.surface === "dark"
                            ? "bg-[#071a2e]"
                            : "bg-white"
                        }`}
                      >
                        <img
                          src={client.logo.src}
                          alt=""
                          width={client.logo.width}
                          height={client.logo.height}
                          className="company-logo block h-full w-full object-contain"
                          loading="lazy"
                        />
                      </button>
                      <span className="company-name min-w-0 font-semibold text-[var(--app-heading)]">
                        {client.name}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Print-only company and client name */}
            <p className="company hidden print:block text-sm font-bold uppercase tracking-wider text-[var(--app-accent)]">
              {item.company}
              {client && ` → ${client.name}`}
            </p>

            {/* Role & Employment Type */}
            <div className="role-heading flex flex-wrap items-center gap-2 sm:gap-3">
              <h3 className="text-xl font-semibold text-[var(--app-heading)] sm:text-2xl">
                {item.role}
              </h3>
              <span
                className="employment-type inline-flex items-center rounded-full border border-[color:var(--app-border)] bg-[color:var(--app-accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--app-heading)]"
                aria-label={`Employment type: ${employmentLabel}`}
              >
                {employmentLabel}
              </span>
            </div>

            {/* Location */}
            <p className="location mt-2 flex items-center gap-1.5 text-sm text-[var(--app-muted)]">
              <LocationIcon />
              <span>{item.location}</span>
            </p>
          </div>

          {/* Period */}
          <p className="period self-start rounded-full bg-[color:var(--app-accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--app-heading)] whitespace-nowrap">
            {item.period}
          </p>
        </div>

        {/* Divider */}
        <hr className="my-5 border-[color:var(--app-border)]" />

        {/* Highlights & Technologies */}
        <div className="experience-content">
          <ul className="highlights space-y-2.5 text-sm leading-relaxed text-[var(--app-muted)]">
            {item.highlights.map((highlight) => (
              <li
                key={highlight}
                className="relative pl-5 before:absolute before:left-0 before:top-2 before:h-1.5 before:w-1.5 before:rounded-full before:bg-[var(--app-accent)]"
              >
                {highlight}
              </li>
            ))}
          </ul>

          <div
            role="group"
            aria-label={`Technologies used at ${item.company}`}
            className="mt-5 flex flex-wrap gap-2"
          >
            {item.technologies.map((technology) => (
              <TechnologyChip
                key={technology}
                technology={technology}
                onSelectImage={onSelectImage}
              />
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}

export function ExperienceSection({
  experience,
  items,
  onSelectImage,
}: ExperienceSectionProps) {
  const experienceList = experience ?? items ?? resumeData.experience;

  return (
    <section
      id="experience"
      className="scroll-mt-24"
      data-resume-section
      aria-labelledby="experience-title"
    >
      <div className="section-heading mb-8">
        <p className="section-kicker text-sm font-semibold uppercase tracking-[0.22em] text-[var(--app-accent)]">
          Employment
        </p>
        <h2
          id="experience-title"
          className="mt-2 text-3xl font-semibold text-[var(--app-heading)] sm:text-4xl"
        >
          Experience timeline
        </h2>
        <p className="section-lead mt-3 max-w-2xl text-base text-[var(--app-muted)]">
          Five roles spanning full-stack delivery, banking systems, data
          platforms, integrations, and backend services.
        </p>
      </div>

      <ol className="timeline relative list-none p-0 space-y-6 sm:space-y-8">
        {experienceList.map((item, index) => (
          <li key={`${item.company}-${item.period}`} className="timeline-item">
            <div className="timeline-marker" aria-hidden="true">
              <span>{index + 1}</span>
            </div>

            <ExperienceCard item={item} onSelectImage={onSelectImage} />
          </li>
        ))}
      </ol>
    </section>
  );
}
