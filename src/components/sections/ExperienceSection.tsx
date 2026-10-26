import Panel from "@jetbrains/ring-ui-built/components/panel/panel";
import { resumeData, type ResumeExperience } from "../../resume-data";
import { LogoButton } from "../common/LogoButton";

export interface ExperienceSectionProps {
  onSelectImage: (image: { src: string; alt: string }) => void;
}

interface ExperienceCardProps {
  item: ResumeExperience;
  onSelectImage: (image: { src: string; alt: string }) => void;
}

function ExperienceCard({ item, onSelectImage }: ExperienceCardProps) {
  const client = item.client;
  const companyLogoAlt = `${item.company} logo`;

  return (
    <Panel className="print-break-inside-avoid rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_15rem]">
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[color:var(--app-accent-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--app-heading)]">
                {item.period}
              </span>
              {item.employmentTypes.map((employmentType) => (
                <span
                  key={employmentType}
                  className="rounded-full border border-[color:var(--app-border)] px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-[var(--app-muted)]"
                >
                  {employmentType}
                </span>
              ))}
            </div>
            <h3 className="text-2xl font-semibold text-[var(--app-heading)]">
              {item.role}
            </h3>
            <p className="text-lg font-medium text-[var(--app-heading)]">
              {item.company}
            </p>
            <p className="text-sm text-[var(--app-muted)]">{item.location}</p>
            {client && (
              <p className="text-sm text-[var(--app-muted)]">
                Client: {client.name}
              </p>
            )}
          </div>

          <ul className="space-y-3 text-sm leading-7 text-[var(--app-muted)]">
            {item.highlights.map((highlight) => (
              <li key={highlight} className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--app-accent)]" />
                <span>{highlight}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-2">
            {item.technologies.map((technology) => (
              <span
                key={technology}
                className="rounded-full border border-[color:var(--app-border)] bg-[var(--app-surface-raised)] px-3 py-1 text-xs font-medium text-[var(--app-heading)]"
              >
                {technology}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <LogoButton
            asset={item.companyLogo}
            alt={companyLogoAlt}
            onClick={() => {
              onSelectImage({
                src: item.companyLogo.src,
                alt: companyLogoAlt,
              });
            }}
          />
          {client && (
            <LogoButton
              asset={client.logo}
              alt={`${client.name} logo`}
              onClick={() => {
                onSelectImage({
                  src: client.logo.src,
                  alt: `${client.name} logo`,
                });
              }}
            />
          )}
        </div>
      </div>
    </Panel>
  );
}

export function ExperienceSection({ onSelectImage }: ExperienceSectionProps) {
  return (
    <section id="experience" className="scroll-mt-36">
      <div className="mb-4">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--app-accent)]">
          Employment
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-[var(--app-heading)]">
          Experience timeline
        </h2>
      </div>

      <div className="space-y-5">
        {resumeData.experience.map((item) => (
          <ExperienceCard
            key={`${item.company}-${item.period}`}
            item={item}
            onSelectImage={onSelectImage}
          />
        ))}
      </div>
    </section>
  );
}
