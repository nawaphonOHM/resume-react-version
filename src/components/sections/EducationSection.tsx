import Button from "@jetbrains/ring-ui-built/components/button/button";
import { ControlsHeight } from "@jetbrains/ring-ui-built/components/global/controls-height";
import Icon from "@jetbrains/ring-ui-built/components/icon/icon";
import Island from "@jetbrains/ring-ui-built/components/island/island";
import { useImageZoom } from "../../hooks/use-image-zoom";
import { type ImageAsset, type ResumeEducation } from "../../resume-data";
import {
  openInNewIcon,
  resizeIcon,
  schoolIcon,
} from "../common/material-icons";

export interface EducationSectionProps {
  education: ResumeEducation;
}

interface InstitutionLogoProps {
  logo: ImageAsset;
  institution: string;
}

const SCHOOL_ICON_SIZE = 26;
const LINK_ICON_SIZE = 18;
const schoolGlyph = resizeIcon(schoolIcon, SCHOOL_ICON_SIZE);
const openInNewGlyph = resizeIcon(openInNewIcon, LINK_ICON_SIZE);

function InstitutionLogo({ logo, institution }: InstitutionLogoProps) {
  const zoom = useImageZoom({ logo, label: institution });

  return (
    <span
      className={`institution-logo-frame institution-logo-frame--${logo.surface} grid h-14 w-32 shrink-0 place-items-center overflow-hidden rounded-2xl border border-solid border-outline p-2 max-[30rem]:h-12 max-[30rem]:w-26`}
      aria-hidden="true"
    >
      <img
        {...zoom}
        className="institution-logo block h-full w-full object-contain"
        src={logo.src}
        width={logo.width}
        height={logo.height}
        loading="lazy"
        alt=""
      />
    </span>
  );
}

function EducationOverview({ education }: EducationSectionProps) {
  return (
    <div className="education-overview">
      <div className="institution-identity flex min-w-0 items-center gap-[clamp(1rem,3vw,1.5rem)] max-[30rem]:flex-col max-[30rem]:items-start">
        <InstitutionLogo
          logo={education.institutionLogo}
          institution={education.institution}
        />

        <span
          className="education-icon education-icon--print"
          aria-hidden="true"
        >
          <Icon glyph={schoolGlyph} />
        </span>

        <div className="degree-copy">
          <h3 className="degree-title">{education.degree}</h3>
          <p className="institution">{education.institution}</p>
        </div>
      </div>

      <dl className="education-metadata" aria-label="Degree details">
        <div>
          <dt>Study period</dt>
          <dd>{education.period}</dd>
        </div>
        <div>
          <dt>GPAX</dt>
          <dd>{education.gpax}</dd>
        </div>
      </dl>
    </div>
  );
}

function SeniorProject({ education }: EducationSectionProps) {
  const { name, url } = education.seniorProject;

  return (
    <div className="senior-project">
      <div>
        <p className="project-title">
          <span>Senior project:</span> {name}
        </p>
        <p className="project-description">
          Academic capstone project repository
        </p>
      </div>

      <span className="project-link">
        <Button
          transparent
          inline={false}
          height={ControlsHeight.L}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`View source code for ${name} (opens in a new tab)`}
          icon={openInNewGlyph}
        >
          View source code
        </Button>
      </span>
    </div>
  );
}

export function EducationSection({ education }: EducationSectionProps) {
  return (
    <section
      id="education"
      className="education-section scroll-mt-24 py-16 sm:py-20"
      data-resume-section=""
      aria-labelledby="education-title"
    >
      <div className="section-heading">
        <div>
          <p className="section-kicker">Academic background</p>
          <h2 id="education-title" className="section-title">
            Education
          </h2>
        </div>
        <p className="section-lead">
          Computer engineering studies grounded in software development and
          completed with a senior project.
        </p>
      </div>

      <div className="education-card mt-10">
        <Island>
          <div className="education-card-content">
            <EducationOverview education={education} />

            <hr className="card-divider" />

            <SeniorProject education={education} />
          </div>
        </Island>
      </div>
    </section>
  );
}
