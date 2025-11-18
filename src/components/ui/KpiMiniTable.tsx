    import React from "react";

type Column<Row> = {
  id: string;
  header: React.ReactNode;
  align?: "left" | "right";
  render: (row: Row) => React.ReactNode;
};

type Props<Row> = {
  title?: React.ReactNode;
  rows: Row[];
  getKey: (row: Row) => React.Key;
  columns: Column<Row>[];
  emptyLabel?: React.ReactNode;
};

export function KpiMiniTable<Row>({
  title,
  rows,
  getKey,
  columns,
  emptyLabel = "No data",
}: Props<Row>) {
  if (!rows.length) {
    return (
      <div className="text-xs text-[var(--fg-muted)]">
        {title && <div className="opacity-70 mb-1">{title}</div>}
        {emptyLabel}
      </div>
    );
  }

  const gridCols = `grid-cols-[${columns.map(() => "auto").join("_")}]`;

  return (
    <div className="text-xs">
      {title && <div className="opacity-70 mb-1">{title}</div>}
      <div className={`grid ${gridCols} gap-x-4 gap-y-1`}>
        {columns.map((col) => (
          <div
            key={col.id}
            className={`opacity-60 ${col.align === "right" ? "text-right" : ""}`}
          >
            {col.header}
          </div>
        ))}
        {rows.map((row) => (
          <React.Fragment key={getKey(row)}>
            {columns.map((col) => (
              <div
                key={col.id}
                className={`tabular-nums ${
                  col.align === "right" ? "text-right" : ""
                }`}
              >
                {col.render(row)}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
