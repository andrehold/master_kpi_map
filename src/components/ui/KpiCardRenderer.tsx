import type { ComponentProps } from "react";
import KpiCard from "./KpiCard";
import ExpectedMoveRibbonCard from "../ExpectedMoveRibbonCard";
import GammaWallsCard from "./GammaWallsCard";
import OIConcentrationCard from "./OIConcentrationCard";
import LiquidityStressCard from "./LiquidityStressCard";
import ClientPortfolioCard from "./ClientPortfolioCard";

import type { KPIDef } from "../../data/kpis";
import type { Samples } from "../../utils/samples";
import type { useDeribitSkew25D } from "../../hooks/useDeribitSkew25D";
import type { useTermStructureKink } from "../../hooks/useTermStructureKink";
import type { useCondorCreditPctOfEM } from "../../hooks/useCondorCreditPctOfEM";
import type { useIVTermStructure } from "../../hooks/useIVTermStructure";

type SkewState = ReturnType<typeof useDeribitSkew25D>;
type KinkData = ReturnType<typeof useTermStructureKink>["data"];
type CondorState = ReturnType<typeof useCondorCreditPctOfEM>;
type TermStructureData = ReturnType<typeof useIVTermStructure>["data"];

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
  condor: CondorState;
  basis: {
    loading: boolean;
    error: string | null;
    pct?: number | null;
    abs?: number | null;
    ts?: number | null;
  };
};

type Props = {
  kpi: KPIDef;
  context: KpiCardRendererContext;
};

type CardProps = ComponentProps<typeof KpiCard>;

