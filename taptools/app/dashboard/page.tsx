import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { businesses } from "@/db/schema";
import { getAllTimeTaps, getDashboard, RANGES, type Range } from "@/lib/analytics";
import { ago, longDate, n, shortDate, weekdayShort, WEEKDAYS, WEEKDAYS_LONG } from "@/lib/format";
import TopBar from "@/components/TopBar";
import BarChart from "@/components/BarChart";

export const dynamic = "force-dynamic";

// NOTE: login is removed for now, so this page is open to anyone with the link.
// Pick a business with /dashboard?b=<id>. Add auth back before giving this URL
// to real customers.
export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ range?: string; b?: string }> }) {
  const sp = await searchParams;

  if (!sp.b) {
    const all = await db.select().from(businesses).orderBy(businesses.name);
    return (
      <>
        <TopBar />
        <main className="wrap page">
          <h1>Choose a business</h1>
          <section className="card">
            {all.length === 0 ? (
              <p className="empty">No businesses yet. Add one in <Link href="/admin">/admin</Link>.</p>
            ) : (
              <table>
                <tbody>
                  {all.map((b) => (
                    <tr key={b.id}>
                      <td><Link href={`/dashboard?b=${b.id}`}>{b.name}</Link></td>
                      <td className="num"><span className={`pill${b.analyticsEnabled ? " on" : ""}`}>{b.analyticsEnabled ? "Paid" : "Off"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </main>
      </>
    );
  }

  const [biz] = await db.select().from(businesses).where(eq(businesses.id, sp.b)).limit(1);
  if (!biz) {
    return (
      <>
        <TopBar />
        <main className="wrap page">
          <div className="card empty">
            <h2>Business not found</h2>
            <p><Link href="/dashboard">← Choose a business</Link></p>
          </div>
        </main>
      </>
    );
  }

  if (!biz.analyticsEnabled) {
    const t = await getAllTimeTaps(biz.id);
    return (
      <>
        <TopBar />
        <main className="wrap page">
          <p className="dim" style={{ margin: 0 }}><Link href="/dashboard">← Choose a business</Link></p>
          <div>
            <h1>{biz.name}</h1>
            <p className="sub">Your review cards are working.</p>
          </div>
          <div className="card empty">
            <p className="dim" style={{ margin: 0 }}>Customers have tapped your {t.cards === 1 ? "card" : `${t.cards} cards`}</p>
            <p style={{ fontSize: 44, fontWeight: 700, margin: "4px 0" }}>{n(t.n)} {t.n === 1 ? "time" : "times"}</p>
            <p style={{ maxWidth: 440, margin: "8px auto 18px" }}>
              Add analytics to see taps by day, which card and location bring in the most reviews, and your busiest days.
            </p>
            <a className="btn" href={`mailto:${process.env.CONTACT_EMAIL ?? "hello@taptools.com"}?subject=Add%20analytics%20for%20${encodeURIComponent(biz.name)}`}>
              Add analytics
            </a>
          </div>
        </main>
      </>
    );
  }

  const days = (RANGES.includes(Number(sp.range) as Range) ? Number(sp.range) : 30) as Range;
  const data = await getDashboard(biz.id, biz.timezone, days);
  const { totals, daily, byCard, byLocation, weekday, byDevice } = data;
  const qs = (r: number) => `?${new URLSearchParams({ b: biz.id, range: String(r) })}`;

  const change = totals.previous > 0 ? Math.round(((totals.current - totals.previous) / totals.previous) * 100) : null;
  const avg = totals.current / days;
  const topCard = byCard.find((c) => c.taps > 0);
  const bestDow = weekday.indexOf(Math.max(...weekday));
  const deviceTotal = byDevice.reduce((s, d) => s + d.taps, 0);
  const iphoneShare = deviceTotal ? Math.round(((byDevice.find((d) => d.device === "iphone")?.taps ?? 0) / deviceTotal) * 100) : null;
  const maxCard = Math.max(1, ...byCard.map((c) => c.taps));
  const maxLoc = Math.max(1, ...byLocation.map((l) => l.taps));

  const tickEvery = days === 7 ? 1 : days === 30 ? 7 : 21;
  const bars = daily.map((d, i) => ({
    key: d.day,
    value: d.taps,
    tip: longDate(d.day),
    tick: (daily.length - 1 - i) % tickEvery === 0 ? (days === 7 ? weekdayShort(d.day) : shortDate(d.day)) : undefined,
  }));

  return (
    <>
      <TopBar />
      <main className="wrap page">
        <p className="dim" style={{ margin: 0 }}><Link href="/dashboard">← Choose a business</Link></p>
        <div className="page-head">
          <div>
            <h1>{biz.name}</h1>
            <p className="sub">Last {days} days</p>
          </div>
          <nav className="seg" aria-label="Date range">
            {RANGES.map((r) => (
              <Link key={r} href={qs(r)} aria-current={r === days ? "page" : undefined}>
                {r} days
              </Link>
            ))}
          </nav>
        </div>

        {totals.all_time === 0 ? (
          <div className="card empty">
            <h2>No taps yet</h2>
            <p>Once a customer taps one of your cards, it shows up here within seconds.</p>
          </div>
        ) : (
          <>
            <section className="tiles">
              <div className="card tile">
                <div className="label">Taps</div>
                <div className="value">{n(totals.current)}</div>
                <div className="delta">
                  {change === null ? (
                    "No earlier period to compare"
                  ) : (
                    <>
                      <span className={change >= 0 ? "up" : "down"}>
                        {change >= 0 ? "▲" : "▼"} {Math.abs(change)}%
                      </span>{" "}
                      vs previous {days} days
                    </>
                  )}
                </div>
              </div>
              <div className="card tile">
                <div className="label">Per day</div>
                <div className="value">{avg >= 10 ? Math.round(avg) : avg.toFixed(1)}</div>
                <div className="delta">average</div>
              </div>
              <div className="card tile">
                <div className="label">Top card</div>
                <div className="value small">{topCard ? topCard.label : "None"}</div>
                <div className="delta">{topCard ? `${topCard.location ? `${topCard.location} · ` : ""}${n(topCard.taps)} taps` : "No taps in this period"}</div>
              </div>
              <div className="card tile">
                <div className="label">All time</div>
                <div className="value">{n(totals.all_time)}</div>
                <div className="delta">{totals.since ? `since ${new Date(totals.since).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: biz.timezone })}` : ""}</div>
              </div>
            </section>

            <section className="card">
              <h2>Taps per day</h2>
              <p className="note">
                {totals.current > 0
                  ? `${WEEKDAYS_LONG[bestDow]} are your busiest day.${iphoneShare !== null ? ` ${iphoneShare}% of taps come from iPhones.` : ""}`
                  : "No taps in this period."}
              </p>
              <BarChart bars={bars} />
              <details className="data">
                <summary>Show as table</summary>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr><th>Day</th><th className="num">Taps</th></tr>
                    </thead>
                    <tbody>
                      {[...daily].reverse().map((d) => (
                        <tr key={d.day}><td>{longDate(d.day)}</td><td className="num">{d.taps}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </section>

            <section className="card">
              <h2>Cards</h2>
              <p className="note">Which card customers tap most. Move slow cards somewhere more visible.</p>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Card</th>
                      <th className="hide-sm">Location</th>
                      <th className="num">Last {days} days</th>
                      <th className="num hide-sm">All time</th>
                      <th className="num">Last tap</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byCard.map((c) => (
                      <tr key={c.id}>
                        <td>
                          {c.label}
                          <div className="dim">
                            <span className="mono">{c.code}</span>
                            {c.location && <span className="show-sm"> · {c.location}</span>}
                          </div>
                        </td>
                        <td className="hide-sm">{c.location ?? <span className="dim">None</span>}</td>
                        <td className="num">
                          <div className="meter">
                            <i style={{ width: `${(c.taps / maxCard) * 64}px` }} />
                            {n(c.taps)}
                          </div>
                        </td>
                        <td className="num hide-sm">{n(c.all_time)}</td>
                        <td className="num dim nowrap">{ago(c.last_tap)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="two">
              <section className="card">
                <h2>Locations</h2>
                <p className="note">Taps in the last {days} days.</p>
                <table>
                  <tbody>
                    {byLocation.map((l) => (
                      <tr key={l.location}>
                        <td>
                          {l.location}
                          <div className="dim">{l.cards} {l.cards === 1 ? "card" : "cards"}</div>
                        </td>
                        <td className="num">
                          <div className="meter">
                            <i style={{ width: `${(l.taps / maxLoc) * 100}px` }} />
                            {n(l.taps)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
              <section className="card">
                <h2>By day of week</h2>
                <p className="note">Total taps on each weekday, last {days} days.</p>
                <BarChart
                  height={180}
                  bars={weekday.map((v, i) => ({ key: WEEKDAYS[i], tick: WEEKDAYS[i], tip: WEEKDAYS_LONG[i], value: v }))}
                />
              </section>
            </div>
          </>
        )}
      </main>
    </>
  );
}
