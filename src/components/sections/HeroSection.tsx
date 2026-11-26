import { useEffect, useRef, useState, type CSSProperties } from "react";
import Button from "@jetbrains/ring-ui-built/components/button/button";
import { ControlsHeight } from "@jetbrains/ring-ui-built/components/global/controls-height";
import { useBangkokClock } from "../../hooks/use-bangkok-clock";
import { type ResumeProfile } from "../../resume-data";
import {
  calculateHeroCodePosition,
  calculateStatusLuminance,
  getHeroCodeAngularFrequency,
  getStatusColor,
  pickHeroClockTransition,
  type HeroClockTransition,
} from "../../status";
import {
  arrowDownwardIcon,
  mailIcon,
  resizeIcon,
} from "../common/material-icons";

export interface HeroSectionProps {
  profile: ResumeProfile;
}

interface HeroMotion {
  unixStartSeconds: number;
  omega: number;
}

type HeroMotionProperties = Record<`--${string}`, string>;

const HERO_INTRODUCTION =
  "Building reliable APIs, data integrations, event-driven workflows, and responsive interfaces for financial and business systems.";
const ACTION_ICON_SIZE = 18;
const getInTouchIcon = resizeIcon(mailIcon, ACTION_ICON_SIZE);
const viewExperienceIcon = resizeIcon(arrowDownwardIcon, ACTION_ICON_SIZE);

function createHeroMotion(): HeroMotion {
  const now = new Date();
  return {
    unixStartSeconds: now.getTime() / 1000,
    omega: getHeroCodeAngularFrequency(now),
  };
}

function heroMotionProperties(
  motion: HeroMotion,
  elapsedSeconds: number,
): HeroMotionProperties {
  const { left, right } = calculateHeroCodePosition(
    motion.unixStartSeconds + elapsedSeconds,
    { omega: motion.omega },
  );

  return {
    "--status-dot-luminance": String(calculateStatusLuminance(elapsedSeconds)),
    "--hero-code-left-x": `${String(left.x)}%`,
    "--hero-code-left-y": `${String(left.y)}%`,
    "--hero-code-right-x": `${String(right.x)}%`,
    "--hero-code-right-y": `${String(right.y)}%`,
  };
}

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function startHeroAnimation(element: HTMLElement, motion: HeroMotion) {
  const startTimestamp = performance.now();
  let animationFrameId = 0;

  const animate = (currentTimestamp: number) => {
    const elapsedSeconds = (currentTimestamp - startTimestamp) / 1000;
    const properties = heroMotionProperties(motion, elapsedSeconds);
    for (const [name, value] of Object.entries(properties)) {
      element.style.setProperty(name, value);
    }
    animationFrameId = requestAnimationFrame(animate);
  };

  animationFrameId = requestAnimationFrame(animate);
  return () => {
    cancelAnimationFrame(animationFrameId);
  };
}

function useHeroMotion() {
  const sectionRef = useRef<HTMLElement>(null);
  const [motion] = useState(createHeroMotion);
  const [initialProperties] = useState(() => heroMotionProperties(motion, 0));

  useEffect(() => {
    const element = sectionRef.current;
    if (!element || prefersReducedMotion()) {
      return;
    }
    return startHeroAnimation(element, motion);
  }, [motion]);

  return { sectionRef, initialProperties };
}

function clockClassName(
  transition: HeroClockTransition,
  isTickAlternate: boolean,
): string {
  const tick = isTickAlternate ? "a" : "b";
  return `hero-clock hero-clock--${transition} hero-clock-tick-${tick}`;
}

function HeroActions({ email }: { email: string }) {
  return (
    <div className="hero-actions flex flex-wrap gap-3">
      <Button
        primary
        inline={false}
        height={ControlsHeight.L}
        href={`mailto:${email}`}
        icon={getInTouchIcon}
      >
        Get in touch
      </Button>
      <Button
        transparent
        inline={false}
        height={ControlsHeight.L}
        href="#experience"
        icon={viewExperienceIcon}
      >
        View experience
      </Button>
    </div>
  );
}

function HeroVisual() {
  return (
    <div className="hero-visual" aria-hidden="true">
      <div className="hero-orbit hero-orbit-outer" />
      <div className="hero-orbit hero-orbit-inner" />
      <div className="hero-monogram">NI</div>
      <span className="hero-code hero-code-left font-mono">&lt;/&gt;</span>
      <span className="hero-code hero-code-right font-mono">{"{ }"}</span>
    </div>
  );
}

export function HeroSection({ profile }: HeroSectionProps) {
  const { bangkokTime, availabilityStatus, isTickAlternate } =
    useBangkokClock();
  const [clockTransition] = useState(pickHeroClockTransition);
  const { sectionRef, initialProperties } = useHeroMotion();
  const style = {
    ...initialProperties,
    "--status-dot-color": getStatusColor(availabilityStatus),
  } as CSSProperties;

  return (
    <section
      ref={sectionRef}
      className="hero-section"
      aria-labelledby="hero-title"
      style={style}
    >
      <div className="hero-copy">
        <p className="hero-kicker">
          <span className="status-dot" aria-hidden="true" />
          <span className="hero-kicker-copy">
            {`${profile.title} · ${profile.details.location}`}
          </span>
        </p>
        <p className="hero-kicker">
          <span className="hero-kicker-copy">
            UTC+7 ·{" "}
            <time className={clockClassName(clockTransition, isTickAlternate)}>
              {bangkokTime}
            </time>
          </span>
        </p>

        <h1 id="hero-title" className="hero-title">
          {profile.name}
        </h1>
        <p className="hero-role">{profile.title}</p>
        <p className="hero-introduction">{HERO_INTRODUCTION}</p>

        <HeroActions email={profile.details.email} />
      </div>

      <HeroVisual />
    </section>
  );
}
