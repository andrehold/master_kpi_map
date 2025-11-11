import * as React from "react";
import KpiCard from "./KpiCard";
import Sparkline from "./Sparkline";
import type { KPIDef } from "../../data/kpis";
import { useGammaWalls } from "../../hooks/useGammaWalls";

function fmtK(x: number) {
  return x >= 1000 ? `${Math.round(x / 1000)}k` : `${Math.round(x)}`;
}
function fmtUsdShort(n: number) {
  const a = Math.abs(n);
  if (a >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (a >= 1e9)  return `$${(n / 1e9 ).toFixed(2)}B`;
  if (a >= 1e6)  return `$${(n / 1e6 ).toFixed(2)}M`;
  if (a >= 1e3)  return `$${(n / 1e3 ).toFixed(0)}k`;
  return `$${n.toFixed(0)}`;
}

export default function GammaWallsCard({ kpi }: { kpi: KPIDef }) {
  // Memoize options so effects inside the hook don't re-run on every render
  const gwOpts = React.useMemo(() => ({
    currency: "BTC" as const,
    windowPct: 0.10,
    topN: 3,
    pollMs: 0, // disable polling
  }), []);
  const gw = useGammaWalls(gwOpts);

  let value = "—";
  let meta: string | undefined;
  let extraBadge: string | null = null;

  if (gw.loading) {
    value = "…";
    meta = "loading";
  } else if (gw.error) {
    value = "—";
    meta = "error";
  } else if (gw.top && gw.top.length > 0) {
    const top = gw.top[0];
    value = `${fmtK(top.strike)} • ${fmtUsdShort(top.gex_abs_usd)}`;
    meta = gw.indexPrice ? `Near S ${Math.round(gw.indexPrice)}` : "Net |GEX| near spot";
    const others = gw.top.slice(1).map(t => fmtK(t.strike)).join(" • ");
    extraBadge = others ? `Also: ${others}` : null;
  } else {
    value = "—";
    meta = "Awaiting data";
  }

  // Footer: sparkline across |GEX| by strike (near-window), and colored strike chips for the top N
  const footer = React.useMemo(() => {
    if (!gw.data || gw.data.length < 2) return null;

    const sortedByStrike = [...gw.data].sort((a, b) => a.strike - b.strike);
    const series = sortedByStrike.map(x => x.gex_abs_usd);

    const top = gw.top ?? [];
    return (
      <div className="flex items-center justify-between gap-3">
        <Sparkline data={series} ariaLabel="Gamma walls |GEX| by strike" />
        <div className="flex items-center gap-1.5">
          {top.map(t => {
            const isPos = t.gex_net_usd >= 0; // simple sign color
            return (
              <span
                key={t.strike}
                className={`px-2 py-0.5 rounded-full text-[11px] border
                  ${isPos ? "border-[var(--border)] text-[var(--fg)] bg-[var(--surface-900)]"
                          : "border-[var(--border)] text-[var(--fg-muted)] bg-[var(--surface-900)]"}`}
                title={`net: ${fmtUsdShort(t.gex_net_usd)} | abs: ${fmtUsdShort(t.gex_abs_usd)}`}
              >
                {fmtK(t.strike)}
              </span>
            );
          })}
        </div>
      </div>
    );
  }, [gw.data, gw.top]);

  return (
    <KpiCard
      kpi={kpi}
      value={value}
      meta={meta}
      extraBadge={extraBadge}
      footer={footer}
    />
  );
}