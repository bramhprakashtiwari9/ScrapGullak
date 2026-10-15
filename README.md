# ScrapGullak

ScrapGullak website and Spring Boot backend.

## Project layout

- `web/` — React/Vite customer and demo dashboards.
- `backend/` — Java 21 / Spring Boot API.

## Build and deployment

Every push to `main` builds and tests the backend with Maven, builds the website with Vite, and type-checks/exports the mobile app. The web artifact deploys to GitHub Pages only after all builds pass.

In the repository settings, set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**. The Actions workflow cannot change this repository-level setting itself.

GitHub Pages serves only the static website; it does not host the API. The build defaults to the mock-data demo (`VITE_PUBLIC_DEMO=true`) when the repository variable is unset, so deploying source changes alone does not enable real sign-in.

## Temporary Render backend demo

`render.yaml` describes a free Render Docker service and free PostgreSQL database. To create them, sign in to Render, create a new Blueprint, connect this repository, review the two free resources, and apply the Blueprint. Render generates unique JWT and seed-account passwords; keep them private. The database is temporary and may expire after Render's free retention period, and the free API instance can sleep when idle. Do not use this setup for production data or payments.

The Pages workflow includes the customer registration/sign-in and provisioned staff sign-in experience. After the API is deployed and verified, set repository **Settings → Secrets and variables → Actions → Variables** to `VITE_API_URL` (the API's `/api/v1` URL) and `VITE_PUBLIC_DEMO=false`, then run the workflow. The Render blueprint already allows the Pages origin for CORS. Keep `VITE_PUBLIC_DEMO=true` until the API is live: otherwise the Pages app will correctly show an API connection error rather than pretend to use real accounts.

The free Render blueprint is for temporary testing only. Real payments, customer data, secure production configuration and service reliability need a production hosting plan and a separate payment/security review. Agent and admin accounts must be provisioned by the backend; customers can self-register.

The expected public demo address is <https://bramhprakashtiwari9.github.io/ScrapGullak/>.

## Local development

See [`web/README.md`](web/README.md) for the Vite website and [`backend/README.md`](backend/README.md) for the Java API and Docker Compose setup. The backend's default seed accounts, database passwords and JWT key are development-only; never use those defaults on an internet-facing server.
