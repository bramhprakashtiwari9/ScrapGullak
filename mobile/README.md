# ScrapGullak Mobile (Expo SDK 51 · Expo Router · NativeWind)

One Android/iOS app with two modes, switched from the header toggle:

- **Customer mode**: account registration/sign-in, Gullak balance, live Noida rate ticker, visual scrap cart with camera upload, live pickup tracker, passbook with digital weight slips.
- **Pickup agent mode**: provisioned agent sign-in, today's route grouped by sector (call / Google Maps navigation), and the on-site digital weighing & billing terminal.
- **Administrator access**: provisioned staff sign-in; the mobile app directs administrators to the separately configured web console.

## Run

```bash
npm ci
npx expo start          # scan the QR with Expo Go, or press "a" for an Android emulator
npm run web             # same app in a browser at http://localhost:8081
```

### Production bundles

```bash
npm run build:android   # → dist/android (Hermes bytecode + assets, for EAS Update / a native shell)
npm run build:ios       # → dist/ios
npm run build:web       # → dist/web, a static single-page site; serve it with an index.html fallback
```

`EXPO_PUBLIC_*` values are inlined at build time, so set `EXPO_PUBLIC_API_URL` before building. The build scripts pass `--clear` so a value from an earlier build is never reused from Metro's cache. A web build without it calls `http://localhost:8080/api/v1`, and the backend only allows browser calls from the origins listed in its CORS config (`http://localhost:8081`, `:19006`, `:5173`, LAN `192.168.*`). Installable APK/IPA files need EAS Build (`eas build`, Expo account) or a local Android SDK / Xcode.

Real-account mode requires a reachable Spring Boot API; a network failure is shown instead of silently displaying mock data. For an explicit local demo, set `EXPO_PUBLIC_DEMO_MODE=true`; this mode uses in-memory sample data and the role switcher. Do not use demo mode for real accounts.

### Connecting to the backend

Base URL resolution (`src/services/api.ts`):
1. `EXPO_PUBLIC_API_URL` if set (copy `.env.example` to `.env`)
2. the Expo dev server's LAN IP on port 8080 (works for Expo Go on a phone on the same Wi-Fi)
3. `http://10.0.2.2:8080/api/v1` on the Android emulator, `http://localhost:8080/api/v1` on the iOS simulator

Customer accounts register in the app. Agent and administrator accounts must be provisioned by ScrapGullak staff; the server determines and enforces each role.

## Try the full loop offline

1. Customer mode → **Sell scrap**: tap tiles, pick weight, snap a photo, choose slot, confirm.
2. **Track**: about 8 seconds later the mock dispatch desk assigns agent Ravi Kumar.
3. Switch to **Pickup agent** → the booking appears on today's route → **Start digital weighing**.
4. Tap grades (e.g. Gatta 18.5 kg, HMS Iron 9 kg, Copper 1.2 kg), choose UPI, **Demo UTR**, **Generate digital receipt & mark paid**.
5. Switch back to Customer → balance, passbook and slip are updated.

## Folder structure

```
App.tsx                         Root: SafeArea + AppProvider + ModeHeader + <Slot/>
app/
  login.tsx                     Customer registration/sign-in and provisioned staff sign-in
  admin/index.tsx               Admin web-console handoff
  _layout.tsx                   Re-exports App.tsx as the Expo Router root layout
  index.tsx                     Routes signed-in users by server-assigned role
  customer/
    _layout.tsx                 Bottom tabs
    index.tsx                   Home: balance card, rate ticker, book CTA, active pickups
    book.tsx                    Visual scrap cart + expo-image-picker camera/gallery
    track.tsx                   Live 4-step status tracker (polls every 10 s)
    passbook.tsx                Lifetime ₹, UPI total, expandable digital weight slips
  agent/
    _layout.tsx                 Stack
    index.tsx                   Today's sector route, call + navigate
    weigh/[id].tsx              Weighing terminal → POST /agent/pickups/{id}/complete-weighing
src/
  services/api.ts               Axios, JWT interceptor, base-URL detection, explicit-demo mock fallback, endpoints
  services/mockStore.ts         Offline backend (same rules as Spring Boot services)
  services/mockData.ts          Seed: 12 categories, agent route, customer history
  context/AppContext.tsx        Mode, session, rates, sector, connection status
  components/                   ModeHeader, BalanceCard, RateTicker, StatusTracker, WeightSlip,
                                Button, Chip, Section (Card/EmptyState), CategoryIcon, SectorPicker, GullakMark
  utils/                        format (₹ Indian grouping, kg, dates), constants,
                                alert (.web.ts maps Alert.alert to browser dialogs; RN Web's is a no-op)
  types.ts                      DTO types matching the backend entities
```

## Notes

- Photos: local file URIs are kept in demo mode; for the real backend add a multipart upload and send its URL (see `TODO` in `api.ts`).
- The public GitHub Pages website is demo-only and does not accept real logins. Configure a deployed admin web-console URL with `EXPO_PUBLIC_ADMIN_PORTAL_URL` for production builds.
- Android cleartext HTTP to a dev backend is enabled via `expo-build-properties` for development builds; Expo Go already allows it.
- `npm run typecheck` runs `tsc --noEmit` (strict).
