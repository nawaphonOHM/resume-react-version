import Panel from "@jetbrains/ring-ui-built/components/panel/panel";
import { resumeData } from "../../resume-data";

export function SummarySection() {
  return (
    <section id="summary" className="scroll-mt-36">
      <div className="mb-4">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--app-accent)]">
          Professional summary
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-[var(--app-heading)]">
          What I deliver
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {resumeData.summary.map((item, index) => (
          <Panel
            key={item}
            className="rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm"
          >
            <div className="flex items-start gap-4">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--app-accent-soft)] text-lg font-semibold text-[var(--app-heading)]">
                {index + 1}
              </span>
              <p className="text-base leading-7 text-[var(--app-muted)]">
                {item}
              </p>
            </div>
          </Panel>
        ))}
      </div>
    </section>
  );
}