export default function KpiCardRenderer({ kpi, context }: Props) {
  const { samples, locale } = context;

  const baseProps: CardProps = {
    kpi,
    value: samples[kpi.id],
    locale,
  };

  const renderCard = (overrides?: Partial<CardProps>, key = kpi.id) => (
    <KpiCard
      key={key}
      {...baseProps}
      {...overrides}
    />
  );

  if (kpi.id === "atm-iv" && context.dvolPct != null) {
    return renderCard({
      value: `${context.dvolPct.toFixed(1)}%`,
      meta: "DVOL 30D (proxy)",
    });
  }

  if (kpi.id === "ivr" && context.ivr != null) {
    return renderCard({
      value: `${context.ivr}`,
      meta: "DVOL-based IVR",
      extraBadge: context.ivp != null ? `IVP ${context.ivp}` : undefined,
      infoKey: kpi.id,
      guidanceValue: typeof context.ivr === "number" ? context.ivr : null,
    });
  }

  if (kpi.id === "rv" && context.rv.value != null) {
    return renderCard({
      value: `${(context.rv.value * 100).toFixed(1)}%`,
      meta: context.rv.ts ? `20D RV · ${new Date(context.rv.ts).toLocaleDateString()}` : "20D RV",
      extraBadge: context.rv.loading ? "Refreshing…" : null,
    });
  }

  if (kpi.id === "iv-rv-spread" && context.dvolPct != null && context.rv.value != null) {
    const spread = context.dvolPct - (context.rv.value * 100);
    const sign = spread >= 0 ? "+" : "";
    return renderCard({
      value: `${sign}${spread.toFixed(1)}%`,
      meta: "IV − RV",
      extraBadge: `IV ${context.dvolPct.toFixed(1)} • RV ${(context.rv.value * 100).toFixed(1)}`,
    });
  }

  if (kpi.id === "term-structure" && context.termStructure) {
    const tsData = context.termStructure;
    const labelTitle = tsData.label === "insufficient"
      ? "Insufficient"
      : tsData.label[0].toUpperCase() + tsData.label.slice(1);
    const premiumPct = tsData.termPremium != null ? (tsData.termPremium * 100) : null;
    const sign = premiumPct != null && premiumPct >= 0 ? "+" : "";
    const meta = tsData.slopePerYear != null
      ? `Slope ${(tsData.slopePerYear * 100).toFixed(2)}%/yr · n=${tsData.n}`
      : `n=${tsData.n}`;
    const extraBadge = tsData.points.length >= 2
      ? `${tsData.points[0]?.expiryISO} → ${tsData.points[tsData.points.length - 1]?.expiryISO}`
      : "Awaiting data";
    return renderCard({
      value: labelTitle + (premiumPct != null ? ` (${sign}${premiumPct.toFixed(1)}%)` : ""),
      meta,
      extraBadge,
    });
  }

  if (kpi.id === "skew-25d-rr") {
    return (
      <>
        {context.skew.entries.map(({ key, label, state }) => {
          let value = samples[kpi.id];
          let meta: string | undefined;
          let badge: string | null = null;

          if (state?.skew != null) {
            const vp = state.skew * 100;
            const sign = vp >= 0 ? "+" : "";
            value = `${sign}${vp.toFixed(2)}`;
            meta = state.expiryLabel ? `${label} · ${state.expiryLabel}` : label;
            if (state.ivC25 != null && state.ivP25 != null) {
              badge = `C25 ${(state.ivC25 * 100).toFixed(1)} • P25 ${(state.ivP25 * 100).toFixed(1)}`;
            } else {
              badge = "Interpolating…";
            }
          } else if (state?.loading) {
            value = "…";
            meta = `${label} · loading`;
          } else if (state?.error) {
            value = "—";
            meta = `${label} · error`;
          } else {
            meta = label;
          }

          return renderCard({ value, meta, extraBadge: badge }, `${kpi.id}-${key}`);
        })}
      </>
    );
  }

  if (kpi.id === "ts-kink") {
    const { loading, error, data } = context.skew.kink;
    let value = samples[kpi.id];
    let meta: string | undefined;
    let badge: string | null = null;

    if (loading) {
      value = "…";
      meta = "loading";
    } else if (error) {
      value = "—";
      meta = "error";
    } else if (data && typeof data.kinkPoints === "number") {
      const vp = data.kinkPoints * 100;
      const sign = vp >= 0 ? "+" : "";
      value = `${sign}${vp.toFixed(2)}%`;
      meta = `0DTE − mean(1–3DTE)${data.indexPrice ? ` · S ${Math.round(data.indexPrice)}` : ""}`;
      const iv0 = data.iv0dte != null ? (data.iv0dte * 100).toFixed(1) : "—";
      const m13 = data.mean1to3 != null ? (data.mean1to3 * 100).toFixed(1) : "—";
      const ratio = data.kinkRatio != null ? `${data.kinkRatio.toFixed(2)}×` : null;
      badge = ratio ? `0D ${iv0} • 1–3D ${m13} • ${ratio}` : `0D ${iv0} • 1–3D ${m13}`;
    } else {
      meta = "Awaiting data";
    }

    return renderCard({ value, meta, extraBadge: badge });
  }

  if (kpi.id === "rv-em-factor") {
    const { ratio, loading, error, rvAnn, ivAnn, tenorDays } = context.rvem;
    const value = loading ? "…" : (ratio != null ? `${ratio.toFixed(2)}×` : "—");
    const meta = loading ? "loading" : (error ? "error" : `BTC ${tenorDays}D · RV ÷ IV`);
    const extraBadge = (rvAnn != null && ivAnn != null)
      ? `IV ${(ivAnn * 100).toFixed(1)} • RV ${(rvAnn * 100).toFixed(1)}`
      : null;
    return renderCard({ value, meta, extraBadge });
  }

  if (kpi.id === "funding") {
    const { loading, error, current8h, avg7d8h, ts } = context.funding;
    let value = samples[kpi.id];
    let meta: string | undefined;
    let badge: string | null = null;

    if (loading) {
      value = "…";
      meta = "loading";
    } else if (error) {
      value = "—";
      meta = "error";
    } else if (current8h != null) {
      value = `${(current8h * 100).toFixed(3)}%`;
      meta = ts ? `Deribit 8h · ${new Date(ts).toLocaleTimeString()}` : "Deribit 8h";
      if (avg7d8h != null) {
        badge = `7d avg ${(avg7d8h * 100).toFixed(3)}%`;
      }
    } else {
      value = "—";
      meta = "Awaiting data";
    }

    return renderCard({ value, meta, extraBadge: badge });
  }

  if (kpi.id === "em-ribbon") {
    return (
      <div key={kpi.id} className="col-span-full">
        <ExpectedMoveRibbonCard currency="BTC" />
      </div>
    );
  }

  if (kpi.id === "condor-credit-em") {
    const condorState = context.condor;
    let value = samples[kpi.id];
    let meta: string | undefined;
    let badge: string | null = null;

    if (condorState.loading) {
      value = "…";
      meta = "loading";
    } else if (condorState.error) {
      value = "—";
      meta = "error";
    } else if (condorState.data && condorState.data.pctOfEm != null) {
      value = `${(condorState.data.pctOfEm).toFixed(1)}%`;
      const expiryLabel = new Date(condorState.data.expiryTimestamp)
        .toLocaleDateString(locale, { month: "short", day: "numeric" });
      meta = `BTC 30D condor · ${expiryLabel}`;
      if (condorState.data.condorCreditUsd != null && condorState.data.emUsd != null) {
        badge = `Credit $${condorState.data.condorCreditUsd.toFixed(2)} • EM $${condorState.data.emUsd.toFixed(2)}`;
      }
    } else {
      value = "—";
      meta = "Awaiting data";
    }

    return renderCard({ value, meta, extraBadge: badge });
  }

  if (kpi.id === "spot-perp-basis") {
    const { loading, error, pct, abs, ts } = context.basis;
    let value = samples[kpi.id];
    let meta: string | undefined;
    let badge: string | null = null;

    if (loading) {
      value = "…";
      meta = "loading";
    } else if (error) {
      value = "—";
      meta = "error";
    } else if (pct != null) {
      const pctValue = pct * 100;
      const sign = pctValue >= 0 ? "+" : "";
      value = `${sign}${pctValue.toFixed(2)}%`;
      meta = ts ? `BTC spot vs perp · ${new Date(ts).toLocaleTimeString()}` : "BTC spot vs perp";
      if (abs != null && Number.isFinite(abs)) {
        badge = `Δ ${abs >= 0 ? `+$${abs.toFixed(2)}` : `-$${Math.abs(abs).toFixed(2)}`}`;
      }
    } else {
      value = "—";
      meta = "Awaiting data";
    }

    return renderCard({ value, meta, extraBadge: badge });
  }

  if (kpi.id === "gammaWalls") {
    return <GammaWallsCard key={kpi.id} kpi={kpi} />;
  }

  if (kpi.id === "oi-concentration") {
    return (
      <OIConcentrationCard
        key={kpi.id}
        kpi={kpi}
        currency="BTC"
        topN={3}
        expiry="all"
        windowPct={0.25}
        pollMs={0}
      />
    );
  }

  if (kpi.id === "liquidityStress") {
    return (
      <LiquidityStressCard
        key={kpi.id}
        kpi={kpi}
        currency="BTC"
        windowPct={0.005}
        clipSize={10}
        pollMs={0}
      />
    );
  }

  if (kpi.id.startsWith("portfolio-client-")) {
    return (
      <ClientPortfolioCard
        key={kpi.id}
        kpi={kpi}
        locale={locale}
      />
    );
  }

  return renderCard();
}

