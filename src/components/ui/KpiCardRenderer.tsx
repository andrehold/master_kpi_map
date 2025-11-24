import { type ComponentProps } from "react";
import KpiCard from "./KpiCard";
import LiquidityStressCard from "./LiquidityStressCard";
import ClientPortfolioCard from "./ClientPortfolioCard";

import type { KPIDef } from "../../data/kpis";
import type { Samples } from "../../utils/samples";
import type { useDeribitSkew25D } from "../../hooks/domain/useDeribitSkew25D";
import type { useTermStructureKink } from "../../hooks/domain/useTermStructureKink";
import type { useCondorCreditPctOfEM } from "../../hooks/domain/useCondorCreditPctOfEM";
import type { useIVTermStructure } from "../../hooks/domain/useIVTermStructure";
import type { useOpenInterestConcentration } from "../../hooks/domain/useOpenInterestConcentration";
import type { useGammaWalls } from "../../hooks/domain/useGammaWalls";

import { KPI_IDS } from "../../kpi/kpiIds";
import { KpiMiniTable } from "./KpiMiniTable"

type SkewState = ReturnType<typeof useDeribitSkew25D>;
type KinkData = ReturnType<typeof useTermStructureKink>["data"];
type CondorState = ReturnType<typeof useCondorCreditPctOfEM>;
type TermStructureData = ReturnType<typeof useIVTermStructure>["data"];
type OIConcentrationState = ReturnType<typeof useOpenInterestConcentration>;
type GammaWallsState = ReturnType<typeof useGammaWalls>;

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
};

type Props = {
  kpi: KPIDef;
  context: KpiCardRendererContext;
};

type CardProps = ComponentProps<typeof KpiCard>;

const EXPECTED_MOVE_PRIMARY_TENOR = 30;

type ExpectedMoveRow = {
  days: number;
  expiryTs: number | null;
  abs: number | null;
  pct: number | null;
};

