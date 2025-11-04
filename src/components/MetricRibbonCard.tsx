import React from "react";
import MetricRibbon, { RibbonItem } from "./MetricRibbon";

export type MetricRibbonCardProps = {
  title?: string;
  className?: string;
  items: RibbonItem[];
  loading?: boolean;
  error?: string | null;
  headerChips?: string[];
  controls?: React.ReactNode;
  helperText?: string;
};

export default function MetricRibbonCard({
  title = "Metric Ribbon",
  className,
  items,
  loading,
  error,
  headerChips,
  controls,
  helperText,
}: MetricRibbonCardProps) {
  // This shell keeps the look consistent with KPI cards in App.tsx.
  // (Using similar tokens/classes you’re already using.)
  return (
    <MetricRibbon
      title={title}
      className={className}
      items={items}
      loading={loading}
      error={error}
      headerChips={headerChips}
      controls={controls}
      helperText={helperText}
    />
  );
}
