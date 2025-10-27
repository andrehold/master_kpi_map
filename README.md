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
