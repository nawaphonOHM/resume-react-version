import type { ZoomImage } from "../common/image-zoom";
import { AboutSection, type AboutSectionProps } from "../sections/AboutSection";
import { EducationSection } from "../sections/EducationSection";
import { ExperienceSection } from "../sections/ExperienceSection";
import { ProfileSection } from "../sections/ProfileSection";
import { SkillsSection } from "../sections/SkillsSection";
import { SummarySection } from "../sections/SummarySection";
import { DeferredSection } from "./DeferredSection";
import { PrintResumeSections } from "./PrintResumeSections";
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
  const upper = resolveUpperSections({ profile, onSelectImage, ...props });
  const lower = resolveLowerSections({ profile, onSelectImage, ...props });

  return (
    <main id="main-content" tabIndex={-1} className="resume-main">
      <div className="resume-content">
        <AboutSection profile={profile} {...props} />

        <DeferredSection
          sectionId="summary"
          title="Professional summary"
          renderAll={false}
        >
          <SummarySection summary={upper.summary} />
        </DeferredSection>

        <DeferredSection
          sectionId="experience"
          title="Experience timeline"
          renderAll={false}
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
          renderAll={false}
        >
          <div>
            <EducationSection
              education={lower.education}
              onSelectImage={onSelectImage}
            />

            <aside aria-label="Skills and public profile">
              <SkillsSection skills={lower.skills} />

              <ProfileSection
                details={lower.details}
                links={lower.links}
                onSelectImage={onSelectImage}
              />
            </aside>
          </div>
        </DeferredSection>
        <PrintResumeSections
          {...upper}
          {...lower}
          onSelectImage={onSelectImage}
        />
      </div>
    </main>
  );
}
