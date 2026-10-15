# ScrapGullak Web (React + Vite + Tailwind)

Customer site, B2B corporate portal and Admin yard dashboard for ScrapGullak, Noida & Greater Noida's digital scrap recycling platform.

## Run

```bash
npm install
cp .env.example .env   # optional: point at your backend
npm run dev            # http://localhost:5173
```

The Spring Boot backend is expected at `http://localhost:8080/api/v1` (CORS already allows `http://localhost:5173`). Real-account mode requires a reachable backend; network errors are shown instead of silently switching to sample data. To explicitly run the mock experience locally, set `VITE_PUBLIC_DEMO=true`.

## Demo role switcher

The top-bar role switcher appears only in explicit demo mode. In real-account mode, customers can register and sign in, while administrators and agents sign in with accounts provisioned by ScrapGullak. The backend assigns and authorizes roles; staff self-registration is not available. Never put production credentials or secrets in Vite variables: they are included in the public browser bundle.

The GitHub Pages build uses mock sessions and mock data only. It does not send API requests, authenticate users, dispatch pickups, or transfer payments.

## Structure

```
src/
  services/
    api.js          Axios instance, JWT interceptors, connection status, explicit-demo mock fallback, all endpoints
    mockStore.js    Offline backend: rates, estimate, pickups, passbook, weighing, admin, inventory
    mockData.js     Seed: 12 Noida categories, yard stock, admin, 3 agents, customers, 14 pickups
    errors.js       ApiError
  context/AppContext.jsx   Session, demo view, live rates cache, toasts
  components/
    layout/         Navbar (role switcher + connection pill), Footer
    booking/        BookingWidget (4-step pickup scheduler)
    rates/          RateGrid (filterable), GullakCalculator (estimator)
    passbook/       GullakJar, StatusTracker, ReceiptModal
    admin/          MetricsStrip, RateMarginController, DispatchBoard, YardTracker
    ui/             Modal, Toaster, CategoryIcon, StatusBadge, EmptyState, Spinner, GullakMark
  pages/            LandingPage, RatesPage, PassbookPage, B2BPortalPage, AdminDashboard, NotFound
  utils/            format (₹, kg, dates, CO₂), constants (sectors, slots, groups), receipt, image
```

## API contract used

| Screen | Endpoint |
|---|---|
| Customer and staff login / customer registration | `POST /auth/login`, `POST /auth/register` |
| Rate card, ticker | `GET /rates/live` |
| Gullak calculator | `POST /rates/estimate` `{ items: [{ categoryId, weightKg }] }` |
| Booking widget, B2B form | `POST /customer/pickups` |
| Passbook | `GET /customer/pickups`, `GET /customer/gullak-passbook` |
| Rate controller | `PUT /admin/rates/{categoryId}` `{ buyingRateInr, millSellingRateInr }` |
| Dispatch board | `PATCH /admin/pickups/{orderId}/assign/{agentId}` |
| Yard tracker | `POST /admin/inventory/process` `{ categoryId, stage, weightKg }`, stage = `SEGREGATE` / `BALE` / `DISPATCH` |
| KPI strip | `GET /admin/dashboard/metrics` |

The admin screens also call `GET /admin/pickups`, `GET /admin/agents`, `GET /admin/inventory` and `GET /admin/rates` (full rate card with mill selling rates). Missing or failed API endpoints are shown as errors in real-account mode rather than being replaced by mock data.

Extra fields sent with a pickup (`scrapGroups`, `companyName`, `contactPhone`, `notes`, `corporateDetails`) are safe to ignore server-side, or add them to `CreatePickupRequest`. Photos are sent as `photoUrl: null` to the real backend; wire an upload endpoint (S3/Cloudinary) where marked `TODO` in `api.js`.

Responses may be raw DTOs or wrapped as `{ success, message, data }`; Spring `Page` responses (`content`) are also handled.

## Hosting

`npm run build` outputs `dist/`. On static hosts without SPA rewrites, build with `VITE_ROUTER_MODE=hash`.

## GitHub Pages demo

This repository builds and tests the Java backend in GitHub Actions and builds a **public interactive web demo**. The demo uses in-browser mock data, hash-based routes and a visible notice that bookings and payments are simulated. It does not connect to an API or send money. Passing the backend build does not deploy or host the API.

The repository contains `web/` and `backend/`. Push to `main`; the workflow builds and tests the backend and builds the web demo. It deploys the web artifact to GitHub Pages only after both builds pass. In the repository, open **Settings → Pages** and set **Build and deployment → Source** to **GitHub Actions**. GitHub does not permit the Actions token to enable Pages for this repository automatically.

The expected demo address is `https://bramhprakashtiwari9.github.io/ScrapGullak/`. App navigation uses URL fragments (for example, `/#/rates`) so direct links work on GitHub Pages.

Do not add customer or agent credentials, payout credentials, or private company data to this static deployment. GitHub Pages remains demo-only (`VITE_PUBLIC_DEMO=true`); it does not connect to an API or accept real accounts. To enable real accounts, deploy a separately hosted HTTPS backend and build with `VITE_PUBLIC_DEMO=false` plus a production `VITE_API_URL`, then verify CORS, server-side role authorization and the payment/payout integration. The API must be deployed first; a successful web build alone does not make accounts or payouts live.
