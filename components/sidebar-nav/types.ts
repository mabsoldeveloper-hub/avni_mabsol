import { ReactNode } from "react";
import { ColorKey, SubMenuItemConfig } from "@/lib/defaultMenuData";

export type SidebarThemeId =
  | "default"
  | "deep_navy"
  | "royal_blue"
  | "cobalt_navy"
  | "cyber_electric"
  | "ice_azure"
  | "ocean_sapphire"
  | "steel_blue"
  | "midnight_dark"
  | "emerald_mint"
  | "royal_purple"
  | "sunset_rose"
  | "amber_warm"
  | "custom";

export interface SidebarPresetTheme {
  id: SidebarThemeId;
  name: string;
  category: "blue" | "other";
  color: string;
  bgGradient: string;
  borderColor: string;
  isDark: boolean;
}

export interface ColorStyleConfig {
  bar: string;
  iconText: string;
  iconActiveBg: string;
  hoverText: string;
  activeText: string;
  subHoverIcon: string;
  glow: string;
  glowDark: string;
}

export interface SidebarVisuals {
  bg: string;
  borderColor: string;
  isDark: boolean;
  color: string;
  textColor?: string;
}

export interface SidebarProps {
  collapsed: boolean;
  setCollapsed?: (collapsed: boolean) => void;
  mobile: boolean;
}

export interface SidebarNavLinkProps {
  href: string;
  icon: ReactNode;
  label: string;
  active: boolean;
  color: ColorKey;
  iconOnly: boolean;
  badge?: string;
  customActiveStyle?: boolean;
  onNavigate?: () => void;
}

export interface SidebarSubLinkProps {
  href: string;
  icon: ReactNode;
  label: string;
  active: boolean;
  color: ColorKey;
  isDark: boolean;
  onNavigate?: () => void;
}

export interface SidebarGroupProps {
  id: string;
  icon: ReactNode;
  label: string;
  open: boolean;
  active: boolean;
  color: ColorKey;
  subItems: SubMenuItemConfig[];
  iconOnly: boolean;
  pathname: string;
  currentVisuals: SidebarVisuals;
  can: (key: string) => boolean;
  role?: string;
  onToggle: () => void;
  onNavigate?: () => void;
}

export interface SidebarSectionDef {
  key: string;
  label: string;
  ids: string[];
}

