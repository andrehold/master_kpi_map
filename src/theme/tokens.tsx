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
    bg: "#0a0f1a",
    surface950: "#0b1020",
    surface900: "#0e1629",
    border: "#1e293b",
    shadow: "0 1px 0 rgba(255,255,255,0.04)",
    fg: "#e2e8f0",
    fgMuted: "#94a3b8",
    brand400: "#22d3ee",
    brand500: "#6366f1",
    brand600: "#4f46e5",
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
