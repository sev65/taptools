/**
 * npm run db:setup   -> create tables + your admin login
 * npm run db:demo    -> same, plus a demo business with 90 days of fake taps
 *                       (handy for showing the dashboard during a pitch)
 *
 * Admin login comes from ADMIN_EMAIL / ADMIN_PASSWORD in .env.
 */
import "./load-env";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { businesses, users, locations, cards, taps } from "@/db/schema";
import { newCardCode } from "@/lib/taps";

async function main() {
  const ddl = readFileSync(join(process.cwd(), "db/migrate.sql"), "utf8");
  for (const stmt of ddl.split(";").map((s) => s.trim()).filter(Boolean)) {
    await db.execute(sql.raw(stmt));
  }
  console.log("Tables ready.");

  const email = (process.env.ADMIN_EMAIL ?? "").toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (!email || password.length < 8) {
    console.log("Set ADMIN_EMAIL and ADMIN_PASSWORD (8+ chars) in .env to create your admin login.");
  } else {
    const existing = await db.select().from(users).where(eq(users.email, email));
    if (existing.length === 0) {
      await db.insert(users).values({ email, passwordHash: await bcrypt.hash(password, 10), role: "admin", name: "Admin" });
      console.log(`Admin login created: ${email}`);
    } else console.log(`Admin login already exists: ${email}`);
  }

  if (process.argv.includes("--demo")) await seedDemo();
  process.exit(0);
}

async function seedDemo() {
  const demoEmail = "demo@taptools.test";
  if ((await db.select().from(users).where(eq(users.email, demoEmail))).length) {
    console.log("Demo business already exists.");
    return;
  }
  const [biz] = await db.insert(businesses).values({ name: "Fade Factory Barbershop", analyticsEnabled: true }).returning();
  const [a, b] = await db
    .insert(locations)
    .values([
      { name: "Alpharetta", businessId: biz.id },
      { name: "Roswell", businessId: biz.id },
    ])
    .returning();
  const review = "https://search.google.com/local/writereview?placeid=EXAMPLE";
  const demoCards = await db
    .insert(cards)
    .values([
      { code: newCardCode(), label: "Front counter", reviewUrl: review, businessId: biz.id, locationId: a.id },
      { code: newCardCode(), label: "Chair 1", reviewUrl: review, businessId: biz.id, locationId: a.id },
      { code: newCardCode(), label: "Chair 2", reviewUrl: review, businessId: biz.id, locationId: a.id },
      { code: newCardCode(), label: "Front counter", reviewUrl: review, businessId: biz.id, locationId: b.id },
    ])
    .returning();

  // Fake taps: weekends busier, front counter busiest, gentle upward trend.
  const weight = [1.6, 0.8, 0.6, 1.0];
  const rows: (typeof taps.$inferInsert)[] = [];
  const now = Date.now();
  for (let d = 89; d >= 0; d--) {
    const day = new Date(now - d * 86400000);
    const dow = day.getDay();
    const base = (dow === 5 || dow === 6 ? 4.5 : 2.2) * (1 + (89 - d) / 150);
    demoCards.forEach((c, i) => {
      const n = Math.max(0, Math.round(base * weight[i] + (Math.random() - 0.5) * 3));
      for (let k = 0; k < n; k++) {
        const t = new Date(day);
        t.setHours(9 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60));
        if (t.getTime() > now) continue;
        rows.push({ cardId: c.id, createdAt: t, device: Math.random() < 0.58 ? "iphone" : "android", visitor: crypto.randomUUID() });
      }
    });
  }
  for (let i = 0; i < rows.length; i += 500) await db.insert(taps).values(rows.slice(i, i + 500));
  await db.insert(users).values({ email: demoEmail, passwordHash: await bcrypt.hash("demo1234", 10), businessId: biz.id, name: "Demo Owner" });
  console.log(`Demo business created with ${rows.length} taps. Owner login: ${demoEmail} / demo1234`);
  console.log("Demo card codes:", demoCards.map((c) => c.code).join(", "));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
