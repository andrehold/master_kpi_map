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
    hasBar: true,
    thresholds: [
      { max: -3, tone: "avoid" },   // strong backwardation
      { min: -3, max: 3, tone: "caution" }, // flat / mixed
      { min: 3, tone: "good" },     // healthy contango
    ],
    note: "Term structure (short–long IV spread, in vol points). Negative = backwardation, positive = contango.",
  },

  [KPI_IDS.gammaCenterOfMass]: {
    valueScale: "percent",
    hasBar: true,
    thresholds: [
      // Large downside heaviness
      { max: -2, tone: "caution" },

      // Structurally heavy right here (pin zone)
      { min: -2, max: 2, tone: "neutral" },

      // Large upside heaviness
      { min: 2, tone: "caution" },
    ],
    note: "Gamma center-of-mass distance vs spot (in %). Near 0% = pinned around spot; large ± values = structural bias.",
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

  [KPI_IDS.rv]: {
    valueScale: "percent",
    hasBar: true,
    thresholds: [
      { max: 40, tone: "caution" },    // very quiet
      { min: 40, max: 80, tone: "good" },
      { min: 80, tone: "avoid" },      // very high RV
    ],
    note: "Realized volatility over the lookback window (annualized %).",
  },

  [KPI_IDS.ivRvSpread]: {
    valueScale: "percent",
    hasBar: true,
    thresholds: [
      { max: 0, tone: "avoid" },       // IV < RV: dangerous for short vol
      { min: 0, max: 5, tone: "caution" },
      { min: 5, tone: "good" },        // nice premium for selling vol
    ],
    note: "IV minus RV in vol points; positive values indicate an implied volatility risk premium.",
  },

  [KPI_IDS.timeToFirstBreach]: {
    valueScale: "percent",
    hasBar: true,
    thresholds: [
      { max: 30, tone: "avoid" },      // early breaches
      { min: 30, max: 60, tone: "caution" },
      { min: 60, tone: "good" },       // late / rare breaches
    ],
    note: "Average % of option lifetime until the EM band is first breached. Higher = safer EM for short gamma.",
  },

  [KPI_IDS.rvEmFactor]: {
    valueScale: "ratio",
    hasBar: true,
    thresholds: [
      { max: 0.7, tone: "good" },
      { min: 0.7, max: 1.3, tone: "caution" },
      { min: 1.3, tone: "avoid" },
    ],
    note: "RV ÷ EM factor. <1 means realized volatility has been below EM (carry-friendly); >1 means EM underestimates moves.",
  },

  [KPI_IDS.shortHorizonAtr]: {
    valueScale: "ratio",
    hasBar: true,
    thresholds: [
      { max: 0.5, tone: "good" },
      { min: 0.5, max: 1, tone: "caution" },
      { min: 1, tone: "avoid" },
    ],
    note: "Short-horizon ATR relative to EM. Higher values = choppier intraday tape and more noise around EM.",
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

  [KPI_IDS.vix]: {
    valueScale: "raw",
    hasBar: true,
    thresholds: [
      { max: 15, tone: "caution" },   // complacent
      { min: 15, max: 25, tone: "good" },
      { min: 25, tone: "avoid" },     // stressed
    ],
    note: "VIX index level; higher values correspond to more stressed global risk regimes.",
  },

  [KPI_IDS.funding]: {
    valueScale: "percent",
    hasBar: true,
    thresholds: [
      { max: -10, tone: "avoid" },     // heavily negative funding
      { min: -10, max: 10, tone: "neutral" },
      { min: 10, tone: "caution" },    // very positive funding (crowded longs)
    ],
    note: "Annualized perpetual funding rate. Very negative = paying to be long; very positive = crowded long positioning.",
  },

  [KPI_IDS.basis]: {
    valueScale: "percent",
    hasBar: true,
    thresholds: [
      { max: -5, tone: "avoid" },
      { min: -5, max: 5, tone: "neutral" },
      { min: 5, tone: "caution" },
    ],
    note: "Spot–perpetual basis (annualized). Large positive basis indicates strong carry / long bias; large negative basis is stress.",
  },

  [KPI_IDS.oiConcentration]: {
    valueScale: "percent",
    hasBar: true,
    thresholds: [
      { max: 20, tone: "neutral" },
      { min: 20, max: 50, tone: "good" },
      { min: 50, tone: "caution" },
    ],
    note: "Share of OI concentrated near key strikes. High concentration implies pin risk or sharp moves when those zones break.",
  },

  [KPI_IDS.gammaWalls]: {
    valueScale: "raw",
    hasBar: false,
    thresholds: [],
    note: "Gamma wall strength / proximity indicator. Currently treated as info-only (no numeric band bar).",
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

  [KPI_IDS.spotVsSma]: {
    valueScale: "percent",
    hasBar: true,
    thresholds: [
      { max: -5, tone: "avoid" },
      { min: -5, max: 5, tone: "neutral" },
      { min: 5, tone: "caution" },
    ],
    note: "Distance of spot vs key SMAs (20/50/100/200D) in %. Positive = above SMAs, negative = below.",
  },

  [KPI_IDS.adx]: {
    valueScale: "raw",
    hasBar: true,
    thresholds: [
      { max: 15, tone: "good" },       // range-friendly
      { min: 15, max: 25, tone: "neutral" }, // transition
      { min: 25, max: 35, tone: "caution" }, // trending
      { min: 35, tone: "avoid" },      // strong trend
    ],
    note: "ADX(14) trend strength (not direction). Higher and rising = strengthening trend; low/falling = range regime.",
  },

  [KPI_IDS.smaTrendQuality]: {
    valueScale: "percent",
    hasBar: true,
    thresholds: [
      // Symmetric: strong trend risk on either side
      { max: -6, tone: "avoid" },
      { min: -6, max: -2, tone: "caution" },
      { min: -2, max: 2, tone: "good" },
      { min: 2, max: 6, tone: "caution" },
      { min: 6, tone: "avoid" },
    ],
    note: "MA separation (MA50 − MA100) / spot in %. Large absolute separation implies established trend (range-risk for short gamma).",
  },

  [KPI_IDS.strikeMap]: {
    valueScale: "raw",
    hasBar: false,
    thresholds: [],
    note: "Qualitative strike support/resistance map. No numeric bands yet; info-only KPI.",
  },
};
