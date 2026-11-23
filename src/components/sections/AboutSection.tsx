import { useEffect, useMemo, useRef } from "react";
import Button from "@jetbrains/ring-ui-built/components/button/button";
import {
  resumeData,
  type ResumeLink,
  type ResumeProfile,
} from "../../resume-data";
import {
  calculateHeroCodePosition,
  calculateStatusLuminance,
  getAvailabilityLabel,
  getStatusColor,
  type AvailabilityStatus,
  type HeroCodeOrbitPositions,
} from "../../status";

export interface AboutSectionProps {
  availabilityStatus?: AvailabilityStatus;
  availabilityLabel?: string;
  bangkokTime?: string;
  downloadAvailable?: boolean | null;
  profile?: ResumeProfile;
  name?: string;
  title?: string;
  introduction?: string;
  email?: string;
  links?: readonly ResumeLink[] | ResumeLink[];
}

function getDownloadAvailabilityMessage(
  downloadAvailable: boolean | null | undefined,
): string | null {
  if (downloadAvailable === false) {
    return "The hosted résumé PDF may be unavailable. Downloading will ask for confirmation.";
  }
  if (downloadAvailable === null) {
    return "Checking hosted résumé PDF availability.";
  }
  if (downloadAvailable === true) {
    return "The hosted résumé PDF is available for direct download.";
  }
  return null;
}

function getMonogram(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return "NI";
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    const firstInitial = parts[0].charAt(0);
    const secondInitial = parts[1].charAt(0);
    return `${firstInitial}${secondInitial}`.toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase() || "NI";
}

function applyHeroStyleProperties(element: HTMLElement, elapsed: number): void {
  const lum = calculateStatusLuminance(elapsed);
  const pos = calculateHeroCodePosition(elapsed);
  element.style.setProperty("--status-dot-luminance", String(lum));
  element.style.setProperty("--hero-code-left-x", `${String(pos.left.x)}%`);
  element.style.setProperty("--hero-code-left-y", `${String(pos.left.y)}%`);
  element.style.setProperty("--hero-code-right-x", `${String(pos.right.x)}%`);
  element.style.setProperty("--hero-code-right-y", `${String(pos.right.y)}%`);
}

function shouldStartAnimation(): boolean {
  if (
    typeof window === "undefined" ||
    typeof requestAnimationFrame === "undefined"
  ) {
    return false;
  }
  if (typeof window.matchMedia === "function") {
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  return true;
}

function startHeroAnimation(element: HTMLElement): () => void {
  let animationFrameId: number;
  let startTime: number | null = null;

  const tick = (now: number) => {
    if (!document.hidden) {
      if (startTime === null) {
        startTime = now;
      }
      applyHeroStyleProperties(element, (now - startTime) / 1000);
    }
    animationFrameId = requestAnimationFrame(tick);
  };

  animationFrameId = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(animationFrameId);
  };
}

function useHeroAnimationRef(statusColor: string) {
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = sectionRef.current;
    if (!element) {
      return;
    }
    element.style.setProperty("--status-dot-color", statusColor);
    if (!shouldStartAnimation()) {
      return;
    }
    return startHeroAnimation(element);
  }, [statusColor]);

  return sectionRef;
}

interface HeroVisualProps {
  monogram: string;
}

function HeroVisual({ monogram }: HeroVisualProps) {
  return (
    <div className="hero-visual" aria-hidden="true">
      <div className="hero-orbit" />
      <div className="hero-orbit hero-orbit-inner" />
      <div className="hero-monogram">{monogram}</div>
      <div className="hero-code hero-code-left">&lt;/&gt;</div>
      <div className="hero-code hero-code-right">&#123;...&#125;</div>
    </div>
  );
}

interface HeroKickerProps {
  availabilityLabel: string;
  title: string;
  location: string;
  bangkokTime?: string;
}

function HeroKicker({
  availabilityLabel,
  title,
  location,
  bangkokTime,
}: HeroKickerProps) {
  return (
    <>
      <p className="hero-kicker">
        <span
          className="status-dot"
          role="img"
          aria-label={availabilityLabel}
        />
        <span className="hero-kicker-copy">
          {title} <span aria-hidden="true">·</span> {location}
        </span>
      </p>
      {bangkokTime && (
        <p className="hero-kicker hero-clock-kicker">
          <span className="hero-kicker-copy">
            UTC+7 <span aria-hidden="true">·</span>{" "}
            <time
              className="hero-clock font-medium text-sky-200"
              aria-label="Current time in Bangkok, Thailand (UTC+7)"
            >
              <span key={bangkokTime} className="hero-clock-tick">
                {bangkokTime}
              </span>
            </time>
          </span>
        </p>
      )}
    </>
  );
}

