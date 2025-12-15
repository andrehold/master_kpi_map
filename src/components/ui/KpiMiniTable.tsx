import React from "react";

export type Column<Row> = {
  id: string;
  header?: React.ReactNode;
  align?: "left" | "right";
  render: (row: Row) => React.ReactNode;
};

type Section = {
  /** Insert this section BEFORE the row at this index (0..rows.length) */
  index: number;
  title: React.ReactNode;
};

type Props<Row> = {
  title?: React.ReactNode;
  rows: Row[];
  getKey: (row: Row) => React.Key;
  columns: Column<Row>[];
  emptyLabel?: React.ReactNode;
  /** Optional row-group splitters, e.g. between strikes and totals */
  sections?: Section[];
};

export function KpiMiniTable<Row>({
  title,
  rows,
  getKey,
  columns,
  emptyLabel = "No data",
  sections,
}: Props<Row>) {
  if (!rows.length) {
    return (
      <div className="text-xs text-[var(--fg-muted)]">
        {title && <div className="opacity-70 mb-1">{title}</div>}
        {emptyLabel}
      </div>
    );
  }

  const colCount = columns.length;

  const sectionByIndex = new Map<number, React.ReactNode>();
  sections?.forEach((s) => {
    if (s.index >= 0 && s.index <= rows.length) {
      sectionByIndex.set(s.index, s.title);
    }
  });

  return (
    <div className="text-xs">
      {title && <div className="opacity-70 mb-1">{title}</div>}
      <div
        className="grid gap-x-4 gap-y-1"
        style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, auto))` }}
      >
        {/* header row */}
        {columns.map((col) => (
          <div
            key={`h-${col.id}`}
            className={`opacity-60 ${
              col.align === "right" ? "text-right" : ""
            }`}
          >
            {col.header}
          </div>
        ))}

        {rows.map((row, rowIndex) => (
          <React.Fragment key={getKey(row)}>
            {/* optional section BEFORE this row */}
            {sectionByIndex.has(rowIndex) && (
              <div
                className="mt-2 pt-1 text-[0.7rem] font-medium uppercase tracking-wide opacity-70 border-t border-[var(--border)]"
                style={{ gridColumn: `1 / span ${colCount}` }}
              >
                {sectionByIndex.get(rowIndex)}
              </div>
            )}

            {columns.map((col) => (
              <div
                key={`${col.id}-${rowIndex}`}
                className={`tabular-nums ${
                  col.align === "right" ? "text-right" : ""
                }`}
              >
                {col.render(row)}
              </div>
            ))}
          </React.Fragment>
        ))}

        {/* section AFTER last row (index === rows.length), if ever needed */}
        {sectionByIndex.has(rows.length) && (
          <div
            className="mt-2 pt-1 text-[0.7rem] font-medium uppercase tracking-wide opacity-70 border-t border-[var(--border)]"
            style={{ gridColumn: `1 / span ${colCount}` }}
          >
            {sectionByIndex.get(rows.length)}
          </div>
        )}
      </div>
    </div>
  );
}
