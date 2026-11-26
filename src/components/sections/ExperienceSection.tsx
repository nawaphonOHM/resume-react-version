import Icon from "@jetbrains/ring-ui-built/components/icon/icon";
import Island from "@jetbrains/ring-ui-built/components/island/island";
import Tag from "@jetbrains/ring-ui-built/components/tag/tag";
import { resolveTechnologyIcon } from "../../data/technology-icons";
import { useImageZoom } from "../../hooks/use-image-zoom";
import { type ImageAsset, type ResumeExperience } from "../../resume-data";
import { TechnologyIcon } from "../common/TechnologyIcon";
import { locationOnIcon, resizeIcon } from "../common/material-icons";

export interface ExperienceSectionProps {
  experience: readonly ResumeExperience[];
}

interface CompanyIdentityProps {
  label: string;
  name: string;
  logo: ImageAsset;
  client?: boolean;
}

const LOCATION_ICON_SIZE = 18;
const locationGlyph = resizeIcon(locationOnIcon, LOCATION_ICON_SIZE);

function CompanyLogo({
  logo,
  name,
}: Pick<CompanyIdentityProps, "logo" | "name">) {
  const zoom = useImageZoom({ logo, label: name });

  return (
    <span
      className={`company-logo-frame company-logo-frame--${logo.surface} grid shrink-0 place-items-center overflow-hidden`}
    >
      <img
        {...zoom}
        className="company-logo block h-full w-full object-contain"
        src={logo.src}
        width={logo.width}
        height={logo.height}
        loading="lazy"
        alt=""
      />
    </span>
  );
}

function CompanyIdentity({
  label,
  name,
  logo,
  client = false,
}: CompanyIdentityProps) {
  return (
    <div
      className={`company-identity${client ? " company-identity--client" : ""} min-w-0 max-w-full max-sm:w-full`}
    >
      <span className="company-label mb-1 block leading-tight">{label}</span>
      <div className="company-identity-content flex min-w-0 max-w-full items-center gap-3">
        <CompanyLogo logo={logo} name={name} />
        <span className="company-name min-w-0">{name}</span>
      </div>
    </div>
  );
}

function CompanyIdentities({ job }: { job: ResumeExperience }) {
  const { client } = job;

  return (
    <div className="company-identities mb-[0.85rem] flex flex-wrap items-start gap-x-5 gap-y-3 max-sm:flex-col max-sm:flex-nowrap">
      <CompanyIdentity
        label={client ? "Employer" : "Company"}
        name={job.company}
        logo={job.companyLogo}
      />
      {client && (
        <div className="company-client-relationship flex min-w-0 max-w-full items-start gap-5 max-sm:w-full max-sm:flex-col max-sm:gap-2">
          <span
            className="company-relationship-arrow mt-[1.15rem] grid h-12 w-5 shrink-0 place-items-center text-xl leading-none font-extrabold text-accent max-sm:mt-0 max-sm:h-6 max-sm:w-21 max-sm:rotate-90"
            aria-hidden="true"
          >
            →
          </span>
          <CompanyIdentity
            label="Client"
            name={client.name}
            logo={client.logo}
            client
          />
        </div>
      )}
    </div>
  );
}

function ExperienceHeader({ job }: { job: ResumeExperience }) {
  const employmentLabel = job.employmentTypes.join(" → ");

  return (
    <div className="experience-header">
      <div className="min-w-0 flex-1">
        <CompanyIdentities job={job} />
        <p className="company">{job.company}</p>
        <div className="role-heading">
          <h3 className="experience-role">{job.role}</h3>
          <span
            className="employment-type"
            aria-label={`Employment type: ${employmentLabel}`}
          >
            {employmentLabel}
          </span>
        </div>
        <p className="location">
          <span className="location-icon" aria-hidden="true">
            <Icon glyph={locationGlyph} />
          </span>
          {job.location}
        </p>
      </div>
      <p className="period">{job.period}</p>
    </div>
  );
}

function TechnologyChip({ technology }: { technology: string }) {
  return (
    <Tag readOnly interactive={false} outline>
      <span className="technology-chip-content chip-label inline-flex max-w-full items-center gap-[0.4rem] align-middle">
        <TechnologyIcon
          icon={resolveTechnologyIcon(technology)}
          label={technology}
        />
        <span className="technology-label min-w-0">{technology}</span>
      </span>
    </Tag>
  );
}

function ExperienceCard({ job }: { job: ResumeExperience }) {
  return (
    <div className="experience-card">
      <Island>
        <ExperienceHeader job={job} />

        <hr className="card-divider" />

        <div className="experience-content">
          <ul className="highlights">
            {job.highlights.map((highlight) => (
              <li key={highlight}>{highlight}</li>
            ))}
          </ul>

          <div
            className="chip-set"
            role="group"
            aria-label={`Technologies used at ${job.company}`}
          >
            {job.technologies.map((technology) => (
              <TechnologyChip key={technology} technology={technology} />
            ))}
          </div>
        </div>
      </Island>
    </div>
  );
}

export function ExperienceSection({ experience }: ExperienceSectionProps) {
  return (
    <section
      id="experience"
      className="experience-section scroll-mt-24 py-16 sm:py-20"
      data-resume-section=""
      aria-labelledby="experience-title"
    >
      <div className="section-heading">
        <div>
          <p className="section-kicker">Employment</p>
          <h2 id="experience-title" className="section-title">
            Experience timeline
          </h2>
        </div>
        <p className="section-lead">
          Five roles spanning full-stack delivery, banking systems, data
          platforms, integrations, and backend services.
        </p>
      </div>

      <ol className="timeline mt-12">
        {experience.map((job, index) => (
          <li key={`${job.company}-${job.period}`} className="timeline-item">
            <div className="timeline-marker" aria-hidden="true">
              <span>{index + 1}</span>
            </div>

            <ExperienceCard job={job} />
          </li>
        ))}
      </ol>
    </section>
  );
}
