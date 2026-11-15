import { useEffect, useState } from "react";
import { resumeSections, type ResumeSectionId } from "../resume-data";

const OBSERVER_OPTIONS: IntersectionObserverInit = {
  threshold: [0.2, 0.35, 0.5, 0.7],
  rootMargin: "-20% 0px -55% 0px",
};

function findBestSection(
  entries: IntersectionObserverEntry[],
  ratios: Map<ResumeSectionId, number>,
  observedElements: Map<ResumeSectionId, HTMLElement>,
): ResumeSectionId | null {
  for (const entry of entries) {
    const sectionId = entry.target.id as ResumeSectionId;
    if (observedElements.get(sectionId) !== entry.target) {
      continue;
    }
    ratios.set(sectionId, entry.isIntersecting ? entry.intersectionRatio : 0);
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
    .filter((element): element is HTMLElement =>
      Boolean(element?.hasAttribute("data-resume-section")),
    );
}

function getSectionFromHash(): ResumeSectionId | null {
  const sectionId = window.location.hash.slice(1);
  return resumeSections.find((section) => section.id === sectionId)?.id ?? null;
}

function syncObservedSections(
  observer: IntersectionObserver,
  ratios: Map<ResumeSectionId, number>,
  observedElements: Map<ResumeSectionId, HTMLElement>,
): void {
  const currentElements = new Map(
    getSectionElements().map((element) => [
      element.id as ResumeSectionId,
      element,
    ]),
  );

  for (const [sectionId, element] of observedElements) {
    if (currentElements.get(sectionId) !== element) {
      observer.unobserve(element);
      observedElements.delete(sectionId);
      ratios.delete(sectionId);
    }
  }

  for (const [sectionId, element] of currentElements) {
    if (observedElements.get(sectionId) !== element) {
      observedElements.set(sectionId, element);
      observer.observe(element);
    }
  }
}

function observeSections(setActiveSection: (id: ResumeSectionId) => void) {
  const ratios = new Map<ResumeSectionId, number>();
  const observedElements = new Map<ResumeSectionId, HTMLElement>();
  const observer = new IntersectionObserver((entries) => {
    const bestSection = findBestSection(entries, ratios, observedElements);
    if (bestSection) {
      setActiveSection(bestSection);
    }
  }, OBSERVER_OPTIONS);
  const syncSections = () => {
    syncObservedSections(observer, ratios, observedElements);
  };
  syncSections();
  const mutationObserver =
    typeof MutationObserver === "undefined"
      ? null
      : new MutationObserver(syncSections);
  mutationObserver?.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  return () => {
    observer.disconnect();
    mutationObserver?.disconnect();
  };
}

export function useActiveSection(initialSection: ResumeSectionId = "about") {
  const [activeSection, setActiveSection] = useState<ResumeSectionId>(() =>
    typeof window === "undefined"
      ? initialSection
      : (getSectionFromHash() ?? initialSection),
  );

  useEffect(() => {
    const handleHashChange = () => {
      setActiveSection(getSectionFromHash() ?? initialSection);
    };
    window.addEventListener("hashchange", handleHashChange);

    if (typeof IntersectionObserver === "undefined") {
      return () => {
        window.removeEventListener("hashchange", handleHashChange);
      };
    }

    const stopObserving = observeSections(setActiveSection);

    return () => {
      stopObserving();
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [initialSection]);

  return { activeSection, setActiveSection };
}
