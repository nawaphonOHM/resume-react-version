import arrowDownwardIcon from "@material-design-icons/svg/filled/arrow_downward.svg?raw";
import badgeIcon from "@material-design-icons/svg/filled/badge.svg?raw";
import chevronRightIcon from "@material-design-icons/svg/filled/chevron_right.svg?raw";
import codeIcon from "@material-design-icons/svg/filled/code.svg?raw";
import darkModeIcon from "@material-design-icons/svg/filled/dark_mode.svg?raw";
import downloadIcon from "@material-design-icons/svg/filled/download.svg?raw";
import fileDownloadOffIcon from "@material-design-icons/svg/filled/file_download_off.svg?raw";
import lightModeIcon from "@material-design-icons/svg/filled/light_mode.svg?raw";
import linkIcon from "@material-design-icons/svg/filled/link.svg?raw";
import locationOnIcon from "@material-design-icons/svg/filled/location_on.svg?raw";
import mailIcon from "@material-design-icons/svg/filled/mail.svg?raw";
import menuIcon from "@material-design-icons/svg/filled/menu.svg?raw";
import openInNewIcon from "@material-design-icons/svg/filled/open_in_new.svg?raw";
import schoolIcon from "@material-design-icons/svg/filled/school.svg?raw";

const MATERIAL_ICON_SIZE_ATTRIBUTES = 'width="24" height="24"';

export function resizeIcon(icon: string, size: number): string {
  const pixels = String(size);
  return icon.replace(
    MATERIAL_ICON_SIZE_ATTRIBUTES,
    `width="${pixels}" height="${pixels}"`,
  );
}

export {
  arrowDownwardIcon,
  badgeIcon,
  chevronRightIcon,
  codeIcon,
  darkModeIcon,
  downloadIcon,
  fileDownloadOffIcon,
  lightModeIcon,
  linkIcon,
  locationOnIcon,
  mailIcon,
  menuIcon,
  openInNewIcon,
  schoolIcon,
};
