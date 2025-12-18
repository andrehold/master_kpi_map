import type { KPIDef } from "../../../data/kpis";
import type { Samples } from "../../../utils/samples";

import type { useDeribitSkew25D } from "../../../hooks/domain/useDeribitSkew25D";
import type { useTermStructureKink } from "../../../hooks/domain/useTermStructureKink";
import type { useCondorCreditPctOfEM } from "../../../hooks/domain/useCondorCreditPctOfEM";
import type { useIVTermStructure } from "../../../hooks/domain/useIVTermStructure";
import type { useOpenInterestConcentration } from "../../../hooks/domain/useOpenInterestConcentration";
import type { useGammaWalls } from "../../../hooks/domain/useGammaWalls";

import type { StrikeMapState } from "../../../kpi/strikeMapTypes";
import type { KpiId } from "../../../kpi/kpiIds";

type SkewState = ReturnType<typeof useDeribitSkew25D>;
type KinkData = ReturnType<typeof useTermStructureKink>["data"];
type CondorState = ReturnType<typeof useCondorCreditPctOfEM>;
type TermStructureData = ReturnType<typeof useIVTermStructure>["data"];
type OIConcentrationState = ReturnType<typeof useOpenInterestConcentration>;
type GammaWallsState = ReturnType<typeof useGammaWalls>;

//
// Optional: "aggregated snapshot" types (kept for future use)
//
export type KpiPoint = {
  key: string; // "main", "30d", "50d", ...
  label: string; // human label
  value: number | null;
  formatted: string;
};

export type KpiSnapshot = {
  runId: string;
  kpiId: KpiId;
  ts: number;
  status: "loading" | "ready" | "error" | "empty";
  main: KpiPoint | null;
  mini: KpiPoint[];
  meta?: string;
  extraBadge?: string;
  guidanceValue?: string | number | null;
  error?: string;
};

export type KpiSnapshotPayload = {
  kpiId: KpiId;
  ts?: number; // optional; client can omit and App/backend can set Date.now()
  status: "loading" | "ready" | "error" | "empty";
  main: KpiPoint | null;
  mini: KpiPoint[];
  meta?: string;
  extraBadge?: string;
  guidanceValue?: string | number | null;
  error?: string;
};

// allow sync or async sinks
export type SnapshotSink = (snap: KpiSnapshotPayload) => void | Promise<void>;

export type PersistableKpiVm = {
  status: "loading" | "ready" | "error" | "empty";
  meta?: string;
  extraBadge?: string;
  guidanceValue?: string | number | null;
  error?: string;

  main?: { label: string; formatted: string; value?: number | null } | null;

  mini?: Array<{
    key: string;
    label: string;
    formatted: string;
    value?: number | null;
  }>;
};

export type ExpectedMoveRow = {
  days: number;
  expiryTs: number | null;
  abs: number | null;
  pct: number | null;
};

export type KpiCardRendererContext = {
  samples: Samples;
  locale: string;

  dvolPct?: number | null;
  ivr?: number | null;
  ivp?: number | null;

  rv: {
    value?: number | null;
    ts?: number | null;
    loading: boolean;
  };

  termStructure?: TermStructureData;

  skew: {
    entries: Array<{ key: string; label: string; state: SkewState }>;
    kink: {
      loading: boolean;
      error: string | null;
      data: KinkData;
    };
  };

  rvem: {
    ratio?: number | null;
    rvAnn?: number | null;
    // NOTE: legacy naming from your file — keep as-is so you don't break anything
    ivAnn?: number | null;
    loading: boolean;
    error: string | null;
    tenorDays: number;
  };

  funding: {
    loading: boolean;
    error: string | null;
    current8h?: number | null;
    avg7d8h?: number | null;
    ts?: number | null;
  };

  expectedMove?: {
    loading: boolean;
    error: string | null;
    asOf: number | null;
    rows: ExpectedMoveRow[];
  };

  condor: CondorState;

  basis: {
    loading: boolean;
    error: string | null;
    pct?: number | null;
    abs?: number | null;
    ts?: number | null;
  };

  oiConcentration: OIConcentrationState;
  gammaWalls: GammaWallsState;

  strikeMap?: StrikeMapState;

  // persistence
  runId?: string | null;
  snapshotSink?: SnapshotSink;
};

export type KpiCardComponentProps = {
  kpi: KPIDef;
  context: KpiCardRendererContext;
};

export type KpiCardComponent = (props: KpiCardComponentProps) => JSX.Element | null;
