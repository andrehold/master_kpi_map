import { type ComponentProps } from "react";
import KpiCard from "./KpiCard";

import type { KPIDef } from "../../data/kpis";
import type { Samples } from "../../utils/samples";

import type { useDeribitSkew25D } from "../../hooks/domain/useDeribitSkew25D";
import type { useTermStructureKink } from "../../hooks/domain/useTermStructureKink";
import type { useCondorCreditPctOfEM } from "../../hooks/domain/useCondorCreditPctOfEM";
import type { useIVTermStructure } from "../../hooks/domain/useIVTermStructure";
import type { useOpenInterestConcentration } from "../../hooks/domain/useOpenInterestConcentration";
import type { useGammaWalls } from "../../hooks/domain/useGammaWalls";

import type { StrikeMapState } from "../../kpi/strikeMapTypes";
import type { StrikeMapTableRow } from "../../kpi/strikeMapTypes";

import {
  useOiConcentrationKpi,
  useGammaWallsKpi,
  useEmRibbonKpi,
  useCondorCreditKpi,
  useStrikeMapKpi,
  useLiquidityStressKpi,
  useIVTermStructureKpi,
  useVixKpi,
  useRealizedVolKpi,
  useIvRvSpreadKpi,
  useHitRateOfExpectedMoveKpi,
  useTimeToFirstBreachKpi,
  useSpotVsSmaKpi,
  useAtmIvKpi,
  useGammaCenterOfMassKpi,
} from "../../hooks/kpi";

import { KPI_IDS } from "../../kpi/kpiIds";
import {
  getClientPortfolioModel,
  type ClientPortfolioRow,
} from "../../kpi/clientPortfolios";
import { KpiMiniTable } from "./KpiMiniTable";

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
  strikeMap?: StrikeMapState;
};

type Props = {
  kpi: KPIDef;
  context: KpiCardRendererContext;
};

