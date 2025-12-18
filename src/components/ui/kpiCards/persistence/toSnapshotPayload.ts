import type { KpiId } from "../../../../kpi/kpiIds";
import type { KpiSnapshotPayload, KpiPoint, PersistableKpiVm } from "../types";

export function toSnapshotPayload(kpiId: KpiId, vm: PersistableKpiVm): KpiSnapshotPayload {
  const main: KpiPoint | null = vm.main
    ? {
        key: "main",
        label: vm.main.label,
        value: vm.main.value ?? null,
        formatted: vm.main.formatted,
      }
    : null;

  const mini: KpiPoint[] = (vm.mini ?? []).map((p) => ({
    key: p.key,
    label: p.label,
    value: p.value ?? null,
    formatted: p.formatted,
  }));

  return {
    kpiId,
    status: vm.status,
    meta: vm.meta,
    extraBadge: vm.extraBadge,
    guidanceValue: vm.guidanceValue ?? null,
    error: vm.error,
    main,
    mini,
  };
}
