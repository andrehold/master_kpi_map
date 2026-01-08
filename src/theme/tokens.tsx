// central tokens for light/dark, mapped to CSS custom props
import React from "react";

export const TOKENS = {
  light: {
    colorScheme: "light",
    bg: "#F6F8FC",
    surface950: "#FFFFFF",
    surface900: "#F8FAFF",
    border: "#E2E8F0",
    shadow: "0 1px 2px rgba(16,24,40,.04), 0 1px 1px rgba(16,24,40,.06)",
    fg: "#0F172A",
    fgMuted: "#64748B",
    brand400: "#60A5FA",
    brand500: "#2563EB",
    brand600: "#1D4ED8",
  },
  dark: {
    colorScheme: "dark",
    bg: "#000000",          // main background
    surface950: "#070707",  // main card surface
    surface900: "#272727",  // controls / chips / secondary surfaces
    border: "#282828",      // borders
    shadow: "0 0 0 1px rgba(255,255,255,0.04)",
    fg: "#DBDBDB",          // primary text
    fgMuted: "#808080",     // muted text
    brand400: "#3861F6",
    brand500: "#3861F6",
    brand600: "#2A49B9",
  },
} as const;

export type ThemeKey = keyof typeof TOKENS;

export function TokenStyles({ theme }: { theme: ThemeKey }) {
  const t = TOKENS[theme];
  const css = `
    :root, [data-theme="tm"]{
      --color-scheme:${t.colorScheme};
      --bg:${t.bg};
      --surface-950:${t.surface950};
      --surface-900:${t.surface900};
      --border:${t.border};
      --shadow:${t.shadow};
      --fg:${t.fg};
      --fg-muted:${t.fgMuted};
      --brand-400:${t.brand400};
      --brand-500:${t.brand500};
      --brand-600:${t.brand600};
      --radius-lg:.5rem; --radius-xl:.75rem; --radius-2xl:1rem;
    }
  `;
  return <style>{css}</style>;
}
