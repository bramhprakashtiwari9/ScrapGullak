# ScrapGullak

ScrapGullak website and Spring Boot backend.

## Project layout

- `web/` — React/Vite customer and demo dashboards.
- `backend/` — Java 21 / Spring Boot API.

## Build and deployment

Every push to `main` builds and tests the backend with Maven and builds the web demo with Vite. The web artifact deploys to GitHub Pages after both builds pass.

In the repository settings, set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**. The Actions workflow cannot change this repository-level setting itself.

GitHub Pages hosts only the static, mock-data web demo. It does not run or host the API. Backend production hosting requires a separate Java/container host, a managed database, secure production environment variables, and an API URL configured for the live web app. No production API or payment service is configured here.

## Temporary Render backend demo

`render.yaml` describes a free Render Docker service and free PostgreSQL database. To create them, sign in to Render, create a new Blueprint, connect this repository, review the two free resources, and apply the Blueprint. Render generates unique JWT and seed-account passwords; keep them private. The database is temporary and may expire after Render's free retention period, and the free API instance can sleep when idle. Do not use this setup for production data or payments.

The public GitHub Pages website remains a mock-only demo and does not call this API. Connecting it to a live API requires production customer/agent authentication UX and a separate review of the payment and data-handling flows.

The expected public demo address is <https://bramhprakashtiwari9.github.io/ScrapGullak/>.

## Local development

See [`web/README.md`](web/README.md) for the Vite website and [`backend/README.md`](backend/README.md) for the Java API and Docker Compose setup. The backend's default seed accounts, database passwords and JWT key are development-only; never use those defaults on an internet-facing server.
