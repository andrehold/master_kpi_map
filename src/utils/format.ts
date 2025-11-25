/**
 * Format a strike as a compact "k" label.
 *  64000  -> "64k"
 *  950    -> "950"
 */
export function fmtK(value: number | null | undefined): string {
    if (value == null || !isFinite(value)) return "—";
    const v = Math.round(value);
    if (Math.abs(v) >= 1000) return `${Math.round(v / 1000)}k`;
    return String(v);
  }
  
  /**
   * Short USD-style formatter:
   *   1234       -> "$1k"
   *   5678900    -> "$5.68M"
   *   123        -> "$123"
   */
  export function fmtUsdShort(value: number | null | undefined): string {
    if (value == null || !isFinite(value)) return "—";
    const n = value;
    const a = Math.abs(n);
  
    if (a >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
    if (a >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (a >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
    if (a >= 1e3) return `$${(n / 1e3).toFixed(0)}k`;
    return `$${n.toFixed(0)}`;
  }
  
  /**
   * Generic compact number:
   *   1234    -> "1.23k"
   *   5000000 -> "5.00M"
   */
  export function fmtNumberCompact(value: number | null | undefined): string {
    if (value == null || !isFinite(value)) return "—";
    const n = value;
    const a = Math.abs(n);
  
    const sign = n < 0 ? "-" : "";
    const v = Math.abs(n);
  
    if (a >= 1e12) return `${sign}${(v / 1e12).toFixed(2)}T`;
    if (a >= 1e9) return `${sign}${(v / 1e9).toFixed(2)}B`;
    if (a >= 1e6) return `${sign}${(v / 1e6).toFixed(2)}M`;
    if (a >= 1e3) return `${sign}${(v / 1e3).toFixed(2)}k`;
    return `${sign}${v.toFixed(2)}`;
  }
  
  /**
   * Signed number with fixed decimals:
   *   0.1234, 2 -> "+0.12"
   *   -0.5,  1  -> "-0.5"
   */
  export function fmtSigned(
    value: number | null | undefined,
    decimals = 2
  ): string {
    if (value == null || !isFinite(value)) return "—";
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(decimals)}`;
  }
  
  /**
   * Signed percent:
   *   0.1234 -> "+12.34%"
   *   -0.5   -> "-50.00%"
   */
  export function fmtSignedPct(
    value: number | null | undefined,
    decimals = 2
  ): string {
    if (value == null || !isFinite(value)) return "—";
    const pct = value * 100;
    const sign = pct >= 0 ? "+" : "";
    return `${sign}${pct.toFixed(decimals)}%`;
  }
  
  /**
   * Unsigned percent:
   *   0.1234 -> "12.34%"
   */
  export function fmtPct(
    value: number | null | undefined,
    decimals = 2
  ): string {
    if (value == null || !isFinite(value)) return "—";
    const pct = value * 100;
    return `${pct.toFixed(decimals)}%`;
  }
  
  /**
   * Short date like "Nov 24" using locale.
   */
  export function fmtDateShort(
    ts: number | null | undefined,
    locale: string
  ): string {
    if (ts == null || !isFinite(ts)) return "—";
    return new Date(ts).toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
    });
  }

  /**
 * Strike like "70k" or "950".
 */
export function fmtStrike(value: number | null | undefined): string {
  if (value == null || !isFinite(value)) return "—";
  const v = Math.round(value);
  if (Math.abs(v) >= 1000) return `${Math.round(v / 1000)}k`;
  return String(v);
}

/**
 * Distance from spot as signed percent, e.g. "+3.2%".
 */
export function fmtDistPct(
  value: number | null | undefined,
  decimals = 1
): string {
  if (value == null || !isFinite(value)) return "—";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * Signed delta, e.g. "+0.123".
 */
export function fmtDelta(
  value: number | null | undefined,
  decimals = 3
): string {
  if (value == null || !isFinite(value)) return "—";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}`;
}

/**
 * Signed premium in USD, e.g. "+$3.20" / "-$0.75".
 */
export function fmtPremiumUsd(
  value: number | null | undefined
): string {
  if (value == null || !isFinite(value)) return "—";
  const sign = value >= 0 ? "+" : "-";
  const abs = Math.abs(value);
  const decimals = abs >= 1000 ? 0 : 2;
  return `${sign}$${abs.toFixed(decimals)}`;
}
  