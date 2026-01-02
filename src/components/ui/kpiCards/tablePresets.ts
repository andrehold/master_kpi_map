import type { ReactNode } from "react";
import type { Column } from "../KpiMiniTable";

/**
 * Generic "Metric / Value" table columns.
 * Row must have: { label, value } (strings or React nodes).
 */
export function labelValueColumns<
  Row extends { label: ReactNode; value: ReactNode },
>(): Column<Row>[] {
  return [
    { id: "label", header: "Metric", render: (r) => r.label },
    { id: "value", header: "Value", align: "right", render: (r) => r.value },
  ];
}

/**
 * ADX-style table: Metric / Value / Updated
 * Row must have: { metric, value, asOf }.
 */
export function metricValueAsOfColumns<
  Row extends { metric: ReactNode; value: ReactNode; asOf: ReactNode },
>(): Column<Row>[] {
  return [
    { id: "metric", header: "Metric", render: (r) => r.metric },
    { id: "value", header: "Value", align: "right", render: (r) => r.value },
    { id: "asOf", header: "Updated", align: "right", render: (r) => r.asOf },
  ];
}

/**
 * Label-style table: Metric / Value / Updated
 * Row must have: { label, value, asOf }.
 */
export function labelValueAsOfColumns<
  Row extends { label: ReactNode; value: ReactNode; asOf: ReactNode },
>(): Column<Row>[] {
  return [
    { id: "label", header: "Metric", render: (r) => r.label },
    { id: "value", header: "Value", align: "right", render: (r) => r.value },
    { id: "asOf", header: "Updated", align: "right", render: (r) => r.asOf },
  ];
}

/**
 * Tenor / IV / Expiry (used by ATM IV + Term Structure cards).
 * Row must have: { tenor, iv, expiry }.
 */
export function tenorIvExpiryColumns<
  Row extends { tenor: ReactNode; iv: ReactNode; expiry: ReactNode },
>(): Column<Row>[] {
  return [
    { id: "tenor", header: "Tenor", render: (r) => r.tenor },
    { id: "iv", header: "IV", align: "right", render: (r) => r.iv },
    { id: "expiry", header: "Expiry", align: "right", render: (r) => r.expiry },
  ];
}

/**
 * RV table: Window / RV (ann.) / Updated
 * Row must have: { windowLabel, rv, asOf }.
 */
export function windowRvAsOfColumns<
  Row extends { windowLabel: ReactNode; rv: ReactNode; asOf: ReactNode },
>(): Column<Row>[] {
  return [
    { id: "window", header: "Window", render: (r) => r.windowLabel },
    { id: "rv", header: "RV (ann.)", align: "right", render: (r) => r.rv },
    { id: "asOf", header: "Updated", align: "right", render: (r) => r.asOf },
  ];
}

/**
 * IV-RV spread table: RV window / RV (ann.) / IV − RV
 * Row must have: { windowLabel, rv, spread }.
 */
export function rvWindowRvSpreadColumns<
  Row extends { windowLabel: ReactNode; rv: ReactNode; spread: ReactNode },
>(): Column<Row>[] {
  return [
    { id: "window", header: "RV window", render: (r) => r.windowLabel },
    { id: "rv", header: "RV (ann.)", align: "right", render: (r) => r.rv },
    { id: "spread", header: "IV − RV", align: "right", render: (r) => r.spread },
  ];
}

/**
 * Expected Move ribbon table: Tenor / Expiry / ±$ Move / ±%
 * Row must have: { tenor, expiry, abs, pct }.
 */
export function emRibbonColumns<
  Row extends { tenor: ReactNode; expiry: ReactNode; abs: ReactNode; pct: ReactNode },
>(): Column<Row>[] {
  return [
    { id: "tenor", header: "Tenor", render: (r) => r.tenor },
    { id: "expiry", header: "Expiry", align: "right", render: (r) => r.expiry },
    { id: "abs", header: "±$ Move", align: "right", render: (r) => r.abs },
    { id: "pct", header: "±%", align: "right", render: (r) => r.pct },
  ];
}

/**
 * Skew tenors table: Tenor / C25 / P25 / RR
 * Row must have: { label, c25, p25, rr }.
 */
export function skewTenorsColumns<
  Row extends { label: ReactNode; c25: ReactNode; p25: ReactNode; rr: ReactNode },
>(): Column<Row>[] {
  return [
    { id: "label", header: "Tenor", render: (r) => r.label },
    { id: "c25", header: "C25", align: "right", render: (r) => r.c25 },
    { id: "p25", header: "P25", align: "right", render: (r) => r.p25 },
    { id: "rr", header: "RR", align: "right", render: (r) => r.rr },
  ];
}

/**
 * SMA table: Tenor / Status
 * Row must have: { tenor, text }.
 */
export function tenorStatusColumns<
  Row extends { tenor: ReactNode; text: ReactNode },
>(): Column<Row>[] {
  return [
    { id: "tenor", header: "Tenor", render: (r) => r.tenor },
    { id: "text", header: "Status", align: "right", render: (r) => r.text },
  ];
}
