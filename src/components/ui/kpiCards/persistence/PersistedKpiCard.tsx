import type { ComponentProps, ReactNode } from "react";
import { useMemo, isValidElement } from "react";
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
  const raw = text?.trim?.() ?? "";
  if (!raw || raw === "—" || raw === "-") return null;

  // handle "(1.23)" as negative
  let s = raw;
  let neg = false;
  if (/^\(.*\)$/.test(s)) {
    neg = true;
    s = s.slice(1, -1);
  }

  // keep digits, signs, separators
  s = s.replace(/[^\d.,+\-]/g, "").replace(/\s+/g, "");
  if (!s) return null;

  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");

  // If both present, whichever appears last is the decimal separator
  if (lastDot !== -1 && lastComma !== -1) {
    if (lastDot > lastComma) {
      // 1,234.56 -> remove thousands commas
      s = s.replace(/,/g, "");
    } else {
      // 1.234,56 -> remove thousands dots, convert decimal comma
      s = s.replace(/\./g, "").replace(/,/g, ".");
    }
  } else if (lastComma !== -1) {
    // Only comma present: treat as decimal if it ends with 1-2 digits (12,3 or 12,34)
    if (/,\d{1,2}$/.test(s)) s = s.replace(/,/g, ".");
    else s = s.replace(/,/g, ""); // 1,234 -> thousands
  } else {
    // Only dot or none: keep dot as decimal, nothing else to do
  }

  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return neg ? -n : n;
}

function pickFirstField(row: any, keys: string[]): any {
  for (const k of keys) {
    if (row && row[k] != null) return row[k];
  }
  return null;
}

function findFirstRowsElement(node: ReactNode): any | null {
  if (!node) return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const hit = findFirstRowsElement(child);
      if (hit) return hit;
    }
    return null;
  }
  if (isValidElement(node)) {
    const p: any = (node as any).props;
    if (Array.isArray(p?.rows)) return p;
    return findFirstRowsElement(p?.children);
  }
  return null;
}

function extractMiniFromFooter(footer: ReactNode): PersistableKpiVm["mini"] {
  const p = findFirstRowsElement(footer);
  if (!p) return [];

  const rows: any[] = Array.isArray(p?.rows) ? p.rows : [];
  const getKey: ((r: any) => any) | undefined = typeof p?.getKey === "function" ? p.getKey : undefined;

  if (!rows.length) return [];

  return rows.map((r, idx) => {
    const keyRaw = (getKey ? getKey(r) : null) ?? r?.id ?? r?.key ?? `${idx}`;
    const labelRaw =
      pickFirstField(r, ["tenor", "label", "name", "strike", "days", "dte", "expiry", "id", "key"]) ?? keyRaw;
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
  const computedPersist = useMemo((): KpiSnapshotPayload | null => {
    if (persist !== undefined) return persist ?? null;

    const vm = autoPersistFromCardProps(cardProps);
    if (!vm) return null;

    const kpi: any = (cardProps as any).kpi;
    if (!kpi?.id) return null;

    return toSnapshotPayload(kpi.id, vm);
  }, [
    persist,
    (cardProps as any).kpi?.id,
    (cardProps as any).kpi?.name,
    (cardProps as any).value,
    (cardProps as any).meta,
    (cardProps as any).footer,
  ]);

  usePersistKpiSnapshot(context, computedPersist, { minIntervalMs });

  return (
    <KpiCard
      {...cardProps}
      locale={(cardProps as any).locale ?? context.locale}
    />
  );
}