interface HeroActionsProps {
  email: string;
  githubLink?: ResumeLink;
}

function HeroActions({ email, githubLink }: HeroActionsProps) {
  return (
    <div className="hero-actions flex flex-wrap items-center gap-3 pt-2">
      <Button
        primary
        href={`mailto:${email}`}
        className="!rounded-xl !px-6 !py-3 !font-semibold !shadow-sm"
      >
        Get in touch
      </Button>
      <Button
        href="#experience"
        className="!rounded-xl !border-white/40 !bg-white/10 !px-6 !py-3 !font-semibold !text-white hover:!bg-white/20"
      >
        View experience
      </Button>
      {githubLink && (
        <Button
          href={githubLink.url}
          target="_blank"
          rel="noopener noreferrer"
          className="!rounded-xl !border-white/20 !bg-white/10 !px-5 !py-3 !text-white hover:!bg-white/20"
        >
          View GitHub
        </Button>
      )}
    </div>
  );
}

export function buildHeroStyles(
  statusColor: string,
  luminance: number,
  positions: HeroCodeOrbitPositions,
): React.CSSProperties {
  return {
    "--status-dot-color": statusColor,
    "--status-dot-luminance": String(luminance),
    "--hero-code-left-x": `${String(positions.left.x)}%`,
    "--hero-code-left-y": `${String(positions.left.y)}%`,
    "--hero-code-right-x": `${String(positions.right.x)}%`,
    "--hero-code-right-y": `${String(positions.right.y)}%`,
  } as React.CSSProperties;
}

interface ResolvedHeroData {
  name: string;
  title: string;
  location: string;
  introduction: string;
  email: string;
  githubLink?: ResumeLink;
  monogram: string;
}

function resolveIntroduction(
  intro?: string,
  profileSummary?: readonly string[],
): string {
  if (intro) {
    return intro;
  }
  if (profileSummary && profileSummary.length > 0) {
    return profileSummary[0];
  }
  return "Backend engineer with a full-stack delivery mindset. Building reliable APIs, integrations, reporting features, and developer workflows for banking, fintech, food-tech, and tax platforms.";
}

function resolveHeroData(props: AboutSectionProps): ResolvedHeroData {
  const profile = props.profile ?? resumeData;
  const name = props.name ?? profile.name;
  const title = props.title ?? profile.title;
  const email = props.email ?? profile.details.email;
  const links = props.links ?? profile.links;
  const intro = resolveIntroduction(props.introduction, profile.summary);

  return {
    name,
    title,
    location: profile.details.location,
    introduction: intro,
    email,
    githubLink: links.find((link) => link.label === "GitHub"),
    monogram: getMonogram(name),
  };
}

export function AboutSection(props: AboutSectionProps = {}) {
  const { availabilityStatus = "available", bangkokTime } = props;
  const heroData = resolveHeroData(props);
  const currentLabel =
    props.availabilityLabel ?? getAvailabilityLabel(availabilityStatus);
  const statusColor = getStatusColor(availabilityStatus);
  const downloadMessage = getDownloadAvailabilityMessage(
    props.downloadAvailable,
  );
  const sectionRef = useHeroAnimationRef(statusColor);
  const initialStyle = useMemo(
    () =>
      buildHeroStyles(
        statusColor,
        calculateStatusLuminance(0),
        calculateHeroCodePosition(0),
      ),
    [statusColor],
  );

  return (
    <section
      id="about"
      data-resume-section
      ref={sectionRef}
      className="hero-section scroll-mt-24"
      aria-labelledby="hero-title"
      style={initialStyle}
    >
      <div className="hero-copy z-10 max-w-2xl space-y-4">
        <HeroKicker
          availabilityLabel={currentLabel}
          title={heroData.title}
          location={heroData.location}
          bangkokTime={bangkokTime}
        />

        <h1
          id="hero-title"
          className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl"
        >
          {heroData.name}
        </h1>

        <p className="hero-role text-lg font-semibold text-sky-200 sm:text-xl">
          {heroData.title}
        </p>

        <p className="hero-introduction text-base leading-relaxed text-slate-200 sm:text-lg">
          {heroData.introduction}
        </p>

        <HeroActions email={heroData.email} githubLink={heroData.githubLink} />

        {downloadMessage && (
          <p className="text-xs text-sky-200/80 sm:text-sm">
            {downloadMessage}
          </p>
        )}
      </div>

      <HeroVisual monogram={heroData.monogram} />
    </section>
  );
}
