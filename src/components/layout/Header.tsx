import Button from "@jetbrains/ring-ui-built/components/button/button";
import type { Theme } from "../../hooks/use-theme";
import {
  resumeData,
  resumeSections,
  type ResumeSectionId,
} from "../../resume-data";

export interface HeaderProps {
  activeSection: ResumeSectionId;
  theme: Theme;
  onToggleTheme: () => void;
  downloadPending: boolean;
  downloadControlLabel: string;
  downloadControlText: string;
  onDownloadRequest: () => void;
}

function getSectionLinkClass(isActive: boolean): string {
  if (isActive) {
    return "border-[color:var(--app-accent)] bg-[color:var(--app-accent-soft)] text-[var(--app-heading)]";
  }
  return "border-[color:var(--app-border)] bg-transparent text-[var(--app-muted)] hover:border-[color:var(--app-accent)] hover:text-[var(--app-heading)]";
}

export function Header({
  activeSection,
  theme,
  onToggleTheme,
  downloadPending,
  downloadControlLabel,
  downloadControlText,
  onDownloadRequest,
}: HeaderProps) {
  const themeToggleLabel = `Theme toggle, dark mode is ${theme === "dark" ? "on" : "off"}`;

  return (
    <header className="sticky top-0 z-20 border-b border-[color:var(--app-border)] bg-[color:var(--app-surface)]/90 backdrop-blur no-print">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--app-muted)]">
              React version
            </p>
            <h1 className="text-2xl font-semibold text-[var(--app-heading)]">
              {resumeData.name}
            </h1>
            <p className="text-sm text-[var(--app-muted)]">
              {resumeData.title}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              primary
              disabled={downloadPending}
              aria-busy={downloadPending}
              aria-label={downloadControlLabel}
              title={downloadControlLabel}
              onClick={() => {
                onDownloadRequest();
              }}
            >
              {downloadControlText}
            </Button>
            <Button
              onClick={() => {
                window.print();
              }}
            >
              Print
            </Button>
            <Button
              ghost
              aria-label={themeToggleLabel}
              aria-pressed={theme === "dark"}
              onClick={() => {
                onToggleTheme();
              }}
            >
              {theme === "light" ? "Dark mode" : "Light mode"}
            </Button>
          </div>
        </div>

        <nav aria-label="Section navigation" className="overflow-x-auto">
          <ul className="flex min-w-max items-center gap-2">
            {resumeSections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className={`inline-flex rounded-full border px-4 py-2 text-sm font-medium transition ${getSectionLinkClass(activeSection === section.id)}`}
                >
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
