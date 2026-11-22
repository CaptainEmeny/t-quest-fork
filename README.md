# T-Quest 🚋

**Your night out, routed by the T.** Tell T-Quest your budget, crew size, time, starting station, vibe and craving. Gemini calls our place-search and last-train tools, then returns a route from real spots in our Tiger Data database with live train times, per-person cost, and a ride-home warning.

Built at BostonHacks 2026 for the **Bos(tons) of Eats and Streets** track.

## How it works
1. **Form**: budget/person, group size, hours, start station, vibe (chill / big night / explore / study / late night), craving, 21+ toggle
2. **Server + Gemini API**: the server searches places in Tiger Data Postgres (with a local JSON fallback), then Gemini chooses and explains stops from those results
3. **Server** turns the plan into a route: T line, transfers, "get off at" stop, **live next-train times** (MBTA predictions API), cost per person and for the whole crew, warnings (over budget, too long, last train)
4. **Gamification**: check in at each stop to collect stamps; finishing a quest unlocks badges (line riders, Night Owl)
5. **Reliability**: no Gemini key or the API fails → rule-based fallback planner. No DATABASE_URL → local `data/places.json`. The demo never dies.

## Run it
```bash
npm install
cp .env.example .env.local   # add your keys
npm run seed                 # creates the users and places tables
npm run dev                  # http://localhost:3000
```

## Authentication

The login and signup pages use the integrated Next.js auth routes:

- `DATABASE_URL` connects to the Postgres/Tiger Data database
- `JWT_SECRET` signs and verifies the two-hour session token
- New accounts are stored in the `users` table with bcrypt password hashes
- The quest page requires a valid session; use the Log out button to end it

## Tiger Data setup
1. Create a free service at Tiger Data and copy the connection string into `DATABASE_URL`
2. `npm run seed` creates the `places` table and loads `data/places.json`

## Deploy
1. Import the repository into Vercel and keep the Next.js framework preset so API routes run as serverless functions.
2. Add `DATABASE_URL`, `JWT_SECRET`, and `GOOGLE_GENERATIVE_AI_API_KEY` in **Project Settings → Environment Variables**. Use the production Postgres connection string and a long, random JWT secret; do not use `NEXT_PUBLIC_` for secrets.
3. Before using signup and saved quests, run `npm run seed` with `DATABASE_URL` set to the production database. This creates the `users`, `saved_quests`, and `places` tables and loads the starter places; it is safe to rerun after schema updates. The seed script reads `.env.local` when run locally.
4. Deploy the project, then point your GoDaddy Registry domain at the Vercel project.

The auth and quest API routes verify the session cookie on the server. Authentication requires `JWT_SECRET` and `DATABASE_URL`; quest place lookups use `DATABASE_URL` when configured and otherwise fall back to the bundled JSON data.

## Stack
Next.js 15 · Gemini API · Tiger Data (Postgres) · MBTA v3 API

## ⚠️ Data note
`data/places.json` is a starter list. Prices and hours are approximate, so verify before the demo and add more spots.
