import Link from "next/link";
import { isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { cards } from "@/db/schema";
import { cardUrl } from "@/lib/site";
import { n } from "@/lib/format";
import TopBar from "@/components/TopBar";
import { createBusiness, makeBlankCards } from "./actions";

export const dynamic = "force-dynamic";

type Row = { id: string; name: string; analytics_enabled: boolean; cards: number; taps30: number };

export default async function AdminPage() {
  const res = (await db.execute(sql`
    SELECT b.id, b.name, b.analytics_enabled,
      (SELECT count(*) FROM cards c WHERE c.business_id = b.id)::int AS cards,
      (SELECT count(*) FROM taps t JOIN cards c ON c.id = t.card_id
         WHERE c.business_id = b.id AND NOT t.is_bot AND t.created_at > now() - interval '30 days')::int AS taps30
    FROM businesses b ORDER BY b.created_at DESC`)) as unknown as { rows?: Row[] } | Row[];
  const rows = Array.isArray(res) ? res : (res.rows ?? []);
  const blanks = await db.select().from(cards).where(isNull(cards.businessId)).orderBy(cards.createdAt);

  return (
    <>
      <TopBar admin />
      <main className="wrap page">
        <div>
          <h1>Businesses</h1>
          <p className="sub">Every customer, their cards, and whether they pay for analytics.</p>
        </div>

        <section className="card">
          {rows.length === 0 ? (
            <p className="empty">No businesses yet. Add your first one below.</p>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Business</th>
                    <th>Analytics</th>
                    <th className="num hide-sm">Cards</th>
                    <th className="num">30-day taps</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((b) => (
                    <tr key={b.id}>
                      <td><Link href={`/admin/${b.id}`}>{b.name}</Link></td>
                      <td><span className={`pill${b.analytics_enabled ? " on" : ""}`}>{b.analytics_enabled ? "Paid" : "Off"}</span></td>
                      <td className="num hide-sm">{b.cards}</td>
                      <td className="num">{n(b.taps30)}</td>
                      <td className="num"><Link href={`/dashboard?b=${b.id}`}>Dashboard</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="two">
          <section className="card">
            <h2>Add a business</h2>
            <p className="note">You'll add cards on the next screen.</p>
            <form action={createBusiness} className="stack">
              <label>Business name<input name="name" required placeholder="Fade Factory Barbershop" /></label>
              <label>
                Time zone
                <select name="timezone" defaultValue="America/New_York">
                  <option value="America/New_York">Eastern</option>
                  <option value="America/Chicago">Central</option>
                  <option value="America/Denver">Mountain</option>
                  <option value="America/Phoenix">Arizona</option>
                  <option value="America/Los_Angeles">Pacific</option>
                </select>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" name="analytics" style={{ width: "auto" }} /> Paid for analytics add-on
              </label>
              <button className="btn">Add business</button>
            </form>
          </section>

          <section className="card">
            <h2>Blank cards</h2>
            <p className="note">
              Make codes ahead of time and write each URL to a chip. When you sell one, assign it to the business by its code.
            </p>
            <form action={makeBlankCards} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input name="count" type="number" min={1} max={100} defaultValue={10} style={{ maxWidth: 90 }} />
              <button className="btn">Make blank cards</button>
            </form>
            {blanks.length > 0 && (
              <div className="table-scroll" style={{ maxHeight: 260, overflowY: "auto" }}>
                <table>
                  <thead><tr><th>Code</th><th>Write this to the chip</th></tr></thead>
                  <tbody>
                    {blanks.map((c) => (
                      <tr key={c.id}>
                        <td className="mono">{c.code}</td>
                        <td className="mono dim">{cardUrl(c.code)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
