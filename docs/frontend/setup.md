# Frontend setup

The TemariCom frontend is a React application written in TypeScript and
powered by Vite. The overall project follows a modular monolith architecture:
the backend is deployed as one Go application, while its business domains are
kept in independent modules. The frontend follows the same domain-oriented
approach through feature modules.

See the complete repository layout in
[`docs/architecture.md`](../architecture.md).

## Prerequisites

- Node.js with npm
- Git

Check the installed versions:

```bash
node --version
npm --version
```

## Install dependencies

From the repository root, enter the frontend directory and install the
dependencies:

```bash
cd web
npm install
```

## Start the development server

Run the Vite development server:

```bash
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`.

The frontend entrypoint is
[`src/app/main.tsx`](../../web/src/app/main.tsx), and the root component is
[`src/app/App.tsx`](../../web/src/app/App.tsx).

## Available scripts

Run these commands from the `web` directory:

| Command            | Description                                   |
| ------------------ | --------------------------------------------- |
| `npm run dev`      | Start the Vite development server             |
| `npm run lint`     | Check the source with ESLint                  |
| `npm run build`    | Create a production build                     |
| `npm run preview`  | Preview the production build locally          |
| `npx tsc --noEmit` | Type-check the project without emitting files |

## Production build

Build the frontend with:

```bash
npm run build
```

To preview the generated build:

```bash
npm run preview
```

## Import alias

The frontend defines the `@` alias for the `src` directory. Use it instead of
long relative paths:

```tsx
import "@/global.css";
import App from "@/app/App";
```

The alias is configured in both
[`tsconfig.json`](../../web/tsconfig.json) and
[`vite.config.ts`](../../web/vite.config.ts).

## Browser logo

The browser favicon is stored at
[`web/public/assets/temaricom-logo.png`](../../web/public/assets/temaricom-logo.png)
and is referenced from `web/index.html`.
