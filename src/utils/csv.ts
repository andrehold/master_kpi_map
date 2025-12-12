export function csvEscape(v: unknown): string {
    const s = v == null ? "" : String(v);
    // Quote if it contains comma, quote, or newline
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }
  
  export function toCsv(rows: Array<Record<string, unknown>>): string {
    if (!rows.length) return "";
    const headers = Object.keys(rows[0]);
    const lines = [
      headers.map(csvEscape).join(","),
      ...rows.map(r => headers.map(h => csvEscape(r[h])).join(",")),
    ];
    return lines.join("\n");
  }
  
  export function downloadTextFile(filename: string, content: string, mime = "text/csv;charset=utf-8"): void {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
  