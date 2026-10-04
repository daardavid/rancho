# 001 — Bootstrap the interactive domain map

## Goal

Create a small, typed workspace that can hold future ranch applications, and ship the first internal tool: an interactive process map. The map is for domain discovery. It is not the production ranch application.

## Scope

- Initialize a local Git repository on `main` if one does not already exist.
- Add root workspace files: `.gitignore`, `.editorconfig`, `package.json`, `package-lock.json`, and `README.md`.
- Use npm workspaces for `apps/*` and `packages/*`. Do not add a monorepo framework.
- Scaffold `apps/domain-map` with the current official Vite React TypeScript template.
- Name that package `@rancho/domain-map`.
- Add `@xyflow/react` and load its required stylesheet.
- Build a full-height shell with three views: AS-IS, TO-BE, and ARCHITECTURE.
- Render a temporary five-step AS-IS flow in React Flow, with a custom process node and a details panel.
- Keep map data and TypeScript types outside React components.
- Document the decision to keep domain maps as code.
- Verify install, lint, and production build.
- Commit locally when Git identity is already configured. Do not create a remote.

## Non-goals

- No backend, authentication, database, or hosting.
- No Supabase, Firebase, Prisma, Docker, Next.js, Redux, Zustand, Tailwind, shadcn, Turborepo, or Nx.
- No GitHub remote.
- No real ranch domain model, process inventory, or business assumptions beyond five temporary dummy nodes: Compra, Entrada, Alimentación, Pesaje, and Venta.
- No arbitrary creation or deletion of connections.
- TO-BE and ARCHITECTURE stay empty placeholders.

## Repository structure

```text
RANCHO/
├── apps/
│   └── domain-map/
├── docs/
│   ├── plans/
│   ├── domain/
│   ├── maps/
│   │   ├── as-is/
│   │   ├── to-be/
│   │   └── architecture/
│   └── architecture/
│       └── adr/
├── packages/
├── .editorconfig
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

`apps/domain-map/src` keeps data separate from UI:

```text
src/
├── components/
│   └── layout/
├── features/
│   └── maps/
│       ├── components/
│       └── hooks/
├── data/
├── types/
├── styles/
├── App.tsx
└── main.tsx
```

Empty reserved folders (`packages/`, `docs/domain/`, `docs/maps/**`) get a `.gitkeep` so Git tracks them. They do not get invented domain content.

## Technology decisions

| Choice | Decision |
| --- | --- |
| Runtime | Node.js 24.21.0 Active LTS (Krypton). Node 26 is newer but still Current until 2026-10-28, so it is not the recommended line yet. |
| Package manager | npm workspaces. Commit `package-lock.json`. |
| App tool | Current stable Vite, via the official `react-ts` template. |
| UI | React with local `useState`. Plain CSS. |
| Graph | `@xyflow/react` (React Flow), including Background, Controls, MiniMap, and `fitView`. |
| Language | TypeScript. |
| Maps | Source of truth in code. See ADR-001. |

The installed Node.js was v20.16.0, which does not satisfy Vite 8 (`^20.19.0 || >=22.12.0`). The bootstrap uses Node.js 24.21.0 LTS instead of the Current 26.x line.

## Commands that will be executed

From the repository root, after Node.js 24.21.0 is on `PATH`:

```text
git init -b main
npm create vite@latest apps/domain-map -- --template react-ts
```

Then set the workspace package name to `@rancho/domain-map`, install `@xyflow/react` in that workspace, and install from the root so `package-lock.json` is the workspace lockfile.

Verification:

```text
npm install
npm run lint:map
npm run build:map
npm run dev:map
```

The dev server is started only long enough to confirm it listens, then stopped.

## Validation criteria

- `node --version` satisfies Vite's engine range.
- `npm run lint:map` exits 0.
- `npm run build:map` exits 0.
- React Flow's stylesheet is imported from the application entry.
- AS-IS is the default view and shows the five dummy nodes in order, connected downward.
- The canvas supports pan, zoom, drag, and node selection.
- Selecting a node shows title, category, description, severity, and pain-point count.
- An empty selection shows an empty state.
- TO-BE and ARCHITECTURE render placeholders only.
- `node_modules` and build output are gitignored. `package-lock.json` is not.
- No backend, auth, database, or extra UI framework is present.

## Expected final state

A local `main` branch with one commit, `chore: bootstrap interactive domain map`, when Git identity is already configured. The domain-map app runs with:

```text
npm install
npm run dev:map
```

Vite's usual local URL is `http://localhost:5173/`.

The ranch production application remains undesigned.
