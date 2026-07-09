# ColdMailer AI — Frontend

Modern, responsive SaaS UI for a Cold Email Platform. Built with **Angular 21** (standalone components + signals) and **Tailwind CSS**, with light/dark mode and a Linear/Vercel-style design language.

## Stack

| Concern      | Choice                                  |
| ------------ | --------------------------------------- |
| Framework    | Angular 21 (standalone, signals, `@if`/`@for`) |
| Styling      | Tailwind CSS 3 (class-based dark mode)  |
| Icons        | lucide-angular                          |
| Charts       | Custom lightweight SVG (no extra deps)  |
| Font         | Inter                                   |

Brand color `#2563EB` (blue), success accent emerald.

## Getting started

```bash
cd frontend
npm install        # if not already installed
npm start          # → http://localhost:4200
npm run build      # production build → dist/frontend
```

## Structure

```
src/app/
  app.ts               # root: layout + toast + confirm overlays
  app.routes.ts        # lazy-loaded routes
  core/
    theme.service.ts   # light/dark, persisted, no-flash
    toast.service.ts   # toast notifications
    confirm.service.ts # promise-based confirm dialogs
    data.service.ts    # mock data store (signals)
    models.ts
  shell/
    sidebar.ts topbar.ts layout.ts
  shared/
    page-header.ts status-badge.ts empty-state.ts
    toast-container.ts confirm-dialog.ts send-progress-modal.ts
  pages/
    dashboard.ts compose.ts campaigns.ts history.ts
    templates.ts contacts.ts analytics.ts settings.ts
```

## Pages

- **Dashboard** — 4 stat cards + recent-campaigns table (with loading skeletons)
- **Compose** — rich-text editor (bold/italic/underline/list/link), `{{variable}}` insertion, recipient chips + CSV drag-drop preview, attachments, sending config, live split-screen preview, animated send-progress modal
- **Campaigns** — searchable/filterable table with progress bars
- **Email History** — search, status filter, pagination, details drawer
- **Templates** — card grid (preview/edit/duplicate/delete/use)
- **Contacts** — searchable table
- **Analytics** — KPI cards, weekly bars, delivery donut, monthly area chart
- **Settings** — Gmail connection, signature, resume, theme, notifications

### UX
Toasts, confirmation dialogs, modals, loading skeletons, empty states, keyboard-dismissible overlays, sticky action bars, and a fully responsive mobile layout with a slide-in sidebar.

## Backend integration

The app is wired to the Express API (no mock data). Configure the base URL in
`src/app/core/api.config.ts` (defaults to `http://localhost:5050/api`).

- `core/api.service.ts` — typed `HttpClient` wrapper; unwraps the `{ success, data }` envelope and maps Mongo docs → view models.
- `core/data.service.ts` — loads campaigns / history / templates / contacts from the API into signals on startup; mutations (delete/duplicate) call the API optimistically.
- **Dashboard** stats come from `/api/dashboard/stats`; **Analytics** charts come from `/api/dashboard/analytics` (weekly/monthly/breakdown/top campaigns are all real DB aggregations).

Start the backend first (`cd ../backedn && npm run dev`), then `npm start` here.
