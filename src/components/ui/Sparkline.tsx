type Props = {
  data: number[];              // y-values in order
  width?: number;              // px
  height?: number;             // px
  strokeWidth?: number;        // px
  ariaLabel?: string;
};

export default function Sparkline({
  data,
  width = 160,
  height = 28,
  strokeWidth = 1.5,
  ariaLabel = "sparkline"
}: Props) {
  if (!data || data.length < 2) {
    return <div className="text-[var(--fg-muted)] text-xs">no data</div>;
  }

  // normalize to [0,1]
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((y, i) => {
    const x = (i / (data.length - 1)) * (width - strokeWidth);
    const ny = 1 - (y - min) / range;
    const py = ny * (height - strokeWidth);
    return [x + strokeWidth / 2, py + strokeWidth / 2] as const;
  });

  const d = pts.map((p, i) => (i ? `L${p[0]},${p[1]}` : `M${p[0]},${p[1]}`)).join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel}>
      <path d={d} fill="none" stroke="currentColor" strokeWidth={strokeWidth} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
