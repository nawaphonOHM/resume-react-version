import { lazy } from "react";
import type { ResumeProfile } from "../../resume-data";
import { HeroSection } from "../sections/HeroSection";
import { DeferredSection, type DeferredPlaceholder } from "./DeferredSection";

const SummarySection = lazy(async () => {
  const module = await import("../sections/SummarySection");
  return { default: module.SummarySection };
});

const ExperienceSection = lazy(async () => {
  const module = await import("../sections/ExperienceSection");
  return { default: module.ExperienceSection };
});

const EducationSection = lazy(async () => {
  const module = await import("../sections/EducationSection");
  return { default: module.EducationSection };
});

const SkillsSection = lazy(async () => {
  const module = await import("../sections/SkillsSection");
  return { default: module.SkillsSection };
});

const ProfileSection = lazy(async () => {
  const module = await import("../sections/ProfileSection");
  return { default: module.ProfileSection };
});

const SUMMARY_PLACEHOLDERS: readonly DeferredPlaceholder[] = [
  {
    id: "about",
    kicker: "Professional summary",
    loadingTitle: "Loading professional summary",
    loadingText:
      "The summary will appear when this section enters the viewport.",
    errorTitle: "Professional summary unavailable",
  },
];

const EXPERIENCE_PLACEHOLDERS: readonly DeferredPlaceholder[] = [
  {
    id: "experience",
    kicker: "Employment",
    loadingTitle: "Loading experience timeline",
    loadingText:
      "The employment history will appear when this section enters the viewport.",
    errorTitle: "Experience timeline unavailable",
  },
];

const EDUCATION_PROFILE_PLACEHOLDERS: readonly DeferredPlaceholder[] = [
  {
    id: "education",
    kicker: "Academic background",
    loadingTitle: "Loading education",
    loadingText:
      "Education details will appear when this group enters the viewport.",
    errorTitle: "Education unavailable",
  },
  {
    id: "skills",
    kicker: "Technical toolkit",
    loadingTitle: "Loading core skills",
    loadingText:
      "Technical skills will appear when this group enters the viewport.",
    errorTitle: "Core skills unavailable",
  },
  {
    id: "profile",
    kicker: "Public details",
    loadingTitle: "Loading profile and links",
    loadingText:
      "Public profile details will appear when this group enters the viewport.",
    errorTitle: "Profile and links unavailable",
  },
];

export interface ResumeContentProps {
  profile: ResumeProfile;
  renderAll: boolean;
}

export function ResumeContent({ profile, renderAll }: ResumeContentProps) {
  return (
    <>
      <HeroSection profile={profile} />

      <DeferredSection
        placeholders={SUMMARY_PLACEHOLDERS}
        renderAll={renderAll}
      >
        <SummarySection summary={profile.summary} />
      </DeferredSection>

      <DeferredSection
        placeholders={EXPERIENCE_PLACEHOLDERS}
        renderAll={renderAll}
      >
        <ExperienceSection experience={profile.experience} />
      </DeferredSection>

      <DeferredSection
        placeholders={EDUCATION_PROFILE_PLACEHOLDERS}
        groupLabel="education, skills, and profile sections"
        renderAll={renderAll}
      >
        <EducationSection education={profile.education} />

        <aside aria-label="Skills and public profile">
          <SkillsSection skills={profile.skills} />

          <ProfileSection details={profile.details} links={profile.links} />
        </aside>
      </DeferredSection>
    </>
  );
}