type CardProps = ComponentProps<typeof KpiCard>;

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

  const renderCard = (
    overrides?: Partial<CardProps>,
    key: string = kpi.id,
  ) => (
    <KpiCard
      key={key}
      {...baseProps}
      {...overrides}
    />
  );

  if (kpi.id === KPI_IDS.atmIv) {
    const vm = useAtmIvKpi(
      context.termStructure ?? null,
      context.dvolPct ?? null,
      locale
    );

    if (!vm) {
      return renderCard({ meta: "Awaiting ATM IV data" });
    }

    return renderCard({
      value: vm.value ?? undefined,
      meta: vm.meta,
      footer: vm.footer ? (
        <KpiMiniTable
          title={vm.footer.title}
          rows={vm.footer.rows}
          getKey={(r) => r.id}
          columns={[
            { id: "tenor", header: "Tenor", render: (r) => r.tenor },
            { id: "iv", header: "IV", align: "right", render: (r) => r.iv },
            {
              id: "expiry",
              header: "Expiry",
              align: "right",
              render: (r) => r.expiry,
            },
          ]}
        />
      ) : undefined,
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

  if (kpi.id === KPI_IDS.rv) {
    const vm = useRealizedVolKpi({ currency: "BTC" });

    const footer =
      vm.table && (
        <KpiMiniTable
          title={vm.table.title}
          rows={vm.table.rows}
          getKey={(r) => r.id}
          columns={[
            { id: "window", header: "Window", render: (r) => r.windowLabel },
            {
              id: "rv",
              header: "RV (ann.)",
              align: "right",
              render: (r) => r.rv,
            },
            {
              id: "asOf",
              header: "Updated",
              align: "right",
              render: (r) => r.asOf,
            },
          ]}
        />
      );

    return (
      <KpiCard
        kpi={kpi}
        locale={locale}
        value={vm.value}
        meta={vm.meta}
        extraBadge={vm.extraBadge}
        footer={footer}
        infoKey={kpi.id}
        guidanceValue={vm.guidanceValue ?? null}
      />
    );
  }

  if (kpi.id === KPI_IDS.ivRvSpread) {
    const vm = useIvRvSpreadKpi({
      dvolPct: context.dvolPct ?? null,
      currency: "BTC",
    });

    const footer =
      vm.table && (
        <KpiMiniTable
          title={vm.table.title}
          rows={vm.table.rows}
          getKey={(r) => r.id}
          columns={[
            {
              id: "window",
              header: "RV window",
              render: (r) => r.windowLabel,
            },
            {
              id: "rv",
              header: "RV (ann.)",
              align: "right",
              render: (r) => r.rv,
            },
            {
              id: "spread",
              header: "IV − RV",
              align: "right",
              render: (r) => r.spread,
            },
          ]}
        />
      );

    return (
      <KpiCard
        kpi={kpi}
        locale={locale}
        value={vm.value}
        meta={vm.meta}
        extraBadge={vm.extraBadge}
        footer={footer}
        infoKey={kpi.id}
        guidanceValue={vm.guidanceValue ?? null}
      />
    );
  }

  if (kpi.id === KPI_IDS.termStructure) {
    const model = useIVTermStructureKpi(context.termStructure ?? null, locale);
    if (!model) {
      return renderCard({
        meta: "Awaiting term structure data",
      });
    }

    const footerHasRows =
      model.footer &&
      Array.isArray(model.footer.rows) &&
      model.footer.rows.length > 0;

    return renderCard({
      value: model.value,
      meta: model.meta,
      extraBadge: model.extraBadge,
      footer: footerHasRows ? (
        <KpiMiniTable
          title={model.footer?.title}
          rows={model.footer?.rows ?? []}
          getKey={(r) => r.id}
          columns={[
            { id: "tenor", header: "Tenor", render: (r) => r.tenor },
            {
              id: "iv",
              header: "IV",
              align: "right",
              render: (r) => r.iv,
            },
            {
              id: "expiry",
              header: "Expiry",
              align: "right",
              render: (r) => r.expiry,
            },
          ]}
        />
      ) : undefined,
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
        meta = state.expiryLabel
          ? `${label} · ${state.expiryLabel}`
          : label;

        if (state.ivC25 != null && state.ivP25 != null) {
          extraBadge = `C25 ${(state.ivC25 * 100).toFixed(1)} • P25 ${(state.ivP25 * 100).toFixed(
            1,
          )}`;
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
      meta = `0DTE − mean(1–3DTE)${data.indexPrice ? ` · S ${Math.round(data.indexPrice)}` : ""
        }`;
      const iv0 =
        data.iv0dte != null ? (data.iv0dte * 100).toFixed(1) : "—";
      const m13 =
        data.mean1to3 != null ? (data.mean1to3 * 100).toFixed(1) : "—";
      const ratio =
        data.kinkRatio != null ? `${data.kinkRatio.toFixed(2)}×` : null;
      badge = ratio
        ? `0D ${iv0} • 1–3D ${m13} • ${ratio}`
        : `0D ${iv0} • 1–3D ${m13}`;
    } else {
      meta = "Awaiting data";
    }

    return renderCard({ value, meta, extraBadge: badge });
  }

  if (kpi.id === KPI_IDS.rvEmFactor) {
    const { ratio, loading, error, rvAnn, ivAnn, tenorDays } = context.rvem;
    const value = loading
      ? "…"
      : ratio != null
        ? `${ratio.toFixed(2)}×`
        : "—";
    const meta = loading
      ? "loading"
      : error
        ? "error"
        : `BTC ${tenorDays}D · RV ÷ IV`;
    const extraBadge =
      rvAnn != null && ivAnn != null
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
      meta = ts
        ? `Deribit 8h · ${new Date(ts).toLocaleTimeString()}`
        : "Deribit 8h";
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
    const vm = useEmRibbonKpi(context.expectedMove, locale);

    let footer: CardProps["footer"];

    if (vm.table) {
      type EmTableRow = (typeof vm.table.rows)[number];

      footer = (
        <KpiMiniTable<EmTableRow>
          title={vm.table.title}
          rows={vm.table.rows}
          getKey={(r) => r.id}
          emptyLabel={vm.table.emptyLabel}
          columns={[
            { id: "tenor", header: "Tenor", render: (r) => r.tenor },
            {
              id: "expiry",
              header: "Expiry",
              align: "right",
              render: (r) => r.expiry,
            },
            {
              id: "abs",
              header: "±$ Move",
              align: "right",
              render: (r) => r.abs,
            },
            {
              id: "pct",
              header: "±%",
              align: "right",
              render: (r) => r.pct,
            },
          ]}
        />
      );
    }

    return renderCard({
      value: vm.value,
      meta: vm.meta,
      extraBadge: vm.extraBadge ?? null,
      footer,
    });
  }

  if (kpi.id === KPI_IDS.condorCreditEm) {
    const vm = useCondorCreditKpi(context.condor);

    let footer: CardProps["footer"];

    if (vm.legsTable) {
      type Row = (typeof vm.legsTable.rows)[number];

      footer = (
        <KpiMiniTable<Row>
          title={vm.legsTable.title}
          rows={vm.legsTable.rows}
          getKey={(r) => r.id}
          sections={vm.legsTable.sections}
          columns={[
            { id: "legLabel", header: "Leg", render: (r) => r.legLabel },
            {
              id: "strike",
              header: "Strike",
              align: "right",
              render: (r) => r.strike,
            },
            {
              id: "distPct",
              header: "Dist",
              align: "right",
              render: (r) => r.distPct,
            },
            {
              id: "delta",
              header: "Δ",
              align: "right",
              render: (r) => r.delta,
            },
            {
              id: "premium",
              header: "Premium",
              align: "right",
              render: (r) => r.premium,
            },
          ]}
        />
      );
    }

    return renderCard({
      value: vm.value,
      meta: vm.meta,
      extraBadge: vm.extraBadge ?? null,
      infoKey: KPI_IDS.condorCreditEm,
      guidanceValue: vm.guidanceValue ?? null,
      footer,
    });
  }

  // --- Hit Rate of Expected Move ---------------------------------------------
  if (kpi.id === KPI_IDS.emHitRate) {
    const vm = useHitRateOfExpectedMoveKpi("BTC", {
      horizonDays: 1,
      lookbackDays: 30,
    });

    let value: CardProps["value"] = vm.formatted;
    let meta: string | undefined = vm.message ?? "Hit rate of 1D expected move";
    let extraBadge: string | null = null;
    let footer: CardProps["footer"];
    let guidanceValue: number | null = null;

    if (vm.status === "loading") {
      value = "…";
      meta = "loading";
      extraBadge = "Awaiting data";
    } else if (vm.status === "error") {
      value = "—";
      meta = vm.errorMessage ?? "error";
      extraBadge = "Error";
    } else {
      // status === "ready"
      if (vm.meta) {
        const { horizonDays, lookbackDays, hits, misses, total } = vm.meta;

        // --- compute guidance value for the little bar ---
        if (typeof hits === "number" && typeof total === "number" && total > 0) {
          guidanceValue = (hits / total) * 100; // 0–100 %
          extraBadge = `${hits}/${total} within EM`;
        } else {
          extraBadge = "Awaiting data";
        }

        type Row = { id: string; label: string; value: string };

        const rows: Row[] = [
          {
            id: "horizon",
            label: "Horizon",
            value: `${horizonDays}D`,
          },
          {
            id: "lookback",
            label: "Lookback window",
            value: `${lookbackDays}D`,
          },
          {
            id: "hits",
            label: "Within EM",
            value: String(hits),
          },
          {
            id: "misses",
            label: "Outside EM",
            value: String(misses),
          },
          {
            id: "total",
            label: "Evaluated intervals",
            value: String(total),
          },
        ];

        footer = (
          <KpiMiniTable<Row>
            title="Hit rate stats"
            rows={rows}
            getKey={(r) => r.id}
            columns={[
              { id: "label", header: "Metric", render: (r) => r.label },
              {
                id: "value",
                header: "Value",
                align: "right",
                render: (r) => r.value,
              },
            ]}
          />
        );
      } else {
        extraBadge = "Awaiting data";
      }
    }

    return renderCard({
      value,
      meta,
      extraBadge,
      footer,
      infoKey: KPI_IDS.emHitRate,  // turns guidance on
      guidanceValue,               // <- now a real 0–100 number
    });
  }
  // ---------------------------------------------------------------------------

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
      meta = ts
        ? `BTC spot vs perp · ${new Date(ts).toLocaleTimeString()}`
        : "BTC spot vs perp";
      if (abs != null && Number.isFinite(abs)) {
        badge = `Δ ${abs >= 0 ? `+$${abs.toFixed(2)}` : `-$${Math.abs(abs).toFixed(2)}`
          }`;
      }
    } else {
      value = "—";
      meta = "Awaiting data";
    }

    return renderCard({ value, meta, extraBadge: badge });
  }

  if (kpi.id === KPI_IDS.spotVsSma) {
    const vm = useSpotVsSmaKpi("BTC");

    let value: CardProps["value"] = vm.value ?? samples[kpi.id];
    let meta: string | undefined = vm.meta;
    let extraBadge: string | null = vm.extraBadge ?? null;

    if (vm.status === "loading") {
      value = "…";
      meta = "loading";
      extraBadge = "Fetching SMAs…";
    } else if (vm.status === "error") {
      value = "—";
      meta = vm.errorMessage ?? "error";
      extraBadge = "Error";
    }

    const footer =
      vm.rows && vm.rows.length > 0 ? (
        <KpiMiniTable
          title="Spot vs SMAs"
          rows={vm.rows}
          getKey={(r) => r.id}
          columns={[
            {
              id: "tenor",
              header: "Tenor",
              render: (r) => `${r.tenor}D`,
            },
            {
              id: "text",
              header: "Status",
              align: "right",
              render: (r) => r.text,
            },
          ]}
        />
      ) : undefined;

    return renderCard({
      value,
      meta,
      extraBadge,
      footer,
      infoKey: kpi.id,
    });
  }

  if (kpi.id === KPI_IDS.gammaWalls) {
    const vm = useGammaWallsKpi(context.gammaWalls);

    let footer: CardProps["footer"];

    if (vm.status === "error") {
      footer = (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-400">
          Failed to load: {vm.errorMessage ?? "Unknown error"}
        </div>
      );
    } else if (
      vm.status === "unavailable" ||
      vm.status === "loading" ||
      vm.status === "empty"
    ) {
      footer = (
        <div className="text-xs text-[var(--fg-muted)]">
          {vm.message ??
            (vm.status === "unavailable"
              ? "Gamma walls unavailable"
              : vm.status === "loading"
                ? "Loading gamma walls…"
                : "No gamma walls in scope")}
        </div>
      );
    } else {
      // status === "ok"
      type GwRow = NonNullable<typeof vm.rows>[number];
      const rows = vm.rows ?? [];

      footer =
        rows.length > 0 ? (
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
        ) : (
          <div className="text-xs text-[var(--fg-muted)]">
            No gamma walls in scope
          </div>
        );
    }

    return renderCard({
      value: vm.value,
      meta: vm.meta,
      extraBadge: vm.extraBadge ?? null,
      footer,
      infoKey: kpi.id,
      guidanceValue: vm.guidanceValue ?? null,
    });
  }

  if (kpi.id === KPI_IDS.oiConcentration) {
    const vm = useOiConcentrationKpi({ topN: 3, windowPct: 0.25 });

    const footer =
      vm.table && (
        <KpiMiniTable
          title={vm.table.title}
          rows={vm.table.rows}
          getKey={(r) => r.id}
          sections={vm.table.sections}
          columns={[
            {
              id: "label",
              header: "Strike / metric",
              render: (r) => r.label,
            },
            {
              id: "value",
              header: "% of OI / value",
              align: "right",
              render: (r) => r.value,
            },
          ]}
        />
      );

    return (
      <KpiCard
        kpi={kpi}
        locale={locale}
        value={vm.value}
        meta={vm.meta}
        extraBadge={vm.extraBadge}
        footer={footer}
        infoKey={kpi.id}
        guidanceValue={vm.guidanceValue}
      />
    );
  }

  if (kpi.id === KPI_IDS.liquidityStress) {
    const vm = useLiquidityStressKpi({
      currency: "BTC",
      windowPct: 0.005, // ±0.5%
      clipSize: 10, // 10 BTC notional clip
      pollMs: 0, // no polling from the card
    });

    let footer: CardProps["footer"];

    if (vm.table) {
      type Row = (typeof vm.table.rows)[number];

      footer = (
        <KpiMiniTable<Row>
          title={vm.table.title}
          rows={vm.table.rows}
          getKey={(r) => r.id}
          sections={vm.table.sections}
          columns={[
            {
              id: "label",
              header: "Market",
              render: (r) => r.label,
            },
            {
              id: "spread",
              header: "Spread",
              align: "right",
              render: (r) => r.spread,
            },
            {
              id: "depth",
              header: "Depth",
              align: "right",
              render: (r) => r.depth,
            },
            {
              id: "stress",
              header: "Stress",
              align: "right",
              render: (r) => r.stress,
            },
          ]}
        />
      );
    } else if (vm.footerMessage) {
      footer = (
        <div className="text-xs text-[var(--fg-muted)]">
          {vm.footerMessage}
        </div>
      );
    }

    return renderCard({
      value: vm.value,
      meta: vm.meta,
      extraBadge: vm.extraBadge ?? null,
      footer,
      infoKey: kpi.id,
      guidanceValue: vm.guidanceValue ?? null,
    });
  }

  if (typeof kpi.id === "string" && kpi.id.startsWith("portfolio-client-")) {
    const model = getClientPortfolioModel(kpi.id);

    if (!model) {
      return renderCard({
        value: "—",
        meta: "No client config found",
      });
    }

    const footer = (
      <KpiMiniTable<ClientPortfolioRow>
        title="PnL & Greeks vs limits"
        rows={model.rows}
        getKey={(r) => r.id}
        columns={[
          {
            id: "metric",
            header: "Metric",
            render: (r) => r.metric,
          },
          {
            id: "value",
            header: "Value",
            align: "right",
            render: (r) => (
              <span className="tabular-nums">{r.actual}</span>
            ),
          },
          {
            id: "threshold",
            header: "Threshold",
            align: "right",
            render: (r) => (
              <span className="inline-flex items-center gap-1 tabular-nums">
                {r.threshold}
                <span
                  className={[
                    "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium border",
                    r.ok
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                      : "border-red-500/40 bg-red-500/10 text-red-400",
                  ].join(" ")}
                  aria-label={r.ok ? "Within limit" : "Limit breached"}
                >
                  {r.ok ? "OK" : "Breach"}
                </span>
              </span>
            ),
          },
        ]}
      />
    );

    const meta = model.baseCurrency
      ? `Base: ${model.baseCurrency}${model.notes ? ` • ${model.notes}` : ""
      }`
      : model.notes;

    return renderCard({
      value: `${model.pnlPct.toFixed(2)}%`,
      meta,
      extraBadge: model.health,
      footer,
    });
  }

  if (kpi.id === KPI_IDS.strikeMap) {
    const vm = useStrikeMapKpi(
      context.gammaWalls,
      context.oiConcentration,
      locale,
    );

    let footer: CardProps["footer"];

    if (vm.status === "error") {
      footer = (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-400">
          Failed to build strike map: {vm.errorMessage ?? "Unknown error"}
        </div>
      );
    } else if (
      vm.status === "unavailable" ||
      vm.status === "loading" ||
      vm.status === "empty"
    ) {
      footer = (
        <div className="text-xs text-[var(--fg-muted)]">
          {vm.message ??
            (vm.status === "unavailable"
              ? "Strike map unavailable"
              : vm.status === "loading"
                ? "Loading support/resistance…"
                : "No significant levels in scope")}
        </div>
      );
    } else {
      // status === "ok"
      const rows = vm.table?.rows ?? [];

      footer =
        rows.length > 0 ? (
          <KpiMiniTable<StrikeMapTableRow>
            title={vm.table?.title ?? "Key S/R levels"}
            rows={rows}
            getKey={(r) => `${r.section}-${r.label}-${r.strike}`}
            columns={[
              {
                id: "section",
                header: "Side",
                render: (r) =>
                  r.section === "support" ? "Support" : "Resistance",
              },
              {
                id: "label",
                header: "Level",
                render: (r) => r.label,
              },
              {
                id: "strike",
                header: "Strike",
                align: "right",
                render: (r) => {
                  const v = r.strike;
                  if (typeof v !== "number" || !Number.isFinite(v)) {
                    return "—";
                  }
                  return v.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  });
                },
              },
              {
                id: "score",
                header: "Score",
                align: "right",
                render: (r) => {
                  const v = r.score;
                  if (typeof v !== "number" || !Number.isFinite(v)) {
                    return "—";
                  }
                  return `${Math.round(v * 100)}%`;
                },
              },
            ]}
          />
        ) : (
          <div className="text-xs text-[var(--fg-muted)]">
            No significant levels in scope
          </div>
        );
    }

    return renderCard({
      value: vm.value,
      meta: vm.meta,
      extraBadge: vm.extraBadge ?? null,
      footer,
      infoKey: kpi.id,
      guidanceValue: vm.guidanceValue ?? null,
    });
  }

  if (kpi.id === KPI_IDS.gammaCenterOfMass) {
    const vm = useGammaCenterOfMassKpi();

    let value: CardProps["value"] = vm.value ?? samples[kpi.id];
    let meta: string | undefined = vm.meta;
    let extraBadge: string | null = vm.extraBadge ?? null;
    let footer: CardProps["footer"];

    if (vm.status === "loading") {
      value = "…";
      meta = "loading";
      extraBadge = "Computing Γ-COM…";
    } else if (vm.status === "error") {
      value = "—";
      meta = vm.errorMessage ?? "error";
      extraBadge = "Error";
    } else if (!vm.value) {
      // ready but no usable number yet
      value = "—";
      meta = "Awaiting data";
    }

    if (vm.footer) {
      type Row = (typeof vm.footer.rows)[number];

      footer = (
        <KpiMiniTable<Row>
          title={vm.footer.title}
          rows={vm.footer.rows}
          getKey={(r) => r.id}
          columns={[
            {
              id: "label",
              header: "Metric",
              render: (r) => r.label,
            },
            {
              id: "value",
              header: "Value",
              align: "right",
              render: (r) => r.value,
            },
          ]}
        />
      );
    }

    return renderCard({
      value,
      meta,
      extraBadge,
      footer,
      infoKey: KPI_IDS.gammaCenterOfMass,
      guidanceValue: vm.guidanceValue ?? null, // drives the bands bar
    });
  }

  if (kpi.id === KPI_IDS.vix) {
    const vm = useVixKpi();

    let value: CardProps["value"] = samples[kpi.id];
    let meta: string | undefined = vm.meta;
    let extraBadge: string | null = vm.extraBadge ?? null;

    if (vm.status === "loading") {
      value = "…";
      meta = "loading";
    } else if (vm.status === "error") {
      value = "—";
      meta = vm.errorMessage ?? "error";
    } else if (vm.value != null) {
      value = vm.value; // already formatted e.g. "18.3"
      // meta already includes FRED + date
    } else {
      value = "—";
      meta = "Awaiting data";
    }

    return renderCard({
      value,
      meta,
      extraBadge,
      infoKey: KPI_IDS.vix,
      guidanceValue: vm.guidanceValue ?? null, // drives bandsId="vix"
    });
  }

  // --- Time to First EM Breach -----------------------------------------------
  if (kpi.id === KPI_IDS.timeToFirstBreach) {
    const vm = useTimeToFirstBreachKpi("BTC", {
      horizonDays: 1,
      lookbackDays: 30,
    });

    let value: CardProps["value"] = vm.formatted;
    let meta: string | undefined =
      vm.message ?? "Avg time to first EM breach (1D horizon)";
    let extraBadge: string | null = null;
    let footer: CardProps["footer"];
    let guidanceValue: number | null = null;

    if (vm.status === "loading") {
      value = "…";
      meta = "loading";
      extraBadge = "Awaiting data";
    } else if (vm.status === "error") {
      value = "—";
      meta = vm.errorMessage ?? "error";
      extraBadge = "Error";
    } else {
      // status === "ready"
      if (vm.meta) {
        const {
          horizonDays,
          lookbackDays,
          total,
          withBreach,
          withoutBreach,
          avgBreachTimePct,
        } = vm.meta;

        if (
          typeof avgBreachTimePct === "number" &&
          Number.isFinite(avgBreachTimePct)
        ) {
          guidanceValue = avgBreachTimePct; // 0–100 %
        }

        extraBadge =
          total > 0 ? `${withBreach}/${total} with breach` : "Awaiting data";

        type Row = { id: string; label: string; value: string };

        const rows: Row[] = [
          {
            id: "horizon",
            label: "Horizon",
            value: `${horizonDays}D`,
          },
          {
            id: "lookback",
            label: "Lookback window",
            value: `${lookbackDays}D`,
          },
          {
            id: "total",
            label: "Evaluated intervals",
            value: String(total),
          },
          {
            id: "withBreach",
            label: "With breach",
            value: String(withBreach),
          },
          {
            id: "withoutBreach",
            label: "No breach",
            value: String(withoutBreach),
          },
          {
            id: "avgTime",
            label: "Avg time to breach",
            value: Number.isFinite(avgBreachTimePct)
              ? `${avgBreachTimePct.toFixed(0)}%`
              : "n/a",
          },
        ];

        footer = (
          <KpiMiniTable<Row>
            title="Breach timing stats"
            rows={rows}
            getKey={(r) => r.id}
            columns={[
              { id: "label", header: "Metric", render: (r) => r.label },
              {
                id: "value",
                header: "Value",
                align: "right",
                render: (r) => r.value,
              },
            ]}
          />
        );
      } else {
        extraBadge = "Awaiting data";
      }
    }

    return renderCard({
      value,
      meta,
      extraBadge,
      footer,
      infoKey: KPI_IDS.timeToFirstBreach,
      guidanceValue,
    });
  }

  return renderCard();
}
