import React, { useState, useEffect, useRef, ReactNode } from 'react';
import { fetchTimeseries } from '../../api/kpiApi'; // Assume this is implemented to fetch timeseries
import TimeseriesChart from './kpiCards/TimeseriesChart'; // The timeseries chart component
import Badge from './Badge';
import { Info, BarChart } from 'lucide-react';
import KpiInfo from '../KpiInfo';
import { KpiGuidance } from './Guidance';
import type { KPIDef } from '../../data/kpis';

// Placeholder Image for loading state
const PlaceholderImage = () => (
  <div className="w-full h-64 bg-gray-300 text-center text-gray-700 flex items-center justify-center">
    Loading chart...
  </div>
);

type Props = {
  kpi: KPIDef;
  value: ReactNode;
  meta?: string;
  extraBadge?: string | null;
  footer?: React.ReactNode;
  onInfoClick?: () => void;
  infoKey?: string;
  guidanceValue?: number | null;
  locale?: string;
};

export default function KpiCard({
  kpi,
  value,
  meta,
  extraBadge,
  footer,
  onInfoClick,
  infoKey,
  guidanceValue,
  locale = "en",
}: Props) {
  const [isTimeseriesVisible, setIsTimeseriesVisible] = useState(false);
  const [timeseriesData, setTimeseriesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const toggleTimeseries = () => setIsTimeseriesVisible((prev) => !prev);

  useEffect(() => {
    if (isTimeseriesVisible) {
      const fetchData = async () => {
        // Replace this with the appropriate fetch logic
        try {
          const data = await fetchTimeseries(kpi.id);  // Custom hook to fetch timeseries
          setTimeseriesData(data);
        } catch (error) {
          console.error('Error fetching timeseries:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    }
  }, [isTimeseriesVisible, kpi.id]);

  const drawerRef = useRef<any>(null);
  const guidanceEnabled = !!infoKey;

  const openInfo = () => {
    if (onInfoClick) return onInfoClick();
    drawerRef.current?.openInfo?.();
  };

  const hasBadges = Boolean(extraBadge) || Boolean(meta);
  const looksLoading =
    typeof meta === 'string' && /\b(loading|updating|fetching|polling|refreshing)\b/i.test(meta);

  const showSample = !looksLoading && (!hasBadges || isEmptyKpiValue(value));

  const resolvedInfoKey = infoKey ?? kpi.id;

  return (
    <div className="group rounded-2xl border border-[var(--border)] bg-[var(--surface-950)] p-4">
      <div className="grid grid-cols-[1fr_auto] items-start gap-x-4">
        <div className="text-[var(--fg)] font-medium leading-snug flex items-center gap-1">
          <span>{kpi.name}</span>
          <span className="relative inline-flex">
            <KpiInfo id={kpi.id} description={kpi.description} />

            {/* Info Button */}
            {guidanceEnabled && (
              <button
                aria-label="Open KPI info"
                className="px-2 py-1 text-[var(--fg-muted)]"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); openInfo(); }}
              >
                <Info className="w-5 h-5 text-[var(--fg)]" />
              </button>
            )}

            {/* Chart Icon Button */}
            <button
              onClick={toggleTimeseries}
              className="ml-3 px-2 py-1 rounded-full bg-[var(--surface-900)] hover:bg-[var(--surface-950)] text-[var(--fg)]"
            >
              <BarChart className="w-5 h-5" />
            </button>
          </span>
        </div>

        <div className="text-right">
          <div className="text-xl font-semibold tabular-nums font-mono text-[var(--fg)]">
            {value}
          </div>
        </div>

        {(extraBadge || meta || showSample) && (
          <div className="col-span-2 mt-1 flex w-full flex-wrap items-center gap-1">
            {extraBadge ? <Badge>{extraBadge}</Badge> : null}
            {meta ? (
              <div className="text-[10px] text-[var(--fg-muted)] flex items-center gap-1">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--fg-muted)]" />
                {meta}
              </div>
            ) : null}
            {showSample && <Badge>sample</Badge>}
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {kpi.strategies.map((s) => (
          <span
            key={s}
            className="px-2 py-0.5 rounded-full text-[10px] border border-[var(--border)] text-[var(--fg-muted)] bg-[var(--surface-900)]"
          >
            {s}
          </span>
        ))}
      </div>

      {footer ? <div className="mt-3">{footer}</div> : null}

      {
        guidanceEnabled ? (
          <div className="mt-3">
            <KpiGuidance
              ref={drawerRef}
              trigger="external"
              kpiId={kpi.id}
              infoKey={resolvedInfoKey}
              value={guidanceValue ?? null}
              locale={locale}
            />
          </div>
        ) : null
      }
    </div >
  );
}

function isEmptyKpiValue(v: unknown) {
  if (v == null) return true;
  if (typeof v === "number") return Number.isNaN(v);
  const s = String(v).trim().toLowerCase();
  return s === "" || s === "—" || s === "-" || s === "…" || s === "na" || s === "n/a" || s === "null";
}
