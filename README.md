# Master KPI Map (Vite + React + Tailwind)

Light/dark dashboard to browse strategy KPI groups with sample values.

## Getting started

```bash
# 1) Install deps
npm install

# 2) Start dev server
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Git setup

```bash
git init
git add .
git commit -m "feat: bootstrap KPI map (vite+react+tailwind)"
# Create a new empty repo on GitHub, then:
git branch -M main
git remote add origin https://github.com/<your-org-or-user>/master-kpi-map.git
git push -u origin main
```

## Theming

Colors and spacing are tokenized via CSS variables; see `src/index.css` and `src/App.tsx (TokenStyles)`.

## Adding a new KPI (required: PersistedKpiCard)

All KPI cards must use `PersistedKpiCard` so values + meta + footer mini-tables are persisted to the DB.

### Checklist

1) **Add KPI id**
- `src/kpi/kpiIds.ts`
  - Add a new entry to `KPI_IDS`
  - The string id must match everywhere (registry, groups, bands)

2) **Register KPI definition + place into a section**
- `src/config/kpis.ts`
  - Add a `KPIDef` entry (uses `name`, not `title`)
  - Add the KPI id into the desired group (e.g. `9. Strikes & Positioning`)
  - (Optional) Add KPI_INFO entry for explanation text

3) **Add bands (optional but recommended for guidance color/bar)**
- `src/config/bands.base.ts`
  - Add thresholds for `KPI_IDS.<newId>`
  - If bands are used, the hook should return a numeric `guidanceValue`

4) **Create KPI hook**
- `src/kpi/hooks/use<Something>Kpi.ts`
  - Return a view-model with:
    - `status: "loading" | "ready" | "error"`
    - `value: string | null` (main display)
    - `guidanceValue?: number` (numeric used for band thresholds)
    - `meta?: string`
    - `errorMessage?: string`
    - `rows: Row[]` for the mini table
  - Row shape convention:
    ```ts
    type Row = {
      id: string;
      metric: string;
      formatted: string;     // displayed text
      value?: number | null; // raw numeric (preferred for persistence)
    };
    ```

5) **Create KPI card component (MUST use PersistedKpiCard)**
- `src/kpiCards/cards/<NewCard>.tsx`
  - Card must accept `({ kpi, context }: KpiCardComponentProps)`
  - Card must render `PersistedKpiCard` and pass `kpi={kpi}` through
  - Mini table must be passed via `footer={...}` (not children)
  - `KpiMiniTable` must include `getKey={(r) => r.id}`

  Template:
  ```tsx
  export default function NewKpiCard({ kpi, context }: KpiCardComponentProps) {
    const vm = useNewKpi(context);

    const footer =
      vm.rows?.length ? (
        <KpiMiniTable
          title="Details"
          rows={vm.rows}
          getKey={(r) => r.id}
          columns={[
            { id: "metric", header: "Metric", render: (r) => r.metric },
            { id: "value", header: "Value", align: "right", render: (r) => r.formatted },
          ]}
        />
      ) : undefined;

    return (
      <PersistedKpiCard
        context={context}
        kpi={kpi}
        status={vm.status}
        value={vm.value}
        meta={vm.meta}
        guidanceValue={vm.guidanceValue}
        errorMessage={vm.errorMessage}
        footer={footer}
      />
    );
  }
Register the card in the KPI registry

src/kpiCards/registry.ts

Import the new card

Add mapping:

ts
Copy code
[KPI_IDS.<newId>]: NewKpiCard
If this step is missing (or the id mismatches), you’ll typically see only the title (fallback card).

Common failure modes
Only the title shows: card not resolved (missing registry entry or KPI id mismatch).

Card resolved but empty: hook stuck in loading/error, or footer not set because rows are empty.

Mini table error: missing getKey prop.

Persistence missing table data: mini table rendered as children instead of footer, or row fields don’t include formatted/value.

pgsql
Copy code

If you want it even more foolproof, add a tiny “KPI quick self-test” note to the README: temporarily render `value={vm.value ?? "Loading…"}` and `meta={vm.errorMessage ?? vm.meta}` — if you still only see the title, it’s definitely a registry/id mismatch.