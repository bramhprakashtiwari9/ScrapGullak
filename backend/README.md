# ScrapGullak Backend

The Spring Boot API behind **ScrapGullak**, a doorstep scrap-pickup service in Noida. It covers the customer
"Gullak" passbook, field agents weighing scrap, yard inventory, and the admin dashboard. The web app
(`scrapgullak-web`) and the Expo mobile app already call this API. Both apps fall back to a built-in mock
whenever the backend can't be reached.

- Java 21, Spring Boot 3.3.5, Spring Security with stateless JWT (HS256, jjwt 0.12.6), Spring Data JPA
- Databases: MySQL (default), PostgreSQL, or H2 in memory (no setup needed)
- OpenAPI docs: `http://localhost:8080/swagger-ui.html` (raw spec at `/v3/api-docs`)
- Health checks: `/actuator/health`, `/actuator/health/liveness`, `/actuator/health/readiness`

## Quick start

### 1. Zero setup (H2 in memory)

You need JDK 21 and Maven 3.9 or later. No database is required.

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=h2
```

On Windows PowerShell, quote the argument:

```powershell
mvn spring-boot:run "-Dspring-boot.run.profiles=h2"
```

The API starts on `http://localhost:8080/api/v1` with the demo data already loaded. That data is a fresh copy
on every start, because the database is created when the app starts and dropped when it stops.

### 2. MySQL (default profile)

```bash
# needs MySQL 8 on localhost:3306; the database is created automatically if it does not exist
DB_USERNAME=root DB_PASSWORD=root mvn spring-boot:run
```

### 3. PostgreSQL

```bash
# the database must already exist: createdb scrapgullak
SPRING_PROFILES_ACTIVE=postgres DB_USERNAME=postgres DB_PASSWORD=postgres mvn spring-boot:run
```

### 4. Docker Compose (MySQL 8.4 + API)

```bash
docker compose up --build
```

`docker-compose.yml` also has a commented-out PostgreSQL service you can use instead of MySQL.

### Building a jar

```bash
mvn clean package                       # runs the tests (they use the H2 profile)
java -jar target/scrapgullak-backend-1.0.0.jar --spring.profiles.active=h2
```

## Profiles

| Profile | Database | Schema | Use for |
|---|---|---|---|
| `mysql` (default) | `jdbc:mysql://${DB_HOST:localhost}:${DB_PORT:3306}/${DB_NAME:scrapgullak}` | `ddl-auto: ${JPA_DDL_AUTO:update}` | Local dev and production |
| `postgres` | `jdbc:postgresql://${DB_HOST:localhost}:${DB_PORT:5432}/${DB_NAME:scrapgullak}` | `ddl-auto: ${JPA_DDL_AUTO:update}` | Managed Postgres hosting |
| `h2` | `jdbc:h2:mem:scrapgullak` | `create-drop` | Zero-setup demos and tests |

Every timestamp is stored in UTC. Business days, such as "today" on the dashboard and the 60-day booking
window, follow `APP_TIMEZONE` (default `Asia/Kolkata`).

## Seed data and credentials

`DataInitializer` can create demo accounts and sample pickups when seeding is enabled. Seed passwords are
configurable through `SEED_ADMIN_PASSWORD`, `SEED_AGENT_PASSWORD` and `SEED_CUSTOMER_PASSWORD`. Do not rely on
or publish default demo credentials. For any shared or production deployment, disable demo seeding, provision
real accounts securely, and set unique database credentials and a strong `JWT_SECRET`.

## API

All routes are under `/api/v1`. Successful responses return the DTO directly, with no wrapper. Creating
something returns `201`; everything else returns `200`. Errors always come back in the same shape:

```json
{ "timestamp": "2026-10-14T05:30:00Z", "status": 422, "error": "Unprocessable Entity",
  "message": "Pick a date between today and the next 60 days.", "path": "/api/v1/customer/pickups",
  "fieldErrors": { "scheduledDate": "..." } }
```

`message` is written for people to read, and both frontends display it as-is. `fieldErrors` appears only
when validation fails (400).

