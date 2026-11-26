import Island from "@jetbrains/ring-ui-built/components/island/island";

export interface SummarySectionProps {
  summary: readonly string[];
}

export function SummarySection({ summary }: SummarySectionProps) {
  return (
    <section
      id="about"
      className="summary-section scroll-mt-24 py-16 sm:py-20"
      data-resume-section=""
      aria-labelledby="summary-title"
    >
      <div className="section-heading">
        <div>
          <p className="section-kicker">Professional summary</p>
          <h2
            id="summary-title"
            className="section-title section-title--balanced"
          >
            From interface to infrastructure
          </h2>
        </div>
        <p className="section-lead">
          Practical experience across front-end delivery, APIs, data operations,
          automation, and containerized systems.
        </p>
      </div>

      <ol className="summary-list mt-10 grid gap-4 md:grid-cols-2">
        {summary.map((item, index) => (
          <li key={item}>
            <div className="summary-card h-full">
              <Island>
                <div className="summary-card-content">
                  <span className="summary-number" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p>{item}</p>
                </div>
              </Island>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
