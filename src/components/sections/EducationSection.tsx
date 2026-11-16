import Panel from "@jetbrains/ring-ui-built/components/panel/panel";
import { resumeData, type ResumeEducation } from "../../resume-data";
import { LogoButton } from "../common/LogoButton";
import type { ZoomImage } from "../dialogs/ImageZoomDialog";

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
      className="scroll-mt-24"
    >
      <div className="mb-4">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--app-accent)]">
          Academic background
        </p>
        <h2
          id="education-title"
          className="mt-2 text-3xl font-semibold text-[var(--app-heading)]"
        >
          Education
        </h2>
      </div>

      <Panel className="rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="space-y-4">
            <div>
              <h3 className="text-2xl font-semibold text-[var(--app-heading)]">
                {education.degree}
              </h3>
              <p className="mt-2 text-lg font-medium text-[var(--app-heading)]">
                {education.institution}
              </p>
              <p className="text-sm text-[var(--app-muted)]">
                {education.period}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-raised)] p-4">
                <p className="text-sm text-[var(--app-muted)]">GPAX</p>
                <p className="mt-1 text-xl font-semibold text-[var(--app-heading)]">
                  {education.gpax}
                </p>
              </div>
              <div className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-raised)] p-4">
                <p className="text-sm text-[var(--app-muted)]">
                  Senior project
                </p>
                <a
                  href={education.seniorProject.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex text-xl font-semibold text-[var(--app-accent)] hover:underline"
                >
                  {education.seniorProject.name}
                </a>
              </div>
            </div>
          </div>

          <LogoButton
            asset={education.institutionLogo}
            alt={institutionLogoAlt}
            onClick={() => {
              onSelectImage({
                src: education.institutionLogo.src,
                alt: institutionLogoAlt,
                surface: education.institutionLogo.surface,
              });
            }}
          />
        </div>
      </Panel>
    </section>
  );
}
