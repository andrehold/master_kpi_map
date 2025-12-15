import React from "react";
import GroupHeader from "./GroupHeader";

type GroupLike<KpiId> = {
  id: string;
  title: string;
  kpis: KpiId[];
};

export type KpiGroupsGridProps<KpiId> = {
  groups: Array<GroupLike<KpiId>>;
  openGroups: Record<string, boolean>;
  onToggleGroup: (groupId: string) => void;

  /** Render one KPI card for a given KPI id */
  renderKpi: (kpiId: KpiId) => React.ReactNode;

  /** Optional UI tweaks */
  className?: string;
  gridClassName?: string;
  emptyLabel?: React.ReactNode;
};

export function KpiGroupsGrid<KpiId>({
  groups,
  openGroups,
  onToggleGroup,
  renderKpi,
  className = "space-y-4",
  gridClassName = "mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-3",
  emptyLabel = (
    <div className="text-center py-16 text-[var(--fg-muted)]">
      No KPIs match your search/filters.
    </div>
  ),
}: KpiGroupsGridProps<KpiId>) {
  if (!groups.length) return <div className={className}>{emptyLabel}</div>;

  return (
    <div className={className}>
      {groups.map((group) => {
        const isOpen = !!openGroups[group.id];

        return (
          <section key={group.id}>
            <GroupHeader
              title={group.title}
              open={isOpen}
              onToggle={() => onToggleGroup(group.id)}
            />

            {isOpen && (
              <div className={gridClassName}>
                {group.kpis.map((kpiId) => (
                  <React.Fragment key={String(kpiId)}>
                    {renderKpi(kpiId)}
                  </React.Fragment>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
