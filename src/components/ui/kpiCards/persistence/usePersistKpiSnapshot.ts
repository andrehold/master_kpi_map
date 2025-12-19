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
  const pendingRef = useRef<{ payload: KpiSnapshotPayload; sig: string } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    const now = Date.now();

    // dedupe first: if it's identical to the last emitted signature, do nothing
    if (sig && sig === lastSigRef.current) return;

    const canEmitNow =
      minIntervalMs <= 0 || now - lastEmitTsRef.current >= minIntervalMs;

    if (canEmitNow) {
      // leading edge: emit immediately
      pendingRef.current = null;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      lastSigRef.current = sig;
      lastEmitTsRef.current = now;

      void context.snapshotSink({
        ...payload,
        ts: payload.ts ?? now,
      });
      return;
    }

    // inside throttle window: store latest payload for trailing flush
    pendingRef.current = { payload, sig };

    // reschedule trailing flush to always emit the *latest* payload at the window end
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const wait = Math.max(0, minIntervalMs - (now - lastEmitTsRef.current));
    timerRef.current = setTimeout(() => {
      timerRef.current = null;

      const pending = pendingRef.current;
      pendingRef.current = null;
      if (!pending) return;

      // if sink/runId got reset, skip
      if (!context.runId || !context.snapshotSink) return;

      const now2 = Date.now();

      // dedupe again at flush time
      if (pending.sig && pending.sig === lastSigRef.current) return;

      lastSigRef.current = pending.sig;
      lastEmitTsRef.current = now2;

      void context.snapshotSink({
        ...pending.payload,
        ts: pending.payload.ts ?? now2,
      });
    }, wait);
  }, [context.runId, context.snapshotSink, payload, sig, allow, minIntervalMs]);
}
