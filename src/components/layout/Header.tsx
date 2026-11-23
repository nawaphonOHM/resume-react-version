import { useRef, useState } from "react";
import Button from "@jetbrains/ring-ui-built/components/button/button";
import type { Theme } from "../../hooks/use-theme";
import { resumeSections, type ResumeSectionId } from "../../resume-data";

export interface HeaderProps {
  name?: string;
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
    return "border-transparent bg-[color:var(--app-accent-soft)] text-[var(--app-accent)]";
  }
  return "border-transparent bg-transparent text-[var(--app-muted)] hover:bg-[color:var(--app-surface-raised)] hover:text-[var(--app-heading)]";
}

function getMonogram(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
  }
  return parts[0]?.slice(0, 2).toUpperCase() || "NI";
}

interface SectionNavigationProps {
  activeSection: ResumeSectionId;
  ariaLabel: string;
  variant: "desktop" | "mobile";
  onSectionSelect?: () => void;
}

function SectionNavigation({
  activeSection,
  ariaLabel,
  variant,
  onSectionSelect,
}: SectionNavigationProps) {
  const isMobile = variant === "mobile";

  return (
    <nav aria-label={ariaLabel}>
      <ul
        className={
          isMobile
            ? "grid grid-cols-2 gap-2"
            : "flex min-w-max items-center gap-1"
        }
      >
        {resumeSections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              aria-current={
                activeSection === section.id ? "location" : undefined
              }
              className={`${isMobile ? "flex min-h-11 items-center" : "inline-flex"} rounded-lg border px-3 py-2 text-sm font-medium ${getSectionLinkClass(activeSection === section.id)}`}
              onClick={onSectionSelect}
            >
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function ThemeToggle({
  theme,
  onToggleTheme,
}: Pick<HeaderProps, "theme" | "onToggleTheme">) {
  const actionLabel =
    theme === "dark" ? "Switch to light theme" : "Switch to dark theme";

  return (
    <Button
      ghost
      aria-label={actionLabel}
      aria-pressed={theme === "dark"}
      onClick={onToggleTheme}
    >
      {theme === "light" ? (
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M20.5 15.4A8.5 8.5 0 0 1 8.6 3.5a8.6 8.6 0 1 0 11.9 11.9Z" />
        </svg>
      ) : (
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
        </svg>
      )}
    </Button>
  );
}

export function Header({
  name = "",
  activeSection,
  theme,
  onToggleTheme,
  downloadPending,
  downloadControlLabel,
  downloadControlText,
  onDownloadRequest,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);

  function handleHeaderKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape" && mobileMenuOpen) {
      setMobileMenuOpen(false);
      mobileMenuButtonRef.current?.focus();
    }
  }

  return (
    <>
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-50 -translate-y-20 rounded-lg bg-[var(--app-accent)] px-4 py-2 font-semibold text-white shadow-lg transition-transform focus:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-heading)]"
      >
        Skip to main content
      </a>

      <header
        onKeyDown={handleHeaderKeyDown}
        className="sticky top-0 z-50 border-b border-[color:var(--app-border)] bg-[color:var(--app-surface)]/90 backdrop-blur no-print"
      >
        <div className="mx-auto max-w-[78rem] px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-h-11 items-center gap-3 sm:gap-4">
            <a
              href="#about"
              aria-label="Go to About section"
              className="grid size-11 shrink-0 place-items-center rounded-xl border border-[color:var(--app-border)] bg-[var(--app-heading)] text-sm font-extrabold tracking-[0.12em] text-[var(--app-surface)] shadow-sm"
            >
              {getMonogram(name)}
            </a>

            <div className="hidden min-w-0 flex-1 overflow-x-auto md:block">
              <SectionNavigation
                activeSection={activeSection}
                ariaLabel="Portfolio sections"
                variant="desktop"
              />
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <div className="hidden items-center gap-2 md:flex">
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
              </div>

              <ThemeToggle theme={theme} onToggleTheme={onToggleTheme} />

              <button
                ref={mobileMenuButtonRef}
                type="button"
                aria-label={
                  mobileMenuOpen ? "Close section menu" : "Open section menu"
                }
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-section-menu"
                className="inline-flex size-10 items-center justify-center rounded-lg border border-[color:var(--app-border)] bg-[var(--app-surface)] text-lg font-semibold text-[var(--app-heading)] hover:bg-[var(--app-surface-raised)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-accent)] md:hidden"
                onClick={() => {
                  setMobileMenuOpen((isOpen) => !isOpen);
                }}
              >
                <span aria-hidden="true">{mobileMenuOpen ? "×" : "☰"}</span>
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div
            id="mobile-section-menu"
            className="border-t border-[color:var(--app-border)] bg-[var(--app-surface)] md:hidden"
          >
            <div className="mx-auto max-w-7xl space-y-4 px-4 py-4 sm:px-6 lg:px-8">
              <SectionNavigation
                activeSection={activeSection}
                ariaLabel="Mobile section navigation"
                variant="mobile"
                onSectionSelect={() => {
                  setMobileMenuOpen(false);
                }}
              />

              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label="Résumé actions"
              >
                <Button
                  primary
                  disabled={downloadPending}
                  aria-busy={downloadPending}
                  aria-label={downloadControlLabel}
                  onClick={() => {
                    onDownloadRequest();
                    setMobileMenuOpen(false);
                  }}
                >
                  {downloadControlText}
                </Button>
                <Button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    window.print();
                  }}
                >
                  Print
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
