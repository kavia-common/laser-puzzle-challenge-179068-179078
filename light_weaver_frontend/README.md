# Light Weaver Frontend (React)

Modern, lightweight React frontend for the Light Weaver MVP.

## Features

- Clean, responsive UI with Ocean Professional theme
- Playable single-level laser puzzle with live beam simulation
- Offline-friendly PWA: the game logic and UI work offline
- API status badge that pings the backend `/version` endpoint with a timeout and graceful fallback

## Running locally

Start the backend first (default on port 3001), then start the frontend (port 3000):

```bash
# Backend (in ../laser-puzzle-challenge-179068-179079/backend)
npm install
npm run dev  # or: npm start

# Frontend (in this folder)
npm install
npm start
```

By default, the frontend expects the backend at the same host on port `3001`. You can override this via an environment variable:

```bash
# Unix/Mac
REACT_APP_BACKEND_URL="http://localhost:3001" npm start

# Windows (PowerShell)
set REACT_APP_BACKEND_URL=http://localhost:3001
npm start
```

## API status badge

- Located in the top-right of the header.
- Attempts a GET to `<BACKEND_URL>/version` with a 2.5s timeout.
- States:
  - OK: backend reachable (shows `API <version>` when available)
  - Degraded: request failed but browser is online
  - Offline: browser offline or request timed out
- The request uses `cache: 'no-store'` and `Cache-Control: no-store` to avoid SW/browser caching.

## Service Worker and offline behavior

- A minimal service worker is registered from `public/service-worker.js`.
- It only caches an app shell (`/`, `/index.html`), avoids intercepting cross-origin requests and requests to other ports, and respects `no-store` directives.
- Backend API calls are not cached and are allowed to pass through to the network.
- Gameplay continues offline; the API badge will show “Offline”.

## Developer performance instrumentation

To enable lightweight performance timings (console.time) for the beam tracer and board drawing, open the browser console and run:

```js
window.__LW_DEV = true;
```

Reload to see timing logs.

## Scripts

- `npm start` – start local dev server on http://localhost:3000
- `npm test` – run tests
- `npm run build` – production build

## Endpoints (backend)

- `GET /` – health
- `GET /version` – version/build info
- `GET /levels` – list levels
- `GET /levels/:id` – get level by id

For interactive API docs, visit backend `/docs`.
