import Panel from "@jetbrains/ring-ui-built/components/panel/panel";
import { resumeData } from "../../resume-data";

export function SkillsSection() {
  return (
    <section id="skills" className="scroll-mt-36">
      <div className="mb-4">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--app-accent)]">
          Technical toolkit
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-[var(--app-heading)]">
          Skills
        </h2>
      </div>

      <Panel className="rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
        <div className="flex flex-wrap gap-3">
          {resumeData.skills.map((skill) => (
            <span
              key={skill}
              className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-raised)] px-4 py-2 text-sm font-medium text-[var(--app-heading)]"
            >
              {skill}
            </span>
          ))}
        </div>
      </Panel>
    </section>
  );
}
