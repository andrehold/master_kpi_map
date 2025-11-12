import { useMemo, useState, useEffect, useRef } from "react";
import { TokenStyles, TOKENS, ThemeKey } from "./theme/tokens";
import HeaderBar from "./components/ui/HeaderBar";
import ControlsBar from "./components/ui/ControlsBar";
import GroupHeader from "./components/ui/GroupHeader";
import KpiCard from "./components/ui/KpiCard";
import ExpectedMoveRibbonCard from "./components/ExpectedMoveRibbonCard";

import { STRATEGIES, type Strategy, KPI_GROUPS } from "./data/kpis";
import { buildSamples, type Samples } from "./utils/samples";

import { useDeribitDvol } from "./hooks/useDeribitDvol";
import { useIvrFromDvol } from "./hooks/useIvrFromDvol";
import { useIVTermStructure } from "./hooks/useIVTermStructure";
import { useDeribitSkew25D } from "./hooks/useDeribitSkew25D";
import { useTermStructureKink } from "./hooks/useTermStructureKink";
import { useRealizedVol } from "./hooks/useRealizedVol";
import { useRvEmFactor } from "./hooks/useRvEmFactor";
import { useDeribitIndexPrice } from "./hooks/useDeribitIndexPrice";
import { useDeribitFunding } from "./hooks/useDeribitFunding";
import { useDeribitBasis } from "./hooks/useDeribitBasis";
import GammaWallsCard from "./components/ui/GammaWallsCard";
import OIConcentrationCard from "./components/ui/OIConcentrationCard";

// ▼ Add guidance UI
import { GuidanceSwitch, KpiGuidance } from "./components/ui/Guidance";

