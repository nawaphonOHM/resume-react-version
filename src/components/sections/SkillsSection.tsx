import Panel from "@jetbrains/ring-ui-built/components/panel/panel";
import { resumeData } from "../../resume-data";

export interface SkillsSectionProps {
  skills?: readonly string[] | string[];
  print?: boolean;
}

export function SkillsSection({
  skills: propsSkills,
  print = false,
}: SkillsSectionProps = {}) {
  const skills = propsSkills ?? resumeData.skills;
  const sectionId = print ? "print-skills" : "skills";

  return (
    <section
      id={sectionId}
      data-resume-section={print ? undefined : ""}
      aria-labelledby={`${sectionId}-title`}
      className="scroll-mt-24 py-16 sm:py-20"
    >
      <Panel className="skills-panel overflow-hidden rounded-3xl border-0 bg-[#0b2847] p-0 text-white shadow-lg">
        <div className="skills-panel-content grid gap-6 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-200 sm:text-sm">
              Technical toolkit
            </p>
            <h2
              id={`${sectionId}-title`}
              className="mt-2 text-3xl font-bold tracking-tight text-white"
            >
              Core skills
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-200">
              {skills.length}{" "}
              {skills.length === 1 ? "technology" : "technologies"} highlighted
              in the résumé.
            </p>
          </div>
          <ul
            aria-label="Core technical skills"
            className="m-0 flex list-none flex-wrap gap-2 p-0"
          >
            {skills.map((skill) => (
              <li
                key={skill}
                className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-medium text-white"
              >
                {skill}
              </li>
            ))}
          </ul>
        </div>
      </Panel>
    </section>
  );
}
