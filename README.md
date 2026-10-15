# ScrapGullak

ScrapGullak website and Spring Boot backend.

## Project layout

- `web/` — React/Vite customer and demo dashboards.
- `backend/` — Java 21 / Spring Boot API.

## Build and deployment

Every push to `main` builds and tests the backend with Maven and builds the web demo with Vite. The web artifact deploys to GitHub Pages after both builds pass.

In the repository settings, set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**. The Actions workflow cannot change this repository-level setting itself.

GitHub Pages hosts only the static, mock-data web demo. It does not run or host the API. Backend production hosting requires a separate Java/container host, a managed database, secure production environment variables, and an API URL configured for the live web app. No production API or payment service is configured here.

The expected public demo address is <https://bramhprakashtiwari9.github.io/ScrapGullak/>.

## Local development

See [`web/README.md`](web/README.md) for the Vite website and [`backend/README.md`](backend/README.md) for the Java API and Docker Compose setup. The backend's default seed accounts, database passwords and JWT key are development-only; never use those defaults on an internet-facing server.
