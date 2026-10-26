import { resumeData } from "../../resume-data";

export function Footer() {
  return (
    <footer className="border-t border-[color:var(--app-border)] bg-[var(--app-surface)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-8 text-sm text-[var(--app-muted)] sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <p>
          {resumeData.name} · {resumeData.title}
        </p>
        <p>{resumeData.details.location}</p>
      </div>
    </footer>
  );
}