export default function MasterKPIMapDemo() {
  const [search, setSearch] = useState("");
  const [activeStrategies, setActiveStrategies] = useState<Strategy[]>([]);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    KPI_GROUPS.forEach((g) => { init[g.id] = true; });
    return init;
  });
  const [samples, setSamples] = useState<Samples>(() => buildSamples(KPI_GROUPS));
  const [theme, setTheme] = useState<ThemeKey>("light");
  const [isUpdating, setIsUpdating] = useState(false);
  const RVEM_TENOR_DAYS = 20;
  const locale = "en"; // adjust or wire to your i18n state

  // Live data (BTC by default)
  const { valuePct: dvolPct, lastUpdated: dvolTs, loading: dvolLoading, error: dvolError, refresh: refreshDvol } = useDeribitDvol("BTC");
  const { ivr, ivp, lastUpdated: ivrTs, loading: ivrLoading, error: ivrError, refresh: refreshIvr } = useIvrFromDvol("BTC");

  // IV Term Structure
  const { data: tsData, loading: tsLoading, error: tsError, reload: refreshTerm } = useIVTermStructure({
    currency: "BTC",
    maxExpiries: 6,
    bandPct: 0.07,
    minDteHours: 12,
  });

  // Skew (25Δ RR) – multi-tenor
  const skew7  = useDeribitSkew25D({ currency: "BTC", targetDays: 7  });
  const skew30 = useDeribitSkew25D({ currency: "BTC", targetDays: 30 });
  const skew60 = useDeribitSkew25D({ currency: "BTC", targetDays: 60 });
  const skewLoadingAny = !!(skew7.loading || skew30.loading || skew60.loading);
  const skewErrorAny   = skew7.error || skew30.error || skew60.error;

  const { data: skData, loading: skLoading, error: skError, refresh: refreshSK } = useTermStructureKink("BTC", { pollMs: 0 });
  const {
    value: rvemRatio,
    rvAnn,
    ivAnn,
    loading: rvemLoading,
    error: rvemError,
  } = useRvEmFactor({ currency: "BTC", days: RVEM_TENOR_DAYS });
  const { price: indexPrice, lastUpdated: indexTs, loading: indexLoading, error: indexError } = useDeribitIndexPrice("BTC", 15000);
  const {
    basisPct: basisPctPerp,
    basisAbs: basisAbsPerp,
    annualizedPct: basisAnnPerp, // will be null for PERPETUAL
    lastUpdated: basisTs,
    loading: basisLoading,
    error: basisError,
    refresh: refreshBasis,
  } = useDeribitBasis("BTC", "BTC-PERPETUAL", 15000);

  // RV 20D (BTC)
  const { rv: rv20d, lastUpdated: rvTs, loading: rvLoading, error: rvError, refresh: refreshRV } =
    useRealizedVol({ currency: "BTC", windowDays: 20, resolutionSec: 86400, annualizationDays: 365 });

  // Funding (BTC perpetual)
  const { current8h, avg7d8h, zScore, updatedAt: fundingTs, loading: fundingLoading, error: fundingError, refresh: refreshFunding } =
    useDeribitFunding("BTC-PERPETUAL");

  useEffect(() => { setSamples(buildSamples(KPI_GROUPS)); }, []);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return KPI_GROUPS.map((group) => {
      const kpis = group.kpis.filter((k) => {
        const matchesText = !q || k.name.toLowerCase().includes(q) || k.id.toLowerCase().includes(q);
        const matchesStrategy = activeStrategies.length === 0 || activeStrategies.some((s) => (k.strategies ?? []).includes(s));

        return matchesText && matchesStrategy;
      });
      return { ...group, kpis };
    }).filter((g) => g.kpis.length > 0);
  }, [search, activeStrategies]);

  const totalKpis = KPI_GROUPS.reduce((acc, g) => acc + g.kpis.length, 0);
  const visibleKpis = filteredGroups.reduce((acc, g) => acc + g.kpis.length, 0);

  function toggleStrategy(s: Strategy) {
    setActiveStrategies((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }
  function toggleGroup(id: string) { setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] })); }
  function regenerate() { setSamples(buildSamples(KPI_GROUPS)); }

  function exportJSON() {
    const payload = {
      generated_at: new Date().toISOString(),
      strategies: STRATEGIES,
      groups: KPI_GROUPS.map((g) => ({
        id: g.id,
        title: g.title,
        kpis: g.kpis.map((k) => ({ id: k.id, name: k.name, strategies: k.strategies, value: samples[k.id] })),
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `master-kpi-map-sample-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  async function refreshLive() {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      try { await refreshDvol(); } catch {}
      await new Promise(r => setTimeout(r, 120));
      try { await refreshIvr(); } catch {}
      await new Promise(r => setTimeout(r, 120));
      try { await refreshRV(); } catch {}
      await new Promise(r => setTimeout(r, 120));
      try { await refreshFunding(); } catch {}
      try { await refreshBasis(); } catch {}
      await new Promise(r => setTimeout(r, 120));

      await new Promise(r => setTimeout(r, 150));
      try { await refreshTerm(); } catch {}
      await new Promise(r => setTimeout(r, 150));
      try { refreshSK(); } catch {}

      await new Promise(r => setTimeout(r, 150));
      skew7.refresh?.(); await new Promise(r => setTimeout(r, 150));
      skew30.refresh?.(); await new Promise(r => setTimeout(r, 150));
      skew60.refresh?.();
    } finally {
      setIsUpdating(false);
    }
  }

  const errorText =
    (dvolError || ivrError || tsError || skewErrorAny || skError || rvError || indexError || fundingError) || null;

  const loadingAny = dvolLoading || ivrLoading || tsLoading || skewLoadingAny || skLoading || fundingLoading;

  // Store drawer refs by KPI id (used to open the drawer from the card info button)
  const guidanceRefs = useRef<Record<string, any>>({});

  return (
    <div data-theme="tm" style={{ colorScheme: TOKENS[theme].colorScheme as any }} className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      <TokenStyles theme={theme} />

      <HeaderBar
        theme={theme}
        setTheme={setTheme}
        visibleKpis={visibleKpis}
        totalKpis={totalKpis}
        groupsCount={filteredGroups.length}
        indexPrice={indexPrice}
        indexTs={indexTs ?? undefined}
        errorText={typeof errorText === "string" ? errorText : null}
        onRegenerate={regenerate}
        onRefreshLive={refreshLive}
        onExportJSON={exportJSON}
        loadingAny={!!loadingAny}
      />

      <main className="mx-auto max-w-7xl px-4 py-6">
        <ControlsBar
          search={search}
          setSearch={setSearch}
          activeStrategies={activeStrategies}
          toggleStrategy={toggleStrategy}
        />

        {/* Global guidance mini-bar toggle */}
        <div className="flex justify-end mb-2">
          <GuidanceSwitch />
        </div>

        <div className="space-y-4">
          {filteredGroups.map((group) => (
            <section key={group.id}>
              <GroupHeader title={group.title} open={openGroups[group.id]} onToggle={() => toggleGroup(group.id)} />
              {openGroups[group.id] && (
                <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {group.kpis.map((kpi) => {
                    let value = samples[kpi.id];
                    let meta: string | undefined = undefined;
                    let extraBadge: string | null = null;
                    let infoKeyProp: string | undefined;
                    let guidanceVal: number | null = null;

                    if (kpi.id === "atm-iv" && dvolPct != null) {
                      value = `${dvolPct.toFixed(1)}%`;
                      meta = "DVOL 30D (proxy)";
                    }

                    if (kpi.id === "ivr" && ivr != null) {
                      value = `${ivr}`;
                      meta = "DVOL-based IVR";
                      if (ivp != null) extraBadge = `IVP ${ivp}`;
                    
                      // enable drawer for this KPI
                      infoKeyProp = kpi.id;
                      guidanceVal = typeof ivr === "number" ? ivr : null;
                    }

                    if (kpi.id === "rv" && rv20d != null) {
                      value = `${(rv20d * 100).toFixed(1)}%`;
                      meta = rvTs ? `20D RV · ${new Date(rvTs).toLocaleDateString()}` : "20D RV";
                      extraBadge = rvLoading ? "Refreshing…" : null;
                    }
                    if (kpi.id === "iv-rv-spread" && dvolPct != null && rv20d != null) {
                      const spread = dvolPct - (rv20d * 100);
                      const sign = spread >= 0 ? "+" : "";
                      value = `${sign}${spread.toFixed(1)}%`;
                      meta = "IV − RV";
                      extraBadge = `IV ${dvolPct.toFixed(1)} • RV ${(rv20d * 100).toFixed(1)}`;
                    }
                    if (kpi.id === "term-structure" && tsData) {
                      const labelTitle = tsData.label === "insufficient" ? "Insufficient" : tsData.label[0].toUpperCase() + tsData.label.slice(1);
                      const premiumPct = tsData.termPremium != null ? (tsData.termPremium * 100) : null;
                      const sign = premiumPct != null && premiumPct >= 0 ? "+" : "";
                      value = labelTitle + (premiumPct != null ? ` (${sign}${premiumPct.toFixed(1)}%)` : "");
                      meta = tsData.slopePerYear != null ? `Slope ${(tsData.slopePerYear * 100).toFixed(2)}%/yr · n=${tsData.n}` : `n=${tsData.n}`;
                      if (tsData.points.length >= 2) {
                        const first = tsData.points[0]?.expiryISO;
                        const last = tsData.points[tsData.points.length - 1]?.expiryISO;
                        extraBadge = `${first} → ${last}`;
                      } else {
                        extraBadge = "Awaiting data";
                      }
                    }
                    if (kpi.id === "skew-25d-rr") {
                      const tenors = [
                        { key: "7d",  label: "BTC 7D",  s: skew7  },
                        { key: "30d", label: "BTC 30D", s: skew30 },
                        { key: "60d", label: "BTC 60D", s: skew60 },
                      ];
                      return (
                        <>
                          {tenors.map(({ key, label, s }) => {
                            let v = samples[kpi.id];
                            let m: string | undefined = undefined;
                            let b: string | null = null;
                            if (s?.skew != null) {
                              const vp = s.skew * 100;
                              const sign = vp >= 0 ? "+" : "";
                              v = `${sign}${vp.toFixed(2)}`;
                              m = s.expiryLabel ? `${label} · ${s.expiryLabel}` : label;
                              if (s.ivC25 != null && s.ivP25 != null) {
                                b = `C25 ${(s.ivC25 * 100).toFixed(1)} • P25 ${(s.ivP25 * 100).toFixed(1)}`;
                              } else {
                                b = "Interpolating…";
                              }
                            } else if (s?.loading) {
                              v = "…"; m = `${label} · loading`;
                            } else if (s?.error) {
                              v = "—"; m = `${label} · error`;
                            } else {
                              m = label;
                            }
                            return <KpiCard key={`${kpi.id}-${key}`} kpi={kpi} value={v} meta={m} extraBadge={b}/>;
                          })}
                        </>
                      );
                    }
                    if (kpi.id === "ts-kink") {
                      let v = samples[kpi.id];
                      let m: string | undefined = undefined;
                      let b: string | null = null;
                      if (skLoading) { v = "…"; m = "loading"; }
                      else if (skError) { v = "—"; m = "error"; }
                      else if (skData && typeof skData.kinkPoints === "number") {
                        const vp = skData.kinkPoints * 100;
                        const sign = vp >= 0 ? "+" : "";
                        v = `${sign}${vp.toFixed(2)}%`;
                        m = `0DTE − mean(1–3DTE)${skData.indexPrice ? ` · S ${Math.round(skData.indexPrice)}` : ""}`;
                        const iv0 = skData.iv0dte != null ? (skData.iv0dte * 100).toFixed(1) : "—";
                        const m13 = skData.mean1to3 != null ? (skData.mean1to3 * 100).toFixed(1) : "—";
                        const ratio = skData.kinkRatio != null ? `${skData.kinkRatio.toFixed(2)}×` : null;
                        b = ratio ? `0D ${iv0} • 1–3D ${m13} • ${ratio}` : `0D ${iv0} • 1–3D ${m13}`;
                      } else {
                        m = "Awaiting data";
                      }
                      return <KpiCard key={kpi.id} kpi={kpi} value={v} meta={m} extraBadge={b} />;
                    }
                    if (kpi.id === "rv-em-factor") {
                      const v   = rvemLoading ? "…" : (rvemRatio != null ? `${rvemRatio.toFixed(2)}×` : "—");
                      const m   = rvemLoading ? "loading" : (rvemError ? "error" : `BTC ${RVEM_TENOR_DAYS}D · RV ÷ IV`);
                      const bad = (rvAnn != null && ivAnn != null)
                        ? `IV ${(ivAnn * 100).toFixed(1)} • RV ${(rvAnn * 100).toFixed(1)}`
                        : null;
                    
                      return <KpiCard key={kpi.id} kpi={kpi} value={v} meta={m} extraBadge={bad}/>;
                    }
                    if (kpi.id === "funding") {
                      let v = samples[kpi.id];
                      let m: string | undefined = undefined;
                      let b: string | null = null;
                      if (fundingLoading) { v = "…"; m = "loading"; }
                      else if (fundingError) { v = "—"; m = "error"; }
                      else if (current8h != null) {
                        v = `${(current8h * 100).toFixed(3)}%`;
                        m = fundingTs ? `Deribit 8h · ${new Date(fundingTs).toLocaleTimeString()}` : "Deribit 8h";
                        if (avg7d8h != null) b = `7d avg ${(avg7d8h * 100).toFixed(3)}%`;
                      } else { v = "—"; m = "Awaiting data"; }
                      return <KpiCard key={kpi.id} kpi={kpi} value={v} meta={m} extraBadge={b}/>;
                    }
                    if (kpi.id === "em-ribbon") {
                      return (
                        <div key="em-ribbon" className="col-span-full">
                          <ExpectedMoveRibbonCard currency="BTC" />
                        </div>
                      );
                    }
                    if (kpi.id === "spot-perp-basis") {
                      let v = samples[kpi.id];
                      let m: string | undefined = undefined;
                      let b: string | null = null;
                    
                      if (basisLoading) {
                        v = "…"; m = "loading";
                      } else if (basisError) {
                        v = "—"; m = "error";
                      } else if (basisPctPerp != null) {
                        const pct = basisPctPerp * 100;
                        const sign = pct >= 0 ? "+" : "";
                        v = `${sign}${pct.toFixed(2)}%`;
                        m = basisTs ? `BTC spot vs perp · ${new Date(basisTs).toLocaleTimeString()}` : "BTC spot vs perp";
                    
                        if (basisAbsPerp != null && Number.isFinite(basisAbsPerp)) {
                          const abs = basisAbsPerp;
                          b = `Δ ${abs >= 0 ? `+$${abs.toFixed(2)}` : `-$${Math.abs(abs).toFixed(2)}`}`;
                        }
                      } else {
                        v = "—"; m = "Awaiting data";
                      }
                    
                      return <KpiCard key={kpi.id} kpi={kpi} value={v} meta={m} extraBadge={b}/>;
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
                          expiry="front"
                          windowPct={0.25}   // optional; remove to use all strikes
                          pollMs={0}     // set 0 to disable polling
                        />
                      );
                    }

                    return (
                      <KpiCard
                        key={kpi.id}
                        kpi={kpi}
                        value={value}
                        meta={meta}
                        extraBadge={extraBadge}
                        infoKey={infoKeyProp}           // undefined for most KPIs → drawer disabled
                        guidanceValue={guidanceVal}     // null for most KPIs
                        locale={locale}
                      />
                    );
                  })}
                </div>
              )}
            </section>
          ))}
          {filteredGroups.length === 0 && (
            <div className="text-center py-16 text-[var(--fg-muted)]">No KPIs match your search/filters.</div>
          )}
        </div>

        <div className="text-xs text-[var(--fg-muted)] mt-10">
          ATM IV shows <span className="font-semibold">DVOL 30D (proxy)</span> when updated. IVR/IVP are computed from DVOL (52-week window). Samples are mock values until refreshed.
        </div>
      </main>
    </div>
  );
}
