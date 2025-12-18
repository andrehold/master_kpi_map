import type { ComponentProps, ReactNode } from "react";
import { isValidElement } from "react";
import KpiCard from "../../KpiCard";
import { usePersistKpiSnapshot } from "./usePersistKpiSnapshot";
import { toSnapshotPayload } from "./toSnapshotPayload";
import type { KpiCardRendererContext, KpiSnapshotPayload, PersistableKpiVm } from "../types";

type CardProps = ComponentProps<typeof KpiCard>;

function nodeToText(x: any): string {
  if (x == null) return "";
  if (typeof x === "string" || typeof x === "number" || typeof x === "boolean") return String(x);
  if (Array.isArray(x)) return x.map(nodeToText).join("");
  if (isValidElement(x)) return nodeToText((x as any).props?.children);
  return "";
}

function parseMaybeNumber(text: string): number | null {
  const s = text.trim();
  if (!s || s === "—" || s === "-") return null;
  // remove %,$ and common separators
  const cleaned = s.replace(/[%,$]/g, "").replace(/\s+/g, "").replace(/,/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function pickFirstField(row: any, keys: string[]): any {
  for (const k of keys) {
    if (row && row[k] != null) return row[k];
  }
  return null;
}

function extractMiniFromFooter(footer: ReactNode): PersistableKpiVm["mini"] {
  if (!footer) return [];

  // If footer is a KpiMiniTable element, it will have props.rows and (usually) getKey
  if (isValidElement(footer)) {
    const p: any = (footer as any).props;
    const rows: any[] = Array.isArray(p?.rows) ? p.rows : [];
    const getKey: ((r: any) => any) | undefined = typeof p?.getKey === "function" ? p.getKey : undefined;

    if (!rows.length) return [];

    return rows.map((r, idx) => {
      const keyRaw =
        (getKey ? getKey(r) : null) ??
        r?.id ??
        r?.key ??
        `${idx}`;

      const labelRaw = pickFirstField(r, ["tenor", "label", "name", "strike", "days", "dte", "expiry", "id", "key"]) ?? keyRaw;
      const valueRaw = pickFirstField(r, ["iv", "value", "pct", "abs", "amount", "price", "rate", "formatted"]);

      const label = nodeToText(labelRaw) || String(keyRaw);
      const formatted = nodeToText(valueRaw);

      return {
        key: String(keyRaw),
        label,
        formatted,
        value: parseMaybeNumber(formatted),
      };
    });
  }

  return [];
}

function autoPersistFromCardProps(cardProps: CardProps): PersistableKpiVm | null {
  const formattedMain = nodeToText((cardProps as any).value);
  const metaText = nodeToText((cardProps as any).meta);

  // If there's no meaningful main value, skip writing
  if (!formattedMain || formattedMain === "—") return null;

  const kpi: any = (cardProps as any).kpi;
  const label = kpi?.name ?? kpi?.title ?? "KPI";

  const mini = extractMiniFromFooter((cardProps as any).footer);

  return {
    status: "ready",
    meta: metaText || undefined,
    main: {
      label,
      formatted: formattedMain,
      value: parseMaybeNumber(formattedMain),
    },
    mini,
  };
}

export function PersistedKpiCard(
  props: CardProps & {
    context: KpiCardRendererContext;
    persist?: KpiSnapshotPayload | null; // optional explicit payload
    minIntervalMs?: number;
  }
) {
  const { context, persist, minIntervalMs, ...cardProps } = props;

  // If caller didn't provide persist payload, try to auto-build one from rendered props
  const computedPersist: KpiSnapshotPayload | null =
    persist ??
    (() => {
      const vm = autoPersistFromCardProps(cardProps);
      if (!vm) return null;
      const kpi: any = (cardProps as any).kpi;
      return toSnapshotPayload(kpi.id, vm);
    })();

  usePersistKpiSnapshot(context, computedPersist, { minIntervalMs });

  return (
    <KpiCard
      {...cardProps}
      locale={(cardProps as any).locale ?? context.locale}
    />
  );
}
