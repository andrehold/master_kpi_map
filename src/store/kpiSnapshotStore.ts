// src/store/kpiSnapshotStore.ts
import { create } from "zustand";
import type { KpiId } from "../kpi/kpiIds";
import type { KpiSnapshot } from "../types/kpiSnapshot";

type State = {
  runId: string | null;
  snapshotsById: Partial<Record<KpiId, KpiSnapshot>>;
  startRun: (runId: string) => void;
  upsertSnapshot: (kpiId: KpiId, next: KpiSnapshot) => void;
  clear: () => void;
};

export const useKpiSnapshotStore = create<State>((set) => ({
  runId: null,
  snapshotsById: {},
  startRun: (runId) => set({ runId, snapshotsById: {} }),
  upsertSnapshot: (kpiId, next) =>
    set((s) => ({ snapshotsById: { ...s.snapshotsById, [kpiId]: next } })),
  clear: () => set({ runId: null, snapshotsById: {} }),
}));
