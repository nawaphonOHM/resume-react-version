import { Component, type ReactNode } from "react";
import type {
  ResumeDetails,
  ResumeEducation,
  ResumeExperience,
  ResumeLink,
} from "../../resume-data";
import type { ZoomImage } from "../common/image-zoom";
import { EducationSection } from "../sections/EducationSection";
import { ExperienceSection } from "../sections/ExperienceSection";
import { ProfileSection } from "../sections/ProfileSection";
import { SkillsSection } from "../sections/SkillsSection";
import { SummarySection } from "../sections/SummarySection";

interface PrintResumeSectionsProps {
  summary?: readonly string[];
  experience?: readonly ResumeExperience[];
  education?: ResumeEducation;
  skills?: readonly string[];
  details?: ResumeDetails;
  links?: readonly ResumeLink[];
  onSelectImage: (image: ZoomImage) => void;
}

interface PrintSectionErrorBoundaryProps {
  sectionId: string;
  title: string;
  children: ReactNode;
}

class PrintSectionErrorBoundary extends Component<
  PrintSectionErrorBoundaryProps,
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      const { sectionId, title } = this.props;
      return (
        <section
          id={`print-${sectionId}`}
          aria-labelledby={`print-${sectionId}-title`}
        >
          <h2 id={`print-${sectionId}-title`}>{title}</h2>
          <p>This section could not be displayed.</p>
        </section>
      );
    }

    return this.props.children;
  }
}

export function PrintResumeSections({
  summary,
  experience,
  education,
  skills,
  details,
  links,
  onSelectImage,
}: PrintResumeSectionsProps) {
  return (
    <div className="print-resume-sections">
      <PrintSectionErrorBoundary
        sectionId="summary"
        title="Professional summary"
      >
        <SummarySection summary={summary} print />
      </PrintSectionErrorBoundary>
      <PrintSectionErrorBoundary
        sectionId="experience"
        title="Experience timeline"
      >
        <ExperienceSection
          experience={experience}
          onSelectImage={onSelectImage}
          print
        />
      </PrintSectionErrorBoundary>
      <div>
        <PrintSectionErrorBoundary sectionId="education" title="Education">
          <EducationSection
            education={education}
            onSelectImage={onSelectImage}
            print
          />
        </PrintSectionErrorBoundary>
        <aside aria-label="Skills and public profile">
          <PrintSectionErrorBoundary sectionId="skills" title="Core skills">
            <SkillsSection skills={skills} print />
          </PrintSectionErrorBoundary>
          <PrintSectionErrorBoundary
            sectionId="profile"
            title="Profile and links"
          >
            <ProfileSection
              details={details}
              links={links}
              onSelectImage={onSelectImage}
              print
            />
          </PrintSectionErrorBoundary>
        </aside>
      </div>
    </div>
  );
}
