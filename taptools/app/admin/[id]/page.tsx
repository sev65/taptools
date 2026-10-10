import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { businesses, cards, locations } from "@/db/schema";
import { cardUrl } from "@/lib/site";
import TopBar from "@/components/TopBar";
import { addCard, addLocation, updateBusiness, updateCard } from "../actions";

export const dynamic = "force-dynamic";

export default async function BusinessAdmin({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ err?: string; ok?: string }>;
}) {
  const { id } = await params;
  const { err, ok } = await searchParams;
  const [biz] = await db.select().from(businesses).where(eq(businesses.id, id));
  if (!biz) notFound();
  const locs = await db.select().from(locations).where(eq(locations.businessId, id)).orderBy(asc(locations.createdAt));
  const cardRows = await db.select().from(cards).where(eq(cards.businessId, id)).orderBy(asc(cards.createdAt));

  const LocationSelect = ({ value }: { value?: string | null }) => (
    <select name="locationId" defaultValue={value ?? ""}>
      <option value="">No location</option>
      {locs.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
    </select>
  );

  return (
    <>
      <TopBar admin />
      <main className="wrap page">
        <p className="dim" style={{ margin: 0 }}>
          <Link href="/admin">← All businesses</Link> · <Link href={`/dashboard?b=${id}`}>View dashboard</Link>
        </p>
        <h1>{biz.name}</h1>
        {err && <p className="error">{err}</p>}
        {ok && <p className="ok">{ok}</p>}

        <section className="card">
          <h2>Cards</h2>
          <p className="note">Each card's chip holds the taptools link. Change the review link here any time; no reprogramming.</p>
          {cardRows.length === 0 && <p className="dim">No cards yet.</p>}
          <div style={{ display: "grid", gap: 12 }}>
            {cardRows.map((c) => (
              <form key={c.id} action={updateCard} className="card" style={{ padding: 12, display: "grid", gap: 8 }}>
                <input type="hidden" name="cardId" value={c.id} />
                <input type="hidden" name="businessId" value={id} />
                <div className="mono dim">Chip URL: {cardUrl(c.code)}</div>
                <div className="two" style={{ gap: 8 }}>
                  <label>Label<input name="label" defaultValue={c.label} /></label>
                  <label>Location<LocationSelect value={c.locationId} /></label>
                </div>
                <label>Review link<input name="reviewUrl" defaultValue={c.reviewUrl ?? ""} required /></label>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input type="checkbox" name="active" defaultChecked={c.active} style={{ width: "auto" }} /> Active
                  </label>
                  <span className="spacer" style={{ flex: 1 }} />
                  <button className="btn small">Save card</button>
                </div>
              </form>
            ))}
          </div>

          <h2 style={{ marginTop: 20 }}>Add a card</h2>
          <form action={addCard} className="stack" style={{ marginTop: 8 }}>
            <input type="hidden" name="businessId" value={id} />
            <div className="two" style={{ gap: 8 }}>
              <label>Label<input name="label" placeholder="Front counter" /></label>
              <label>Location<LocationSelect /></label>
            </div>
            <label>
              Review link
              <input name="reviewUrl" required placeholder="https://search.google.com/local/writereview?placeid=..." />
            </label>
            <label>
              Blank card code (optional)
              <input name="code" placeholder="Leave empty to make a new code" className="mono" />
            </label>
            <button className="btn">Add card</button>
          </form>
        </section>

        <section className="card">
          <h2>Business</h2>
          <form action={updateBusiness} className="stack" style={{ marginTop: 8 }}>
            <input type="hidden" name="id" value={id} />
            <label>Name<input name="name" defaultValue={biz.name} required /></label>
            <label>
              Time zone
              <select name="timezone" defaultValue={biz.timezone}>
                <option value="America/New_York">Eastern</option>
                <option value="America/Chicago">Central</option>
                <option value="America/Denver">Mountain</option>
                <option value="America/Phoenix">Arizona</option>
                <option value="America/Los_Angeles">Pacific</option>
              </select>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" name="analytics" defaultChecked={biz.analyticsEnabled} style={{ width: "auto" }} />
              Paid for analytics add-on
            </label>
            <button className="btn">Save</button>
          </form>

          <h2 style={{ marginTop: 20 }}>Locations</h2>
          <ul style={{ paddingLeft: 18 }}>
            {locs.map((l) => <li key={l.id}>{l.name}</li>)}
            {locs.length === 0 && <li className="dim">None yet. Only needed for businesses with more than one spot.</li>}
          </ul>
          <form action={addLocation} style={{ display: "flex", gap: 8 }}>
            <input type="hidden" name="businessId" value={id} />
            <input name="name" placeholder="Alpharetta" required />
            <button className="btn">Add</button>
          </form>
        </section>
      </main>
    </>
  );
}
