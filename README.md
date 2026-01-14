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
  ### Guidance bands (BandSet + i18n)
  - If your KPI uses the guidance band widget (i.e. `KPIMeta.bandsId` is set), you must also wire it into `Guidance.tsx`:
  1) Add a BandSet entry in the band registry with the exact same id as `bandsId`.
    - If you see: `Unknown bands id: <id>` → the band set registry is missing that key (or the id mismatches).
  2) Add i18n text for the same id in every supported locale (at least `en`).
    - If you see: `Missing i18n for <id> in en` → the band set exists, but the locale text entry is missing.

Tip: Keep `bandsId` naming consistent (kebab-case preferred) to avoid subtle mismatches.

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


## Making a KPI configurable (KPI Configuration overlay)

Some KPIs have “knobs” that should be user-adjustable (e.g., lookback window, horizon days, tenors, bands, etc.). The project supports this via a small config registry + an overlay UI. Config is stored **per-browser** in `localStorage` (key: `kpi-config.v1`) and does **not** go to the DB.

### Checklist

1) **Make sure the KPI has a stable id**
- `src/kpi/kpiIds.ts`
  - Add / confirm `KPI_IDS.<yourKpi>` exists
  - You’ll use this id in the config registry

2) **Add a config definition (this makes it show up in the overlay)**
- `src/config/kpiConfig.ts`
  - Add a new entry to `KPI_CONFIG_DEFS`
  - Each entry has:
    - `kpiId`: the KPI id (from `KPI_IDS`)
    - `label`: section title shown in the overlay
    - `params`: array of param descriptors (currently supported types: `"number"`, `"string"`, `"number[]"`)

Example:

```ts
// src/config/kpiConfig.ts
import { KPI_IDS } from "../kpi/kpiIds";

export const KPI_CONFIG_DEFS = [
  // ...
  {
    kpiId: KPI_IDS.emHitRate,
    label: "EM Hit Rate",
    params: [
      {
        id: "horizonDays",
        type: "number",
        label: "Horizon",
        description: "Realized move window (calendar days).",
        defaultValue: 1,
        min: 1,
        max: 30,
        step: 1,
        unit: "days",
      },
      {
        id: "lookbackDays",
        type: "number",
        label: "Lookback window",
        description: "How many historical start points to evaluate.",
        defaultValue: 30,
        min: 5,
        max: 365,
        step: 1,
        unit: "days",
      },
    ],
  },
];
```

3) **Read the config values inside the KPI hook or card**
Use `getKpiParam()` (or `getKpiParamsFor()`) to read values. Always provide a fallback default.

```ts
import { getKpiParam } from "../../config/kpiConfig";
import { KPI_IDS } from "../../kpi/kpiIds";

const horizonDays = getKpiParam<number>(KPI_IDS.emHitRate, "horizonDays") ?? 1;
const lookbackDays = getKpiParam<number>(KPI_IDS.emHitRate, "lookbackDays") ?? 30;
```

For arrays:

```ts
const tenors = getKpiParam<number[]>(KPI_IDS.atmIv, "extraTenors") ?? [7, 30, 60];
```

4) **Validate / normalize before using**
Even though the overlay clamps numeric inputs, your KPI hook/card should still:
- clamp to sane minimums
- round values that represent “days” (`Math.round`)
- handle missing values via defaults

5) **Optional: show the chosen params in the KPI card**
Recommended for transparency. Add a footer row such as:
- Horizon: `1D`
- Lookback: `30D`
- Tenors: `4, 7, 21, 30, 60`

### Common failure modes (config)

- **Config section doesn’t show up:** missing entry in `KPI_CONFIG_DEFS` or `kpiId` mismatch.
- **Param always uses defaults:** `param.id` mismatch between registry and the code reading it.
- **Config changes don’t apply:** KPI does not re-render after changing config (ensure the config hook is reactive or config values are part of the renderer context).

### Common failure modes
Only the title shows: card not resolved (missing registry entry or KPI id mismatch).

Card resolved but empty: hook stuck in loading/error, or footer not set because rows are empty.

Mini table error: missing getKey prop.

Persistence missing table data: mini table rendered as children instead of footer, or row fields don’t include formatted/value.

If you want it even more foolproof, add a tiny “KPI quick self-test” while building:

- Temporarily render `JSON.stringify(vm)` inside the card to confirm the hook returns data.
- Add a single hardcoded footer row (one `KpiMiniTable` row) to confirm persistence wiring.
- Once it works, remove the debug output and switch to real rows.
