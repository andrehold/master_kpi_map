export type StrikeLevelKind = "support" | "resistance" | "magnet";

export interface StrikeMapBucket {
  strike: number;
  score: number; // 0–1, normalized combined score
  // "none" = included in the window but not classified as S/R/magnet
  kind: StrikeLevelKind | "none";
}

export interface StrikeMapTableRow {
  section: "support" | "resistance";
  label: string;   // "Major support", "Support #2", etc.
  strike: number;
  score: number;
}

export interface StrikeMapState {
  loading: boolean;
  error: string | null;

  pinStrike: number | null;
  pinDistancePct: number | null;

  mainSupportStrike: number | null;
  mainResistanceStrike: number | null;

  buckets: StrikeMapBucket[];
  tableRows: StrikeMapTableRow[];
}
