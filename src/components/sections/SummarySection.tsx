import Panel from "@jetbrains/ring-ui-built/components/panel/panel";
import { resumeData } from "../../resume-data";

export interface SummarySectionProps {
  summary?: readonly string[] | string[];
  items?: readonly string[] | string[];
  print?: boolean;
}

export function SummarySection({
  summary,
  items,
  print = false,
}: SummarySectionProps = {}) {
  const summaryList = summary ?? items ?? resumeData.summary;
  const sectionId = print ? "print-summary" : "summary";

  return (
    <section
      id={sectionId}
      data-resume-section={print ? undefined : ""}
      className="scroll-mt-24 py-16 sm:py-20"
      aria-labelledby={`${sectionId}-title`}
    >
      <div className="section-heading section-heading--split grid gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)] md:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--app-accent)] sm:text-sm">
            Professional summary
          </p>
          <h2
            id={`${sectionId}-title`}
            className="mt-2 text-3xl font-bold tracking-tight text-[var(--app-heading)] sm:text-4xl lg:text-5xl"
          >
            From interface to infrastructure
          </h2>
        </div>
        <p className="text-base leading-relaxed text-[var(--app-muted)] sm:text-lg">
          Practical experience across front-end delivery, APIs, data operations,
          automation, and containerized systems.
        </p>
      </div>

      <ol className="mt-8 grid list-none gap-4 p-0 md:grid-cols-2">
        {summaryList.map((item, index) => (
          <li key={item} className="print-break-inside-avoid">
            <Panel className="summary-card flex h-full items-start gap-4 rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm transition hover:border-[color:var(--app-accent)] hover:shadow-md">
              <span
                className="summary-number inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--app-accent-soft)] text-sm font-bold tracking-wider text-[var(--app-accent)]"
                aria-hidden="true"
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <p className="m-0 text-base leading-relaxed text-[var(--app-text)]">
                {item}
              </p>
            </Panel>
          </li>
        ))}
      </ol>
    </section>
  );
}
