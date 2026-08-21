# Demo OA × NovaKit — Frontend Showcase

This repository is a public-safe, frontend-only portfolio demo. It contains two
Vue applications and an in-browser mock API. There is no Express/FastAPI
backend, production database, company identity, private endpoint, or service
credential in this repository.

## Apps

- `oa/` — employee, department, asset, account, form, and approval UI.
- `novakit/` — dark green System Controller with agent hub, workflows, modules, observability, and mock chat.

All records use `DEMO-*` identifiers and `example.com`. Mutations are stored in
the browser only and can be reset by clearing site data.

## Run locally

```bash
cd oa && pnpm install && pnpm dev
cd novakit && npm install && npm run dev
```

Demo credentials are prefilled in both applications.

## Build

```bash
cd oa && pnpm build
cd novakit && npm run build
```

Both `dist/` directories are static-hosting compatible.
