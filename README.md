# ScrapGullak Web (React + Vite + Tailwind)

Customer site, B2B corporate portal and Admin yard dashboard for ScrapGullak, Noida & Greater Noida's digital scrap recycling platform.

## Run

```bash
npm install
cp .env.example .env   # optional: point at your backend
npm run dev            # http://localhost:5173
```

The Spring Boot backend is expected at `http://localhost:8080/api/v1` (CORS already allows `http://localhost:5173`).
**The backend is optional.** If it's unreachable, every call falls back to a built-in mock backend (`src/services/mockStore.js`) that applies the same business rules and persists to `localStorage`. The pill in the top bar shows "Live API" or "Demo data". Use "Reset demo data" in the footer to start over.

## Demo role switcher

The top bar switches between **Customer**, **B2B corporate** and **Admin yard**. When optional local demo account variables are configured in `.env`, the app tries those accounts first; otherwise it uses mock sessions. Do not put production credentials in Vite variables: they are included in the public browser bundle.

The GitHub Pages build uses mock sessions and mock data only. It does not send API requests, authenticate users, dispatch pickups, or transfer payments.

## Structure

```
src/
  services/
    api.js          Axios instance, JWT interceptors, connection status, mock fallback, all endpoints
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
| Login / role switch | `POST /auth/login`, `POST /auth/register` |
| Rate card, ticker | `GET /rates/live` |
| Gullak calculator | `POST /rates/estimate` `{ items: [{ categoryId, weightKg }] }` |
| Booking widget, B2B form | `POST /customer/pickups` |
| Passbook | `GET /customer/pickups`, `GET /customer/gullak-passbook` |
| Rate controller | `PUT /admin/rates/{categoryId}` `{ buyingRateInr, millSellingRateInr }` |
| Dispatch board | `PATCH /admin/pickups/{orderId}/assign/{agentId}` |
| Yard tracker | `POST /admin/inventory/process` `{ categoryId, stage, weightKg }`, stage = `SEGREGATE` / `BALE` / `DISPATCH` |
| KPI strip | `GET /admin/dashboard/metrics` |

Supporting endpoints the admin screens also call (add them to `AdminController` if your backend doesn't have them yet; until then the UI falls back to mock data on 404): `GET /admin/pickups`, `GET /admin/agents`, `GET /admin/inventory`, `GET /admin/rates` (full rate card with mill selling rates; the public `/rates/live` omits `millSellingRateInr` for non-admin callers).

Extra fields sent with a pickup (`scrapGroups`, `companyName`, `contactPhone`, `notes`, `corporateDetails`) are safe to ignore server-side, or add them to `CreatePickupRequest`. Photos are sent as `photoUrl: null` to the real backend; wire an upload endpoint (S3/Cloudinary) where marked `TODO` in `api.js`.

Responses may be raw DTOs or wrapped as `{ success, message, data }`; Spring `Page` responses (`content`) are also handled.

## Hosting

`npm run build` outputs `dist/`. On static hosts without SPA rewrites, build with `VITE_ROUTER_MODE=hash`.

## GitHub Pages demo

This repository is configured to build a **public interactive demo only**. It uses the in-browser mock data, hash-based routes and a visible notice that bookings and payments are simulated. It does not connect to an API or send money.

To deploy, put the contents of this website project (including `.github/workflows/deploy-pages.yml`) at the root of the `ScrapGullak` GitHub repository. Push to `main`; the workflow builds the site, enables GitHub Pages for the repository if needed, and deploys `dist`. The workflow requires the repository Actions token to have the configured `pages: write` and `id-token: write` permissions.

The expected demo address is `https://bramhprakashtiwari9.github.io/ScrapGullak/`. App navigation uses URL fragments (for example, `/#/rates`) so direct links work on GitHub Pages.

Do not add live API URLs, customer or agent credentials, payout credentials, or private company data to this static deployment. A live service requires a separately deployed HTTPS backend, real customer and agent sign-in screens, server-side role authorization, and a verified payment/payout integration.
