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

2) **Register KPI meta + place into a section**
- `src/config/kpis.ts`
  - Add a `KpiMeta` entry to `KPIS` (uses `title`, optional `valueType`)
  - Add the KPI id into the desired `KPI_GROUPS` entry (e.g. `9. Strikes & Positioning`)
  - (Optional) Add `KPI_INFO[KPI_IDS.<newId>]` text for the Info drawer

3) **Add bands (optional but recommended for guidance color/bar)**
- `src/config/bands.base.ts`
  - Add `BAND_BASE[KPI_IDS.<newId>] = { valueScale, hasBar, thresholds: [{min?,max?,tone}] }`
  - If bands are used, the KPI hook should return a numeric `guidanceValue` on the same scale.

4) **Create a domain hook (optional, recommended when you need fetched data or series math)**
- `src/hooks/domain/use<Something>.ts`
  - Fetch raw inputs (Deribit, DB, etc.)
  - Compute indicator series / raw numerics
  - Return `{ loading, error, lastUpdated, refresh, ...computedValues }`

5) **Create KPI hook (formats domain data into a card view-model)**
- `src/hooks/kpis/use<Something>Kpi.ts`
  - Return a view-model shaped like existing KPIs:
    - `value: ReactNode`
    - `meta?: string`
    - `extraBadge?: string | null`
    - `guidanceValue?: number | null`
    - `table?: { title: string; rows: { id; metric; value; asOf }[] }`

6) **Create KPI card component (MUST use PersistedKpiCard)**
- `src/kpiCards/cards/<NewCard>.tsx`
  - Call your KPI hook, build a `KpiMiniTable` as `footer`
  - Pass `infoKey={KPI_IDS.<newId>}` and `guidanceValue={vm.guidanceValue}`

7) **Register the card**
- `src/kpiCards/registry.ts`
  - Add `[KPI_IDS.<newId>]: <NewCard>`

Common failure modes
Only the title shows: card not resolved (missing registry entry or KPI id mismatch).

Card resolved but empty: hook stuck in loading/error, or footer not set because rows are empty.

Mini table error: missing getKey prop.

Persistence missing table data: mini table rendered as children instead of footer, or row fields don’t include formatted/value.

pgsql
Copy code

If you want it even more foolproof, add a tiny “KPI quick self-test” note to the README: temporarily render `value={vm.value ?? "Loading…"}` and `meta={vm.errorMessage ?? vm.meta}` — if you still only see the title, it’s definitely a registry/id mismatch.