import { useEffect, useState } from "react";
import { resumeSections, type ResumeSectionId } from "../resume-data";

const OBSERVER_OPTIONS: IntersectionObserverInit = {
  threshold: [0.2, 0.35, 0.5, 0.7],
  rootMargin: "-20% 0px -55% 0px",
};

function findBestSection(
  entries: IntersectionObserverEntry[],
  ratios: Map<ResumeSectionId, number>,
): ResumeSectionId | null {
  for (const entry of entries) {
    ratios.set(
      entry.target.id as ResumeSectionId,
      entry.isIntersecting ? entry.intersectionRatio : 0,
    );
  }

  const nextSection = resumeSections.reduce<{
    id: ResumeSectionId;
    ratio: number;
  }>(
    (best, section) => {
      const ratio = ratios.get(section.id) ?? 0;
      return ratio > best.ratio ? { id: section.id, ratio } : best;
    },
    { id: "about", ratio: 0 },
  );

  return nextSection.ratio > 0 ? nextSection.id : null;
}

function getSectionElements(): HTMLElement[] {
  return resumeSections
    .map((section) => document.getElementById(section.id))
    .filter((element): element is HTMLElement => Boolean(element));
}

export function useActiveSection(initialSection: ResumeSectionId = "about") {
  const [activeSection, setActiveSection] =
    useState<ResumeSectionId>(initialSection);

  useEffect(() => {
    const ratios = new Map<ResumeSectionId, number>();
    const observer = new IntersectionObserver((entries) => {
      const bestSection = findBestSection(entries, ratios);
      if (bestSection) {
        setActiveSection(bestSection);
      }
    }, OBSERVER_OPTIONS);

    const sectionElements = getSectionElements();
    sectionElements.forEach((element) => {
      observer.observe(element);
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return { activeSection, setActiveSection };
}
