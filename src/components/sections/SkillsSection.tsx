import Panel from "@jetbrains/ring-ui-built/components/panel/panel";
import { resumeData } from "../../resume-data";

export interface SkillsSectionProps {
  skills?: readonly string[] | string[];
}

export function SkillsSection({
  skills: propsSkills,
}: SkillsSectionProps = {}) {
  const skills = propsSkills ?? resumeData.skills;

  return (
    <section
      id="skills"
      data-resume-section
      aria-labelledby="skills-title"
      className="scroll-mt-24"
    >
      <Panel className="skills-panel overflow-hidden rounded-3xl border-0 bg-[#0b2847] p-0 text-white shadow-lg">
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-200 sm:text-sm">
              Technical toolkit
            </p>
            <h2
              id="skills-title"
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
