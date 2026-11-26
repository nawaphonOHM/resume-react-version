export type ResumeSectionId =
  "about" | "experience" | "education" | "skills" | "profile";

export interface ImageAsset {
  src: string;
  width: number;
  height: number;
  surface: "light" | "dark";
}

export interface ClientCompany {
  name: string;
  logo: ImageAsset;
}

export interface ResumeProject {
  name: string;
  url: string;
}

export interface ResumeLink {
  label: string;
  url: string;
  logo?: ImageAsset;
}

export interface ResumeExperience {
  role: string;
  company: string;
  companyLogo: ImageAsset;
  client?: ClientCompany;
  location: string;
  period: string;
  employmentTypes: string[];
  highlights: string[];
  technologies: string[];
}

export type Experience = ResumeExperience;

export interface ResumeEducation {
  degree: string;
  institution: string;
  institutionLogo: ImageAsset;
  period: string;
  gpax: string;
  seniorProject: ResumeProject;
}

export interface ResumeDetails {
  location: string;
  phoneLabel: string;
  email: string;
  nationality: string;
  birthDate: string;
}

export const PUBLIC_PHONE_LABEL = "Available on request";

export interface ResumeProfile {
  name: string;
  title: string;
  summary: string[];
  details: ResumeDetails;
  links: ResumeLink[];
  skills: string[];
  experience: ResumeExperience[];
  education: ResumeEducation;
}

export const resumeSections: Array<{ id: ResumeSectionId; label: string }> = [
  { id: "about", label: "About" },
  { id: "experience", label: "Experience" },
  { id: "education", label: "Education" },
  { id: "skills", label: "Skills" },
  { id: "profile", label: "Profile" },
];
