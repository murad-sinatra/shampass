# ShamPass

Mobile-first booking for intercity buses in Syria. Passengers search a route, choose a seat and its fare, pay with ShamCash, Visa, or Mastercard, and board with a QR ticket. Bus companies use the same app to add routes, buses, seats, prices, and departures, and to move a trip from scheduled to boarding, on the way, and arrived.

Arabic is the default language. English is one tap away.

Checkout is still a demo. Nothing is sent to a bank or ShamCash, and nothing is charged. Google sign-in and separate provider and passenger apps can come later. So can GitHub Actions.

## Run with Docker

```bash
docker compose up --build
```

Open http://localhost:8080. The web container serves the React app and proxies `/api` to the NestJS API. Postgres keeps the data in the `shampass-pg` volume.

```bash
docker compose down -v
```

That deletes the database volume so the next start seeds it again.

## Demo accounts

| Who | Username | Password |
| --- | --- | --- |
| Passenger | `lina` | `lina1234` |
| Sham Line | `shamline` | `shamline123` |
| Barada Express | `barada` | `barada123` |
| Qasioun Coach | `qasioun` | `qasioun123` |
| Orontes | `orontes` | `orontes123` |
| Jabal Coach | `jabal` | `jabal123` |

Sample cards: Visa `4242 4242 4242 4242`, Mastercard `5555 5555 5555 4444`. Any future expiry and any 3-digit CVC. ShamCash accepts a Syrian mobile (`09xxxxxxxx`) and any 6-digit code.

## Stack

- React 19, TypeScript, and Vite for the app in `frontend/`
- NestJS and Prisma for the API in `backend/`
- PostgreSQL 16
- Docker Compose runs the database, the API, and nginx for the built frontend
- UI components come from [mors-component-library](https://github.com/murad-sinatra/mors-component-library) at commit `0a2163e`

Login is username and password. Tickets, notifications, and trip status live in Postgres.
