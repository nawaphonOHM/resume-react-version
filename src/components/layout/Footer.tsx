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
    <footer className="border-t border-[color:var(--app-border)] bg-[var(--app-surface)] text-[0.88rem] text-[var(--app-muted)]">
      <div className="mx-auto flex w-full max-w-[75rem] flex-col gap-1 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <p>{identityLine}</p>
        <p>{location}</p>
      </div>
    </footer>
  );
}
