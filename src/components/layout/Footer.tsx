export interface FooterProps {
  name?: string;
  title?: string;
  location?: string;
}

export function Footer({
  name = "",
  title = "",
  location = "",
}: FooterProps = {}) {
  const identityLine = [name, title].filter(Boolean).join(" · ");

  return (
    <footer className="border-t border-[color:var(--app-border)] bg-[var(--app-surface)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-8 text-sm text-[var(--app-muted)] sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <p>{identityLine}</p>
        <p>{location}</p>
      </div>
    </footer>
  );
}
