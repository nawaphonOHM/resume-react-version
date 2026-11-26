import Button from "@jetbrains/ring-ui-built/components/button/button";
import DropdownMenu from "@jetbrains/ring-ui-built/components/dropdown-menu/dropdown-menu";
import { ControlsHeight } from "@jetbrains/ring-ui-built/components/global/controls-height";
import {
  Type as ListItemType,
  type ListDataItem,
} from "@jetbrains/ring-ui-built/components/list/consts";
import { Directions } from "@jetbrains/ring-ui-built/components/popup/popup.consts";
import Tooltip from "@jetbrains/ring-ui-built/components/tooltip/tooltip";
import type { Theme } from "../../hooks/use-theme";
import { resumeSections, type ResumeSectionId } from "../../resume-data";
import {
  chevronRightIcon,
  darkModeIcon,
  downloadIcon,
  fileDownloadOffIcon,
  lightModeIcon,
  menuIcon,
  resizeIcon,
} from "../common/material-icons";

export interface HeaderProps {
  activeSection: ResumeSectionId;
  theme: Theme;
  onToggleTheme: () => void;
  downloadAvailable: boolean | null;
  downloadPending: boolean;
  downloadControlLabel: string;
  downloadControlText: string;
  onDownloadRequest: () => void;
}

type DownloadControlProps = Pick<
  HeaderProps,
  | "downloadAvailable"
  | "downloadPending"
  | "downloadControlLabel"
  | "onDownloadRequest"
>;

type MobileMenuProps = Pick<
  HeaderProps,
  | "activeSection"
  | "downloadAvailable"
  | "downloadPending"
  | "downloadControlText"
  | "onDownloadRequest"
>;

const MENU_ICON_SIZE = 20;
const MENU_DIRECTIONS = [
  Directions.BOTTOM_LEFT,
  Directions.BOTTOM_RIGHT,
  Directions.TOP_LEFT,
  Directions.TOP_RIGHT,
];
const menuSectionIcon = resizeIcon(chevronRightIcon, MENU_ICON_SIZE);
const menuDownloadIcon = resizeIcon(downloadIcon, MENU_ICON_SIZE);
const menuDownloadOffIcon = resizeIcon(fileDownloadOffIcon, MENU_ICON_SIZE);

function ariaCurrent(isActive: boolean): "location" | undefined {
  return isActive ? "location" : undefined;
}

function SectionLinks({ activeSection }: Pick<HeaderProps, "activeSection">) {
  return (
    <nav
      className="hidden items-center gap-1 md:flex"
      aria-label="Portfolio sections"
    >
      {resumeSections.map((section) => {
        const isActive = activeSection === section.id;

        return (
          <span
            key={section.id}
            className={
              isActive
                ? "navigation-link navigation-link-active"
                : "navigation-link"
            }
          >
            <Button
              ghost
              height={ControlsHeight.L}
              href={`#${section.id}`}
              active={isActive}
              aria-current={ariaCurrent(isActive)}
            >
              {section.label}
            </Button>
          </span>
        );
      })}
    </nav>
  );
}

function ThemeControl({
  theme,
  onToggleTheme,
}: Pick<HeaderProps, "theme" | "onToggleTheme">) {
  const label =
    theme === "dark" ? "Switch to light theme" : "Switch to dark theme";

  return (
    <Tooltip title={label}>
      <Button
        ghost
        inline={false}
        icon={theme === "dark" ? lightModeIcon : darkModeIcon}
        aria-label={label}
        onClick={onToggleTheme}
      />
    </Tooltip>
  );
}

function DownloadControl({
  downloadAvailable,
  downloadPending,
  downloadControlLabel,
  onDownloadRequest,
}: DownloadControlProps) {
  return (
    <Tooltip title={downloadControlLabel}>
      <Button
        ghost
        inline={false}
        icon={downloadAvailable === false ? fileDownloadOffIcon : downloadIcon}
        loader={downloadPending}
        aria-busy={downloadPending}
        aria-label={downloadControlLabel}
        onClick={onDownloadRequest}
      />
    </Tooltip>
  );
}

function buildMenuItems({
  activeSection,
  downloadAvailable,
  downloadPending,
  downloadControlText,
  onDownloadRequest,
}: MobileMenuProps): ListDataItem[] {
  return [
    ...resumeSections.map((section) => ({
      key: section.id,
      rgItemType: ListItemType.LINK,
      label: section.label,
      href: `#${section.id}`,
      glyph: menuSectionIcon,
      "aria-current": ariaCurrent(activeSection === section.id),
    })),
    { key: "separator", rgItemType: ListItemType.SEPARATOR },
    {
      key: "download",
      rgItemType: ListItemType.ITEM,
      label: downloadControlText,
      glyph:
        downloadAvailable === false ? menuDownloadOffIcon : menuDownloadIcon,
      disabled: downloadPending,
      onClick: onDownloadRequest,
    },
  ];
}

function MobileMenu(props: MobileMenuProps) {
  return (
    <DropdownMenu
      ariaLabel="Section menu"
      data={buildMenuItems(props)}
      menuProps={{ className: "navigation-menu", directions: MENU_DIRECTIONS }}
      anchor={({ active }) => (
        <Button
          ghost
          inline={false}
          icon={menuIcon}
          active={active}
          aria-label="Open section menu"
          aria-haspopup="menu"
          aria-expanded={active}
        />
      )}
    />
  );
}

export function Header({
  activeSection,
  theme,
  onToggleTheme,
  ...download
}: HeaderProps) {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <header className="navigation-shell">
        <div className="navigation-toolbar">
          <a
            className="brand-mark"
            href="#about"
            aria-label="Go to About section"
          >
            <span aria-hidden="true">NI</span>
          </a>

          <SectionLinks activeSection={activeSection} />

          <span className="flex-1" />

          <div
            className="navigation-controls flex items-center gap-1"
            role="group"
            aria-label="Résumé controls"
          >
            <ThemeControl theme={theme} onToggleTheme={onToggleTheme} />
            <span className="desktop-control">
              <DownloadControl {...download} />
            </span>
            <span className="mobile-control">
              <MobileMenu activeSection={activeSection} {...download} />
            </span>
          </div>
        </div>
      </header>
    </>
  );
}
