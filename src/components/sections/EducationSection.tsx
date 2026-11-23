import Panel from "@jetbrains/ring-ui-built/components/panel/panel";
import { resumeData, type ResumeEducation } from "../../resume-data";
import { LogoButton } from "../common/LogoButton";
import type { ZoomImage } from "../common/image-zoom";

export interface EducationSectionProps {
  education?: ResumeEducation;
  onSelectImage: (image: ZoomImage) => void;
}

export function EducationSection({
  education: propsEducation,
  onSelectImage,
}: EducationSectionProps) {
  const education = propsEducation ?? resumeData.education;
  const institutionLogoAlt = `${education.institution} logo`;

  return (
    <section
      id="education"
      data-resume-section
      aria-labelledby="education-title"
      className="scroll-mt-24 py-16 sm:py-20"
    >
      <div className="section-heading section-heading--split">
        <div>
          <p className="section-kicker">Academic background</p>
          <h2
            id="education-title"
            className="text-3xl font-semibold text-[var(--app-heading)] sm:text-4xl"
          >
            Education
          </h2>
        </div>
        <p className="section-lead">
          Computer engineering studies grounded in software development and
          completed with a senior project.
        </p>
      </div>

      <Panel className="education-card mt-10 rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex flex-wrap items-center gap-6">
            <LogoButton
              asset={education.institutionLogo}
              alt={institutionLogoAlt}
              onSelectImage={onSelectImage}
            />
            <div>
              <h3 className="text-2xl font-semibold text-[var(--app-heading)]">
                {education.degree}
              </h3>
              <p className="mt-2 text-lg font-medium text-[var(--app-heading)]">
                {education.institution}
              </p>
            </div>
          </div>
          <dl aria-label="Degree details" className="flex flex-wrap gap-6">
            <div>
              <dt className="text-sm text-[var(--app-muted)]">Study period</dt>
              <dd className="font-semibold text-[var(--app-heading)]">
                {education.period}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-[var(--app-muted)]">GPAX</dt>
              <dd className="font-semibold text-[var(--app-heading)]">
                {education.gpax}
              </dd>
            </div>
          </dl>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[color:var(--app-border)] pt-6">
          <div>
            <p className="font-semibold text-[var(--app-heading)]">
              Senior project: {education.seniorProject.name}
            </p>
            <p className="text-sm text-[var(--app-muted)]">
              Academic capstone project repository
            </p>
          </div>
          <a
            href={education.seniorProject.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`View source code for ${education.seniorProject.name} (opens in a new tab)`}
            className="rounded-xl border border-[color:var(--app-border)] px-4 py-2 font-semibold text-[var(--app-accent)] hover:underline"
          >
            View source code ↗
          </a>
        </div>
      </Panel>
    </section>
  );
}