export default function KpiCardRenderer({ kpi, context }: Props) {
  const { samples, locale } = context;

  const baseProps: CardProps = {
    kpi,
    value: samples[kpi.id],
    locale,
  };

  const renderCard = (overrides?: Partial<CardProps>, key: string = kpi.id) => (
    <KpiCard
      key={key}
      {...baseProps}
      {...overrides}
    />
  );

  if (kpi.id === KPI_IDS.atmIv && context.dvolPct != null) {
    return renderCard({
      value: `${context.dvolPct.toFixed(1)}%`,
      meta: "DVOL 30D (proxy)",
    });
  }

  if (kpi.id === KPI_IDS.ivr && context.ivr != null) {
    return renderCard({
      value: `${context.ivr}`,
      meta: "DVOL-based IVR",
      extraBadge: context.ivp != null ? `IVP ${context.ivp}` : undefined,
      infoKey: kpi.id,
      guidanceValue: typeof context.ivr === "number" ? context.ivr : null,
    });
  }

  if (kpi.id === KPI_IDS.rv && context.rv.value != null) {
    return renderCard({
      value: `${(context.rv.value * 100).toFixed(1)}%`,
      meta: context.rv.ts ? `20D RV · ${new Date(context.rv.ts).toLocaleDateString()}` : "20D RV",
      extraBadge: context.rv.loading ? "Refreshing…" : null,
    });
  }

  if (kpi.id === KPI_IDS.ivRvSpread && context.dvolPct != null && context.rv.value != null) {
    const spread = context.dvolPct - (context.rv.value * 100);
    const sign = spread >= 0 ? "+" : "";
    return renderCard({
      value: `${sign}${spread.toFixed(1)}%`,
      meta: "IV − RV",
      extraBadge: `IV ${context.dvolPct.toFixed(1)} • RV ${(context.rv.value * 100).toFixed(1)}`,
    });
  }

  if (kpi.id === KPI_IDS.termStructure && context.termStructure) {
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

  if (kpi.id === KPI_IDS.skew25dRr) {
    const entries = context.skew.entries;

    // Prefer 30D as the primary tenor, otherwise first available
    const primary = entries.find((e) => e.key === "30d") ?? entries[0];

    let value: CardProps["value"] = samples[kpi.id];
    let meta: string | undefined;
    let extraBadge: string | null = null;

    if (primary) {
      const { label, state } = primary;

      if (state?.skew != null) {
        const vp = state.skew * 100;
        const sign = vp >= 0 ? "+" : "";
        value = `${sign}${vp.toFixed(2)}`;
        meta = state.expiryLabel ? `${label} · ${state.expiryLabel}` : label;

        if (state.ivC25 != null && state.ivP25 != null) {
          extraBadge = `C25 ${(state.ivC25 * 100).toFixed(1)} • P25 ${(state.ivP25 * 100).toFixed(1)}`;
        } else {
          extraBadge = "Interpolating…";
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
    } else {
      value = "—";
      meta = "Awaiting data";
    }

    // Build table rows for all tenors
    const rows = entries.map(({ key, label, state }) => {
      const id = `${kpi.id}-${key}`;
      const tenorLabel = state?.expiryLabel
        ? `${label} · ${state.expiryLabel}`
        : label;

      let c25 = "—";
      let p25 = "—";
      let rr = "—";

      if (state?.loading && !state.skew) {
        c25 = p25 = rr = "…";
      } else if (state?.error) {
        c25 = p25 = rr = "err";
      } else if (state?.skew != null) {
        rr = `${state.skew >= 0 ? "+" : ""}${(state.skew * 100).toFixed(2)}`;
        if (state.ivC25 != null) c25 = `${(state.ivC25 * 100).toFixed(1)}%`;
        if (state.ivP25 != null) p25 = `${(state.ivP25 * 100).toFixed(1)}%`;
      }

      return { id, label: tenorLabel, c25, p25, rr };
    });

    const footer = (
      <KpiMiniTable
        title="Tenors"
        rows={rows}
        getKey={(r) => r.id}
        columns={[
          { id: "label", header: "Tenor", render: (r) => r.label },
          { id: "c25", header: "C25", align: "right", render: (r) => r.c25 },
          { id: "p25", header: "P25", align: "right", render: (r) => r.p25 },
          { id: "rr", header: "RR", align: "right", render: (r) => r.rr },
        ]}
      />
    );

    return renderCard({ value, meta, extraBadge, footer });
  }


  if (kpi.id === KPI_IDS.tsKink) {
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

  if (kpi.id === KPI_IDS.rvEmFactor) {
    const { ratio, loading, error, rvAnn, ivAnn, tenorDays } = context.rvem;
    const value = loading ? "…" : (ratio != null ? `${ratio.toFixed(2)}×` : "—");
    const meta = loading ? "loading" : (error ? "error" : `BTC ${tenorDays}D · RV ÷ IV`);
    const extraBadge = (rvAnn != null && ivAnn != null)
      ? `IV ${(ivAnn * 100).toFixed(1)} • RV ${(rvAnn * 100).toFixed(1)}`
      : null;
    return renderCard({ value, meta, extraBadge });
  }

  if (kpi.id === KPI_IDS.funding) {
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

  if (kpi.id === KPI_IDS.emRibbon) {
    const emContext = context.expectedMove;
    const rows = emContext?.rows ?? [];
    const sortedRows = [...rows].sort((a, b) => a.days - b.days);
    const primaryRow = sortedRows.find((row) => row.days === EXPECTED_MOVE_PRIMARY_TENOR);

    let value: CardProps["value"] = samples[kpi.id];
    let meta: string | undefined;
    let extraBadge: string | null = null;

    if (!emContext) {
      value = "—";
      meta = "Expected Move unavailable";
    } else if (emContext.loading && !primaryRow) {
      value = "…";
      meta = "loading";
    } else if (emContext.error) {
      value = "—";
      meta = "error";
    } else if (primaryRow) {
      value = formatEmAbsolute(primaryRow.abs, locale) ?? "—";
      meta = `Exp ${formatExpiryLabel(primaryRow.expiryTs, locale)} · ${formatTenorLabel(primaryRow.days)}`;
      const pctBadge = formatEmPercent(primaryRow.pct);
      if (emContext.loading) {
        extraBadge = pctBadge ? `${pctBadge} · updating…` : "Refreshing…";
      } else {
        extraBadge = pctBadge;
      }
    } else {
      value = "—";
      meta = "Awaiting data";
    }

    type EmTableRow = {
      id: string;
      tenor: string;
      expiry: string;
      abs: string;
      pct: string;
    };

    const tableRows: EmTableRow[] = sortedRows
      .filter((row) => row.days !== EXPECTED_MOVE_PRIMARY_TENOR)
      .map((row) => ({
        id: `${kpi.id}-${row.days}`,
        tenor: formatTenorLabel(row.days),
        expiry: formatExpiryLabel(row.expiryTs, locale),
        abs: formatEmAbsolute(row.abs, locale) ?? "—",
        pct: formatEmPercent(row.pct) ?? "—",
      }));

    const footer = (
      <KpiMiniTable<EmTableRow>
        title="Additional tenors"
        rows={tableRows}
        getKey={(r) => r.id}
        emptyLabel="Waiting for data"
        columns={[
          { id: "tenor", header: "Tenor", render: (r) => r.tenor },
          { id: "expiry", header: "Expiry", align: "right", render: (r) => r.expiry },
          { id: "abs", header: "±$ Move", align: "right", render: (r) => r.abs },
          { id: "pct", header: "±%", align: "right", render: (r) => r.pct },
        ]}
      />
    );

    return renderCard({ value, meta, extraBadge, footer });
  }

  if (kpi.id === KPI_IDS.condorCreditEm) {
    const condorState = context.condor;
    let value = samples[kpi.id];
    let meta: string | undefined;
    let badge: string | null = null;
    let guidanceValue: number | null = null;

    if (condorState.loading) {
      value = "…";
      meta = "loading";
    } else if (condorState.error) {
      value = "—";
      meta = "error";
    } else if (condorState.data && condorState.data.pctOfEm != null) {
      const pct = condorState.data.pctOfEm; // already in %
      value = `${pct.toFixed(1)}%`;

      const expiryLabel = new Date(condorState.data.expiryTimestamp)
        .toLocaleDateString(locale, { month: "short", day: "numeric" });

      meta = `BTC 30D condor · ${expiryLabel}`;

      if (
        condorState.data.condorCreditUsd != null &&
        condorState.data.emUsd != null
      ) {
        badge = `Credit $${condorState.data.condorCreditUsd.toFixed(
          2
        )} • EM $${condorState.data.emUsd.toFixed(2)}`;
      }

      guidanceValue = pct; // feed % into the bands
    } else {
      value = "—";
      meta = "Awaiting data";
    }

    return renderCard({
      value,
      meta,
      extraBadge: badge,
      // This key links into KPIS / BAND_BASE via kpis.ts
      infoKey: KPI_IDS.condorCreditEm,
      guidanceValue,
    });
  }


  if (kpi.id === KPI_IDS.spotPerpBasis) {
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

  if (kpi.id === KPI_IDS.gammaWalls) {
    const gw = context.gammaWalls;

    let value: CardProps["value"] = samples[kpi.id];
    let meta: string | undefined;
    let extraBadge: string | null = null;

    if (!gw) {
      value = "—";
      meta = "Gamma walls unavailable";
    } else if (gw.loading) {
      value = "…";
      meta = "loading";
    } else if (gw.error) {
      value = "—";
      meta = "error";
    } else if (gw.top && gw.top.length > 0) {
      const top = gw.top[0];
      value = `${fmtK(top.strike)} • ${fmtUsdShort(top.gex_abs_usd)}`;
      meta = gw.indexPrice
        ? `Near S ${Math.round(gw.indexPrice)}`
        : "Net |GEX| near spot";

      const others = gw.top
        .slice(1)
        .map((t: any) => fmtK(t.strike))
        .join(" • ");
      extraBadge = others ? `Also: ${others}` : null;
    } else {
      value = "—";
      meta = "Awaiting data";
    }

    type GwRow = {
      id: string;
      strike: string;
      size: string;
    };

    let footer: CardProps["footer"];

    if (!gw) {
      footer = (
        <div className="text-xs text-[var(--fg-muted)]">
          Gamma walls unavailable
        </div>
      );
    } else if (gw.error) {
      footer = (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-400">
          Failed to load: {String(gw.error)}
        </div>
      );
    } else if (gw.top && gw.top.length > 0) {
      // top-5 walls by |GEX|, as provided by the hook
      const topWalls = gw.top.slice(0, 5);

      const rows: GwRow[] = topWalls.map((wall: any, idx: number) => ({
        id: `wall-${wall.strike}-${idx}`,
        strike: fmtK(wall.strike),
        size: fmtUsdShort(wall.gex_abs_usd),
      }));

      footer = (
        <KpiMiniTable<GwRow>
          title="Top γ walls"
          rows={rows}
          getKey={(r) => r.id}
          columns={[
            { id: "strike", header: "Strike", render: (r) => r.strike },
            {
              id: "size",
              header: "|GEX| (USD)",
              align: "right",
              render: (r) => r.size,
            },
          ]}
        />
      );
    } else {
      footer = (
        <div className="text-xs text-[var(--fg-muted)]">
          No gamma walls in scope
        </div>
      );
    }

    return renderCard({
      value,
      meta,
      extraBadge,
      footer,
      infoKey: kpi.id,
    });
  }


  if (kpi.id === KPI_IDS.oiConcentration) {
    const { oiConcentration } = context;
    const { loading, error, metrics } = oiConcentration;

    const topN = 3;
    const windowPct = 0.25;

    let value: CardProps["value"] = samples[kpi.id];

    if (loading && !metrics) {
      value = "…";
    } else if (error) {
      value = "—";
    } else if (metrics?.topNShare != null) {
      value = `${(metrics.topNShare * 100).toFixed(1)}%`;
    }

    const meta = (() => {
      if (loading && !metrics) return "loading";
      if (error) return "error";
      if (!metrics) return "Awaiting data";

      const scope =
        metrics.expiryScope === "front"
          ? `Front expiry${
              metrics.frontExpiryTs
                ? ` · ${new Date(metrics.frontExpiryTs).toLocaleDateString()}`
                : ""
            }`
          : "All expiries";

      const s = metrics.indexPrice ? ` · S ${Math.round(metrics.indexPrice)}` : "";
      return `${scope}${s} · n=${metrics.includedCount}`;
    })();

    const win =
      typeof windowPct === "number" && windowPct > 0
        ? ` • Window ±${Math.round(windowPct * 100)}%`
        : "";
    const extraBadge = `Top ${topN}${win}`;

    type OIRow = {
      id: string;
      label: string;
      value: string;
      kind: "strike" | "total";
    };

    let footer: CardProps["footer"];

    if (error) {
      footer = (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-400">
          Failed to load: {String(error)}
        </div>
      );
    } else {
      const ranked = metrics?.rankedStrikes ?? [];
      const topStrikes = ranked.slice(0, 5); // top-5 strikes

      if (!topStrikes.length) {
        footer = (
          <div className="text-xs text-[var(--fg-muted)]">
            No strikes in scope
          </div>
        );
      } else {
        const strikeRows: OIRow[] = topStrikes.map((b) => {
          const share =
            metrics && metrics.totalOi > 0 ? b.oi / metrics.totalOi : 0;
          return {
            id: `strike-${b.strike}`,
            label: `$${Math.round(b.strike)}`,
            value: `${(share * 100).toFixed(1)}%`,
            kind: "strike",
          };
        });

        const totalRows: OIRow[] = [
          {
            id: "total-oi",
            label: "Total OI",
            value:
              metrics?.totalOi != null && isFinite(metrics.totalOi)
                ? `${formatNumber(metrics.totalOi)} BTC`
                : "—",
            kind: "total",
          },
          {
            id: "top-1",
            label: "Top-1",
            value:
              metrics?.top1Share != null
                ? `${(metrics.top1Share * 100).toFixed(1)}%`
                : "—",
            kind: "total",
          },
          {
            id: "hhi",
            label: "HHI",
            value:
              metrics?.hhi != null
                ? `${(metrics.hhi * 100).toFixed(1)}%`
                : "—",
            kind: "total",
          },
        ];

        const rows: OIRow[] = [...strikeRows, ...totalRows];

        footer = (
          <KpiMiniTable<OIRow>
            title="Top strikes"
            rows={rows}
            getKey={(r) => r.id}
            sections={[
              {
                index: strikeRows.length, // <- splitter between strikes and totals
                title: "Totals",
              },
            ]}
            columns={[
              {
                id: "label",
                header: "Strike / metric",
                render: (r) => r.label,
              },
              {
                id: "value",
                header: "Share / value",
                align: "right",
                render: (r) =>
                  r.kind === "total" ? <strong>{r.value}</strong> : r.value,
              },
            ]}
          />
        );
      }
    }

    return renderCard({
      value,
      meta,
      extraBadge,
      footer,
      infoKey: kpi.id,
      guidanceValue:
        metrics?.topNShare != null ? metrics.topNShare * 100 : null,
    });
  }

  if (kpi.id === KPI_IDS.liquidityStress) {
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

function formatNumber(x?: number) {
  if (x == null || !isFinite(x)) return "—";
  if (Math.abs(x) >= 1_000_000_000) return (x / 1_000_000_000).toFixed(2) + "B";
  if (Math.abs(x) >= 1_000_000) return (x / 1_000_000).toFixed(2) + "M";
  if (Math.abs(x) >= 1_000) return (x / 1_000).toFixed(2) + "k";
  return x.toFixed(2);
}

function formatTenorLabel(days: number) {
  if (days === 1) return "1D";
  if (days === 7) return "1W";
  if (days === 30) return "30D";
  if (days === 90) return "3M";
  if (days % 30 === 0) return `${Math.round(days / 30)}M`;
  return `${days}D`;
}

function formatExpiryLabel(expiryTs: number | null, locale: string) {
  if (expiryTs == null || !isFinite(expiryTs)) return "—";
  return new Date(expiryTs).toLocaleDateString(locale, { month: "short", day: "numeric" });
}

function formatEmAbsolute(value: number | null, locale: string) {
  if (value == null || !isFinite(value)) return null;
  const magnitude = Math.abs(value);
  const formatter = new Intl.NumberFormat(locale, {
    maximumFractionDigits: magnitude >= 1000 ? 0 : magnitude >= 100 ? 1 : 2,
  });
  return `±$${formatter.format(value)}`;
}

function formatEmPercent(value: number | null) {
  if (value == null || !isFinite(value)) return null;
  const pct = value * 100;
  const decimals = Math.abs(pct) >= 10 ? 1 : 2;
  return `±${pct.toFixed(decimals)}%`;
}

function fmtK(x: number) {
  return x >= 1000 ? `${Math.round(x / 1000)}k` : `${Math.round(x)}`;
}

function fmtUsdShort(n: number) {
  const a = Math.abs(n);
  if (a >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `$${(n / 1e3).toFixed(0)}k`;
  return `$${n.toFixed(0)}`;
}