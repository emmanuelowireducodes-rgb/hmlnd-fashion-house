import type { CSSProperties } from "react";

export type BrandFont = "Belleza" | "Roboto Condensed" | "Cormorant Garamond" | "Futura PT";
export type DesignSystem = {
  colors: { background: string; text: string; accent: string };
  typography: { headingFont: BrandFont; bodyFont: BrandFont; size: "small" | "standard" | "large" };
  buttonStyle: "square" | "soft" | "pill";
  spacing: "compact" | "standard" | "spacious";
  sectionDefaults: { heroOverlay: "soft" | "standard" | "strong" };
};

export const defaultDesignSystem: DesignSystem = {
  colors: { background: "#FFFFFF", text: "#000000", accent: "#E99801" },
  typography: { headingFont: "Belleza", bodyFont: "Roboto Condensed", size: "standard" },
  buttonStyle: "square",
  spacing: "compact",
  sectionDefaults: { heroOverlay: "standard" },
};

export function resolveDesignSystem(value?: Partial<DesignSystem> | null): DesignSystem {
  return {
    ...defaultDesignSystem,
    ...value,
    colors: { ...defaultDesignSystem.colors, ...value?.colors },
    typography: { ...defaultDesignSystem.typography, ...value?.typography },
    sectionDefaults: { ...defaultDesignSystem.sectionDefaults, ...value?.sectionDefaults },
  };
}

const fontStacks: Record<BrandFont, string> = {
  Belleza: '"Belleza", "Optima", "Candara", sans-serif',
  "Roboto Condensed": '"Roboto Condensed", "Arial Narrow", Arial, sans-serif',
  "Cormorant Garamond": '"Cormorant Garamond", Georgia, serif',
  "Futura PT": '"futura-pt", "Jost", "Futura", sans-serif',
};

export function designSystemStyle(value?: Partial<DesignSystem> | null): CSSProperties {
  const design = resolveDesignSystem(value);
  const spacing = { compact: "0px", standard: "10px", spacious: "22px" }[design.spacing];
  const radius = { square: "0px", soft: "4px", pill: "999px" }[design.buttonStyle];
  const shade = { soft: "0.24", standard: "0.42", strong: "0.62" }[
    design.sectionDefaults.heroOverlay
  ];
  const campaignSize = {
    small: "clamp(1.25rem, 2vw, 1.5rem)",
    standard: "clamp(1.5rem, 3vw, 2rem)",
    large: "clamp(1.75rem, 4vw, 3rem)",
  }[design.typography.size];
  const overlay = {
    soft: "linear-gradient(180deg, rgb(0 0 0 / 0.08) 0%, rgb(0 0 0 / 0.02) 40%, rgb(0 0 0 / 0.3) 100%)",
    standard:
      "linear-gradient(180deg, rgb(0 0 0 / 0.15) 0%, rgb(0 0 0 / 0.05) 40%, rgb(0 0 0 / 0.6) 100%)",
    strong:
      "linear-gradient(180deg, rgb(0 0 0 / 0.24) 0%, rgb(0 0 0 / 0.12) 40%, rgb(0 0 0 / 0.75) 100%)",
  }[design.sectionDefaults.heroOverlay];
  return {
    "--bone": design.colors.background,
    "--background": design.colors.background,
    "--color-background": design.colors.background,
    "--ink": design.colors.text,
    "--foreground": design.colors.text,
    "--color-foreground": design.colors.text,
    "--brand": design.colors.accent,
    "--color-brand": design.colors.accent,
    "--font-display": fontStacks[design.typography.headingFont],
    "--font-sans": fontStacks[design.typography.bodyFont],
    "--type-campaign-size": campaignSize,
    "--hmlnd-button-radius": radius,
    "--hmlnd-section-gap": spacing,
    "--hmlnd-hero-shade": shade,
    "--overlay-hero": overlay,
  } as CSSProperties;
}
