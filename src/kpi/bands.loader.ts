// src/kpi/bands.loader.ts
import { BAND_BASE } from "./bands.base";
import en from "../i18n/en/bands.json";

type Dicts = { [k: string]: any };
const DICTS: Dicts = { en, de };

export function getBandSet(id: keyof typeof BAND_BASE, locale = "en") {
  const base = BAND_BASE[id];
  const lang = (locale.split("-")[0] || "en") as keyof typeof DICTS;
  const dict = (DICTS[lang] ?? DICTS.en)[id];
  if (!base || !dict) throw new Error(`Missing bands for ${String(id)} (${locale})`);

  return {
    id: base.id,
    title: dict.title,
    description: dict.description,
    valueScale: base.valueScale,
    hasBar: base.hasBar,
    bands: base.thresholds.map(t => {
      const d = dict.bands?.[t.id];
      if (!d) throw new Error(`Missing band copy '${t.id}' for ${String(id)} (${locale})`);
      return { id: t.id, min: t.min, max: t.max, tone: t.tone, label: d.label, guidance: d.guidance };
    }),
  };
}
