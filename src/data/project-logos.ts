import { assetUrls, IMAGE_ASSET_ORIGIN } from "./asset-urls";
import type { ImageAsset } from "../resume-data";

const PROJECT_LOGO_FILES_BY_PATH: Readonly<Record<string, string>> = {
  "/link-logos/github.svg": "github.svg",
  "/company-logos/accord-innovations.png": "accord-innovations.png",
  "/company-logos/innovestx.png": "innovestx.png",
  "/company-logos/saitech-solution.png": "saitech-solution.png",
  "/company-logos/krungsri.png": "krungsri.png",
  "/company-logos/nityo-infotech.svg": "nityo-infotech.svg",
  "/company-logos/tisco.svg": "tisco.svg",
  "/company-logos/line-man-wongnai.webp": "line-man-wongnai.webp",
  "/company-logos/wisesoft.png": "wisesoft.png",
  "/university-logos/prince-of-songkla-university.webp":
    "prince-of-songkla-university.webp",
};

function assetOriginPathname(source: string): string | undefined {
  try {
    const url = new URL(source);
    const isPlainAssetUrl =
      url.origin === IMAGE_ASSET_ORIGIN &&
      url.username === "" &&
      url.password === "" &&
      `${url.origin}${url.pathname}` === source;

    return isPlainAssetUrl ? url.pathname : undefined;
  } catch {
    return undefined;
  }
}

export function projectLogoFileNameFromSource(
  source: unknown,
): string | undefined {
  if (typeof source !== "string") {
    return undefined;
  }

  const rootRelativeFileName = PROJECT_LOGO_FILES_BY_PATH[source];
  if (rootRelativeFileName) {
    return rootRelativeFileName;
  }

  const pathname = assetOriginPathname(source);
  return pathname ? PROJECT_LOGO_FILES_BY_PATH[pathname] : undefined;
}

export function normalizeProjectLogo<T extends ImageAsset>(logo: T): T {
  const fileName = projectLogoFileNameFromSource(logo.src);
  return fileName ? { ...logo, src: assetUrls.file(fileName) } : logo;
}
