// Usage: DATABASE_URL=... npm run seed
import fs from "node:fs";
import pg from "pg";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());

const url = process.env.DATABASE_URL;
if (!url) { console.error("Set DATABASE_URL (your Tiger Data connection string)"); process.exit(1); }
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();
await client.query(fs.readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"));
const places = JSON.parse(fs.readFileSync(new URL("../data/places.json", import.meta.url), "utf8"));
for (const p of places) {
  await client.query(
    `INSERT INTO places (id,name,category,tags,price,vibes,open,close,age21,group_max,station,walk,trending,blurb)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, category=EXCLUDED.category, tags=EXCLUDED.tags,
       price=EXCLUDED.price, vibes=EXCLUDED.vibes, open=EXCLUDED.open, close=EXCLUDED.close, age21=EXCLUDED.age21,
       group_max=EXCLUDED.group_max, station=EXCLUDED.station, walk=EXCLUDED.walk, trending=EXCLUDED.trending, blurb=EXCLUDED.blurb`,
    [p.id, p.name, p.category, p.tags, p.price, p.vibes, p.open, p.close, p.age21, p.groupMax, p.station, p.walk, p.trending, p.blurb]
  );
}
console.log(`Seeded ${places.length} places into Tiger Data ✓`);
await client.end();
