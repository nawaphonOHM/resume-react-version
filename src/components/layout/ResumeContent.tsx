import { useLayoutEffect, useState } from "react";
import { flushSync } from "react-dom";
import type { ZoomImage } from "../dialogs/ImageZoomDialog";
import { AboutSection, type AboutSectionProps } from "../sections/AboutSection";
import { EducationSection } from "../sections/EducationSection";
import { ExperienceSection } from "../sections/ExperienceSection";
import { ProfileSection } from "../sections/ProfileSection";
import { SkillsSection } from "../sections/SkillsSection";
import { SummarySection } from "../sections/SummarySection";
import { DeferredSection } from "./DeferredSection";
import type {
  ResumeDetails,
  ResumeEducation,
  ResumeExperience,
  ResumeLink,
  ResumeProfile,
  ResumeSectionId,
} from "../../resume-data";

const LOWER_SECTION_ANCHORS: readonly ResumeSectionId[] = ["skills", "profile"];

export interface ResumeContentProps extends AboutSectionProps {
  profile?: ResumeProfile;
  summary?: readonly string[] | string[];
  experience?: readonly ResumeExperience[] | ResumeExperience[];
  education?: ResumeEducation;
  skills?: readonly string[] | string[];
  details?: ResumeDetails;
  links?: readonly ResumeLink[] | ResumeLink[];
  onSelectImage: (image: ZoomImage) => void;
}

interface UpperSections {
  summary?: readonly string[] | string[];
  experience?: readonly ResumeExperience[] | ResumeExperience[];
}

interface LowerSections {
  education?: ResumeEducation;
  skills?: readonly string[] | string[];
  details?: ResumeDetails;
  links?: readonly ResumeLink[] | ResumeLink[];
}

function resolveUpperSections(props: ResumeContentProps): UpperSections {
  const profile = props.profile;
  if (!profile) {
    return {
      summary: props.summary,
      experience: props.experience,
    };
  }
  return {
    summary: props.summary ?? profile.summary,
    experience: props.experience ?? profile.experience,
  };
}

function resolveLowerSections(props: ResumeContentProps): LowerSections {
  const profile = props.profile;
  if (!profile) {
    return {
      education: props.education,
      skills: props.skills,
      details: props.details,
      links: props.links,
    };
  }
  return {
    education: props.education ?? profile.education,
    skills: props.skills ?? profile.skills,
    details: props.details ?? profile.details,
    links: props.links ?? profile.links,
  };
}

export function ResumeContent({
  profile,
  onSelectImage,
  ...props
}: ResumeContentProps) {
  const [renderAllSections, setRenderAllSections] = useState(false);
  const upper = resolveUpperSections({ profile, onSelectImage, ...props });
  const lower = resolveLowerSections({ profile, onSelectImage, ...props });

  useLayoutEffect(() => {
    const renderAllBeforePrint = () => {
      // The browser snapshots the DOM as soon as beforeprint returns.
      // eslint-disable-next-line @eslint-react/dom-no-flush-sync
      flushSync(() => {
        setRenderAllSections(true);
      });
    };

    window.addEventListener("beforeprint", renderAllBeforePrint);
    return () => {
      window.removeEventListener("beforeprint", renderAllBeforePrint);
    };
  }, []);

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8"
    >
      <AboutSection profile={profile} {...props} />

      <DeferredSection
        sectionId="summary"
        title="Professional summary"
        renderAll={renderAllSections}
      >
        <SummarySection summary={upper.summary} />
      </DeferredSection>

      <DeferredSection
        sectionId="experience"
        title="Experience timeline"
        renderAll={renderAllSections}
      >
        <ExperienceSection
          experience={upper.experience}
          onSelectImage={onSelectImage}
        />
      </DeferredSection>

      <DeferredSection
        sectionId="education"
        anchorIds={LOWER_SECTION_ANCHORS}
        title="Education, skills, and profile"
        renderAll={renderAllSections}
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)]">
          <EducationSection
            education={lower.education}
            onSelectImage={onSelectImage}
          />

          <aside aria-label="Skills and public profile" className="space-y-6">
            <SkillsSection skills={lower.skills} />

            <ProfileSection
              details={lower.details}
              links={lower.links}
              onSelectImage={onSelectImage}
            />
          </aside>
        </div>
      </DeferredSection>
    </main>
  );
}
