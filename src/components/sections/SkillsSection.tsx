import Tag from "@jetbrains/ring-ui-built/components/tag/tag";

export interface SkillsSectionProps {
  skills: readonly string[];
}

export function SkillsSection({ skills }: SkillsSectionProps) {
  return (
    <section
      id="skills"
      className="skills-section scroll-mt-24 py-16 sm:py-20"
      data-resume-section=""
      aria-labelledby="skills-title"
    >
      <div className="skills-panel">
        <div className="skills-panel-content">
          <div>
            <p className="section-kicker section-kicker-light">
              Technical toolkit
            </p>
            <h2 id="skills-title" className="section-title">
              Core skills
            </h2>
            <p className="skills-lead">
              Six technologies highlighted in the original résumé.
            </p>
          </div>

          <div
            className="chip-set"
            role="group"
            aria-label="Core technical skills"
          >
            {skills.map((skill) => (
              <Tag key={skill} readOnly interactive={false} outline>
                <span className="chip-label">{skill}</span>
              </Tag>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
