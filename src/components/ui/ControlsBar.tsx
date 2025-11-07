import { Search, Filter } from "lucide-react";
import StrategyTag from "./StrategyTag";
import { STRATEGIES, Strategy } from "../../data/kpis";

export default function ControlsBar({
  search,
  setSearch,
  activeStrategies,
  toggleStrategy,
}: {
  search: string;
  setSearch: (v: string) => void;
  activeStrategies: Strategy[];
  toggleStrategy: (s: Strategy) => void;
}) {
  return (
    <div className="grid md:grid-cols-3 gap-3 mb-6">
      <div className="md:col-span-2">
        <div className="flex items-center gap-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-950)] px-3 py-2 shadow-[var(--shadow)]">
          <Search className="w-4 h-4 text-[var(--fg-muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full outline-none text-sm placeholder:text-[var(--fg-muted)] bg-transparent text-[var(--fg)]"
            placeholder="Search KPI name or id (e.g., 'iv-rv-spread')"
          />
        </div>
      </div>
      <div>
        <div className="flex items-center gap-2 text-[var(--fg-muted)] text-sm">
          <Filter className="w-4 h-4" /> Filter by strategy
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {STRATEGIES.map((s) => (
            <StrategyTag key={s} label={s} active={activeStrategies.includes(s)} onClick={() => toggleStrategy(s)} />
          ))}
        </div>
      </div>
    </div>
  );
}
