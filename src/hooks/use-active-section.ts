import { useEffect, useState } from "react";
import { resumeSections, type ResumeSectionId } from "../resume-data";

const SECTION_ACTIVATION_RATIO = 0.18;
const VIEWPORT_EVENT_THROTTLE_MS = 100;

interface SectionBounds {
  id: ResumeSectionId;
  top: number;
  bottom: number;
}

function getSectionFromHash(): ResumeSectionId | null {
  const sectionId = window.location.hash.slice(1);
  return resumeSections.find((section) => section.id === sectionId)?.id ?? null;
}

function getVisibleSections(viewportHeight: number): SectionBounds[] {
  const visibleSections: SectionBounds[] = [];

  for (const section of resumeSections) {
    const bounds = document.getElementById(section.id)?.getBoundingClientRect();

    if (bounds && bounds.bottom > 0 && bounds.top < viewportHeight) {
      visibleSections.push({
        id: section.id,
        top: bounds.top,
        bottom: bounds.bottom,
      });
    }
  }

  return visibleSections;
}

function findActiveSection(viewportHeight: number): ResumeSectionId | null {
  const activationLine = viewportHeight * SECTION_ACTIVATION_RATIO;
  const visibleSections = getVisibleSections(viewportHeight);
  const crossingSection = visibleSections.find(
    ({ top, bottom }) => top <= activationLine && bottom >= activationLine,
  );

  if (crossingSection) {
    return crossingSection.id;
  }

  const nearestSection = visibleSections
    .sort(
      (first, second) =>
        Math.abs(first.top - activationLine) -
        Math.abs(second.top - activationLine),
    )
    .at(0);

  return nearestSection?.id ?? null;
}

function createViewportThrottle(callback: () => void) {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return {
    schedule: () => {
      timer ??= setTimeout(() => {
        timer = null;
        callback();
      }, VIEWPORT_EVENT_THROTTLE_MS);
    },
    cancel: () => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}

export function useActiveSection(initialSection: ResumeSectionId = "about") {
  const [activeSection, setActiveSection] = useState<ResumeSectionId>(
    () => getSectionFromHash() ?? initialSection,
  );

  useEffect(() => {
    const selectSection = (section: ResumeSectionId | null) => {
      if (section) {
        setActiveSection(section);
      }
    };
    const handleHashChange = () => {
      selectSection(getSectionFromHash());
    };
    const viewportThrottle = createViewportThrottle(() => {
      selectSection(findActiveSection(window.innerHeight));
    });

    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("scroll", viewportThrottle.schedule, {
      passive: true,
    });
    window.addEventListener("resize", viewportThrottle.schedule);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("scroll", viewportThrottle.schedule);
      window.removeEventListener("resize", viewportThrottle.schedule);
      viewportThrottle.cancel();
    };
  }, []);

  return { activeSection };
}
