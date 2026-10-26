import type { ZoomImage } from "../dialogs/ImageZoomDialog";
import { AboutSection, type AboutSectionProps } from "../sections/AboutSection";
import { EducationSection } from "../sections/EducationSection";
import { ExperienceSection } from "../sections/ExperienceSection";
import { ProfileSection } from "../sections/ProfileSection";
import { SkillsSection } from "../sections/SkillsSection";
import { SummarySection } from "../sections/SummarySection";

export interface ResumeContentProps extends AboutSectionProps {
  onSelectImage: (image: ZoomImage) => void;
}

export function ResumeContent({
  onSelectImage,
  ...aboutProps
}: ResumeContentProps) {
  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <AboutSection {...aboutProps} />

      <SummarySection />

      <ExperienceSection onSelectImage={onSelectImage} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)]">
        <EducationSection onSelectImage={onSelectImage} />

        <div className="space-y-6">
          <SkillsSection />

          <ProfileSection onSelectImage={onSelectImage} />
        </div>
      </div>
    </main>
  );
}