To authenticate, send `Authorization: Bearer <token>`. You get the token from login or register. It lasts
`JWT_EXPIRATION_MINUTES` (default 1440, which is 24 hours).

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/auth/register` | public | Create a CUSTOMER account (household, or corporate with a GSTIN). Returns `201` with the auth response |
| POST | `/auth/login` | public | Log in with `{ phone, password }`. Returns `{ token, tokenType, expiresInSeconds, role, user, passbook }`. `passbook` is included for customers only |
| GET | `/auth/me` | signed in | The current user |
| GET | `/rates/live` | public | Active scrap rates. `millSellingRateInr` is included only for ADMIN |
| POST | `/rates/estimate` | public | Price a list of `{ categoryId, weightKg }` lines |
| POST | `/customer/pickups` | CUSTOMER | Book a pickup (`201`). The date must fall between today and today + 60 days |
| GET | `/customer/pickups` | CUSTOMER | My pickups, newest first, with weight receipts |
| POST | `/customer/pickups/{orderId}/cancel` | CUSTOMER | Cancel my pickup while it is BOOKED or AGENT_ASSIGNED |
| GET | `/customer/gullak-passbook` | CUSTOMER | Earnings, kg recycled, CO2 saved, and paid transactions |
| GET | `/agent/pickups/assigned?date=yyyy-MM-dd` | AGENT | My route for the day, overdue pickups included, sorted by sector and then time slot |
| POST | `/agent/pickups/{orderId}/start` | AGENT | Mark a pickup out for pickup |
| POST | `/agent/pickups/{orderId}/complete-weighing` | AGENT, ADMIN | Weigh, pay and credit the Gullak. Also adds the scrap to raw yard stock |
| GET | `/admin/rates` | ADMIN | All categories, inactive ones included, with mill rates |
| PUT | `/admin/rates/{categoryId}` | ADMIN | Update the buying rate, the mill rate and `isActive` |
| GET | `/admin/pickups?status=` | ADMIN | All pickups, newest first, optionally filtered by status |
| PATCH | `/admin/pickups/{orderId}/assign/{agentId}` | ADMIN | Assign or reassign an agent |
| PATCH | `/admin/pickups/{orderId}/cancel` | ADMIN | Cancel any open pickup |
| GET | `/admin/agents` | ADMIN | Field agents and how many active pickups each has |
| GET | `/admin/inventory` | ADMIN | Yard stock per category |
| POST | `/admin/inventory/process` | ADMIN | Move stock to the next stage: `SEGREGATE` (raw to sorted), `BALE` (sorted to baled), `DISPATCH` (baled stock leaves on the mill truck) |
| GET | `/admin/dashboard/metrics` | ADMIN | Today's procurement cost, mill resale value and margin, open pickups, and truck alerts |

Pickup status moves through `BOOKED`, `AGENT_ASSIGNED`, `OUT_FOR_PICKUP` and `PAID` in that order. An open
pickup can move to `CANCELLED` instead. Weighing a pickup takes it straight to `PAID`, inside a single
transaction.

## Frontend integration

### Web app (Vite, `http://localhost:5173`)

- The API base URL comes from `VITE_API_URL` and defaults to `http://localhost:8080/api/v1`, so a local run
  needs no configuration.
- CORS allows `http://localhost:5173` and `http://127.0.0.1:5173` by default. For other origins, set
  `CORS_ALLOWED_ORIGIN_PATTERNS` (comma-separated, wildcard patterns allowed).
- The local demo role switcher can use optional credentials from the web app's `.env`. Leave them unset to use
  mock sessions. Never put production credentials in Vite variables.
- If the backend is down, the web app silently switches to its in-browser mock. A session that shows
  `mock.`-prefixed tokens is not talking to this server.

### Mobile app (Expo)

- The API base URL comes from `EXPO_PUBLIC_API_URL`. If that is unset, the app uses the LAN IP of the Expo dev
  server (`http://<lan-ip>:8080/api/v1`). Failing that, it uses `http://10.0.2.2:8080/api/v1` on the Android
  emulator and `http://localhost:8080/api/v1` on iOS.
- On a physical phone running Expo Go, keep the phone and the computer on the same Wi-Fi and allow port 8080
  through the computer's firewall. The server listens on all interfaces by default.
- Native requests send no `Origin` header, so CORS does not affect them. Expo web (`http://localhost:8081`
  or `:19006`) and `http://192.168.*.*:*` origins are allowed by default.
- The demo logins use `EXPO_PUBLIC_DEMO_CUSTOMER_PHONE` / `_PASSWORD` and `EXPO_PUBLIC_DEMO_AGENT_PHONE` /
  `_PASSWORD`. Their defaults match the seeded accounts.

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `8080` | HTTP port |
| `SPRING_PROFILES_ACTIVE` | `mysql` | `mysql`, `postgres` or `h2` |
| `DB_HOST` / `DB_PORT` / `DB_NAME` | `localhost` / `3306` or `5432` / `scrapgullak` | Database location |
| `DB_USERNAME` / `DB_PASSWORD` | `root`/`root` (MySQL), `postgres`/`postgres` (Postgres) | Database credentials |
| `JPA_DDL_AUTO` | `update` | Hibernate schema mode for MySQL and Postgres |
| `JWT_SECRET` | dev-only key | Base64 HMAC key, at least 32 bytes once decoded. **Always override in production**, e.g. with `openssl rand -base64 48` |
| `JWT_EXPIRATION_MINUTES` | `1440` | How long a token stays valid |
| `JWT_ISSUER` | `scrapgullak` | The token's `iss` claim |
| `APP_TIMEZONE` | `Asia/Kolkata` | Business day zone (today's metrics, the booking window, seed dates) |
| `CORS_ALLOWED_ORIGIN_PATTERNS` | localhost:5173, 127.0.0.1:5173, localhost:8081, localhost:19006, `http://192.168.*.*:*`, `exp://*` | Browser origins allowed by CORS |
| `SEED_ENABLED` | `true` | Seed categories, yard stock and the 3 core accounts |
| `SEED_DEMO_DATA` | `true` | Also seed the extra agents, the corporate customer, walk-in customers and sample pickups. Set to `false` in production |
| `SEED_ADMIN_PASSWORD` / `SEED_AGENT_PASSWORD` / `SEED_CUSTOMER_PASSWORD` | Development-only defaults | Passwords for newly seeded accounts |

### Production checklist

- Set `JWT_SECRET`, `DB_PASSWORD` and `SEED_DEMO_DATA=false`.
- Disable demo seeding and provision real accounts before exposing the service publicly.
- Prefer `JPA_DDL_AUTO=validate` together with managed migrations once the schema is stable.
- Limit `CORS_ALLOWED_ORIGIN_PATTERNS` to your real web origin.
