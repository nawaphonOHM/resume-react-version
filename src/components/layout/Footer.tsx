export interface FooterProps {
  name: string;
  title: string;
  location: string;
}

export function Footer({ name, title, location }: FooterProps) {
  return (
    <footer className="resume-footer border-t border-outline bg-surface text-[0.88rem] text-muted">
      <div className="mx-auto flex w-full max-w-resume flex-col gap-1 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <p className="m-0">
          {name} · {title}
        </p>
        <p className="m-0">{location}</p>
      </div>
    </footer>
  );
}
