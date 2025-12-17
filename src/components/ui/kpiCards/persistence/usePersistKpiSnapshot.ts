import { useEffect, useMemo, useRef } from "react";
import type { KpiCardRendererContext, KpiSnapshotPayload } from "../types";

// tiny “stable stringify” so key order doesn’t randomly change
function stableStringify(x: any): string {
  if (x === null || typeof x !== "object") return JSON.stringify(x);
  if (Array.isArray(x)) return `[${x.map(stableStringify).join(",")}]`;
  const keys = Object.keys(x).sort();
  return `{${keys.map((k) => JSON.stringify(k) + ":" + stableStringify(x[k])).join(",")}}`;
}

type Options = {
  minIntervalMs?: number;        // throttle (optional)
  allowStatuses?: Array<KpiSnapshotPayload["status"]>; // default: ["ready","error","empty"]
};

export function usePersistKpiSnapshot(
  context: KpiCardRendererContext,
  payload: KpiSnapshotPayload | null | undefined,
  opts: Options = {}
) {
  const lastSigRef = useRef<string>("");
  const lastEmitTsRef = useRef<number>(0);

  const allow = opts.allowStatuses ?? ["ready", "error", "empty"];
  const minIntervalMs = opts.minIntervalMs ?? 0;

  // signature excludes ts/runId so “same value” doesn’t re-write
  const sig = useMemo(() => {
    if (!payload) return "";
    const { ts, ...rest } = payload as any;
    return stableStringify(rest);
  }, [payload]);

  useEffect(() => {
    if (!payload) return;
    if (!context.runId || !context.snapshotSink) return;
    if (!allow.includes(payload.status)) return;

    // throttle
    const now = Date.now();
    if (minIntervalMs > 0 && now - lastEmitTsRef.current < minIntervalMs) return;

    // dedupe
    if (sig && sig === lastSigRef.current) return;
    lastSigRef.current = sig;
    lastEmitTsRef.current = now;

    void context.snapshotSink({
      ...payload,
      ts: payload.ts ?? now,
    });
  }, [context.runId, context.snapshotSink, payload, sig, allow, minIntervalMs]);
}
