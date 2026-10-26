import Button from "@jetbrains/ring-ui-built/components/button/button";
import Panel from "@jetbrains/ring-ui-built/components/panel/panel";
import { resumeData } from "../../resume-data";
import {
  type AvailabilityStatus,
  getAvailabilityBadgeClass,
  getAvailabilityDotClass,
} from "../../status";

export interface AboutSectionProps {
  availabilityStatus: AvailabilityStatus;
  availabilityLabel: string;
  bangkokTime: string;
  bangkokHour: number;
  downloadAvailable: boolean | null;
}

function getDownloadAvailabilityMessage(
  downloadAvailable: boolean | null,
): string {
  if (downloadAvailable === false) {
    return "The hosted résumé PDF may be unavailable. Downloading will ask for confirmation.";
  }
  if (downloadAvailable === null) {
    return "Checking hosted résumé PDF availability.";
  }
  return "The hosted résumé PDF is available for direct download.";
}

export function AboutSection({
  availabilityStatus,
  availabilityLabel,
  bangkokTime,
  bangkokHour,
  downloadAvailable,
}: AboutSectionProps) {
  const githubLink = resumeData.links.find((link) => link.label === "GitHub");
  const formattedHour = String(bangkokHour).padStart(2, "0");
  const availabilityMessage = getDownloadAvailabilityMessage(downloadAvailable);

  return (
    <section id="about" className="scroll-mt-36">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(18rem,0.9fr)]">
        <Panel className="rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] p-8 shadow-sm">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${getAvailabilityBadgeClass(availabilityStatus)}`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${getAvailabilityDotClass(availabilityStatus)}`}
              />
              {availabilityLabel}
            </span>
            <span className="rounded-full border border-[color:var(--app-border)] px-3 py-1 text-sm text-[var(--app-muted)]">
              {bangkokTime}
            </span>
            <span className="rounded-full border border-[color:var(--app-border)] px-3 py-1 text-sm text-[var(--app-muted)]">
              {`UTC+7 · ${formattedHour}:00 hour block`}
            </span>
          </div>

          <div className="space-y-5">
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[var(--app-accent)]">
              Résumé portfolio
            </p>
            <div className="space-y-3">
              <h2 className="max-w-3xl text-4xl font-semibold leading-tight text-[var(--app-heading)] sm:text-5xl">
                Backend engineer with a full-stack delivery mindset.
              </h2>
              <p className="max-w-3xl text-lg leading-8 text-[var(--app-muted)]">
                Building reliable APIs, integrations, reporting features, and
                developer workflows for banking, fintech, food-tech, and tax
                platforms.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button primary href={`mailto:${resumeData.details.email}`}>
                Email me
              </Button>
              {githubLink && (
                <Button
                  href={githubLink.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View GitHub
                </Button>
              )}
            </div>
            <p className="text-sm text-[var(--app-muted)]">
              {availabilityMessage}
            </p>
          </div>
        </Panel>

        <Panel className="rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface-raised)] p-6 shadow-sm">
          <div className="space-y-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--app-muted)]">
                Highlights
              </p>
              <p className="mt-2 text-2xl font-semibold text-[var(--app-heading)]">
                Core strengths
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {resumeData.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full border border-[color:var(--app-border)] bg-[color:var(--app-accent-soft)] px-3 py-1 text-sm font-medium text-[var(--app-heading)]"
                >
                  {skill}
                </span>
              ))}
            </div>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface)] p-4">
                <dt className="text-sm text-[var(--app-muted)]">Location</dt>
                <dd className="mt-1 font-medium text-[var(--app-heading)]">
                  {resumeData.details.location}
                </dd>
              </div>
              <div className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface)] p-4">
                <dt className="text-sm text-[var(--app-muted)]">Contact</dt>
                <dd className="mt-1 font-medium text-[var(--app-heading)]">
                  {resumeData.details.email}
                </dd>
              </div>
            </dl>
          </div>
        </Panel>
      </div>
    </section>
  );
}
