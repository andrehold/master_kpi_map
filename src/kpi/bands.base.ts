import { KPI_IDS } from "../kpi/kpiIds";

/** Visual tone for traffic-light bands */
export type Tone = "good" | "caution" | "avoid" | "neutral";

/** One numeric threshold band */
export type BandBase = {
  /** Inclusive lower bound (on the KPI's native scale) */
  min?: number;
  /** Exclusive upper bound */
  max?: number;
  /** Traffic-light tone for this corridor */
  tone?: Tone;
};

/** A full KPI’s band definition */
export type BandBaseSet = {
  /** Value scale: affects clamping/formatting and whether a 0–100 band bar is sensible */
  valueScale: "percent" | "raw" | "ratio";
  /** Show the mini band bar under the KPI number by default */
  hasBar: boolean;
  /** Ordered low → high thresholds */
  thresholds: BandBase[];
  /** Optional note describing KPI computation or context */
  note?: string;
};

export type BandBaseIds = keyof typeof BAND_BASE;

/** -----------------------------------------------------------------------
 *  All KPI band bases (thresholds) — indexed by KPI_IDS
 * --------------------------------------------------------------------- */
export const BAND_BASE: Record<string, BandBaseSet> = {
  /* -----------------------------------------------------------------------
   * 1) IV & Surface
   * --------------------------------------------------------------------- */
  [KPI_IDS.ivr]: {
    valueScale: "percent",
    hasBar: true,
    thresholds: [
      { max: 20, tone: "avoid" },
      { min: 30, max: 70, tone: "good" },
      { min: 80, tone: "caution" },
    ],
    note: "IV Rank / Percentile (1y). Value in % (0–100).",
  },

  [KPI_IDS.atmIv]: {
    valueScale: "percent",
    hasBar: true,
    thresholds: [
      { max: 15, tone: "avoid" },
      { min: 15, max: 25, tone: "good" },
      { min: 25, tone: "caution" },
    ],
    note: "ATM IV level vs historical norms.",
  },

  [KPI_IDS.termStructure]: {
    valueScale: "percent",
    hasBar: false,
    thresholds: [
      { max: -5, tone: "avoid" },
      { min: -5, max: 0, tone: "caution" },
      { min: 0, tone: "good" },
    ],
    note: "Term structure (short–long IV spread).",
  },

  /* -----------------------------------------------------------------------
   * 2) Expected Move Hit Rate
   * --------------------------------------------------------------------- */
  [KPI_IDS.emHitRate]: {
    valueScale: "percent",
    hasBar: true,
    thresholds: [
      { max: 40, tone: "avoid" },
      { min: 40, max: 70, tone: "caution" },
      { min: 70, tone: "good" },
    ],
    note: "Hit rate of expected move (within EM / total) over lookback window.",
  },

  /* -----------------------------------------------------------------------
   * 3) Condor Credit % of EM
   * --------------------------------------------------------------------- */
  [KPI_IDS.condorCreditEm]: {
    valueScale: "percent",
    hasBar: true,
    thresholds: [
      { max: 25, tone: "avoid" },
      { min: 25, max: 40, tone: "good" },
      { min: 40, tone: "caution" },
    ],
    note: "Condor credit as % of expected move width.",
  },

  /* -----------------------------------------------------------------------
   * 4) Liquidity Stress
   * --------------------------------------------------------------------- */
  [KPI_IDS.liquidityStress]: {
    valueScale: "raw",
    hasBar: true,
    thresholds: [
      { max: 0.5, tone: "good" },
      { min: 0.5, max: 1, tone: "caution" },
      { min: 1, tone: "avoid" },
    ],
    note: "Liquidity stress proxy; higher = worse conditions.",
  },
};
