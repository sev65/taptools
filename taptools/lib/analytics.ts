import { sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";

// pglite returns { rows }, postgres-js returns the array itself.
async function q<T>(query: SQL): Promise<T[]> {
  const r = (await db.execute(query)) as unknown as { rows?: T[] } | T[];
  return Array.isArray(r) ? r : (r.rows ?? []);
}

export type Range = 7 | 30 | 90;
export const RANGES: Range[] = [7, 30, 90];

export type Dashboard = Awaited<ReturnType<typeof getDashboard>>;

/**
 * Everything the dashboard shows, for one business, over the last `days` days
 * (today included), with days cut at midnight in the business's own time zone.
 * Bot/link-preview hits are always excluded.
 */
export async function getDashboard(businessId: string, tz: string, days: Range) {
  const local = sql`(t.created_at AT TIME ZONE ${tz})::date`;
  const today = sql`(now() AT TIME ZONE ${tz})::date`;
  const inRange = sql`${local} > ${today} - ${days}::int`;
  const inPrev = sql`${local} > ${today} - ${days * 2}::int AND ${local} <= ${today} - ${days}::int`;
  const base = sql`FROM taps t JOIN cards c ON c.id = t.card_id WHERE c.business_id = ${businessId} AND NOT t.is_bot`;

  const [totals] = await q<{ current: number; previous: number; all_time: number; since: string | null }>(sql`
    SELECT count(*) FILTER (WHERE ${inRange})::int AS current,
           count(*) FILTER (WHERE ${inPrev})::int AS previous,
           count(*)::int AS all_time,
           min(t.created_at)::text AS since
    ${base}`);

  // Every day in the range, zero-filled, so gaps show as gaps.
  const daily = await q<{ day: string; taps: number }>(sql`
    WITH d AS (
      SELECT generate_series(${today} - (${days}::int - 1), ${today}, interval '1 day')::date AS day
    ), x AS (
      SELECT ${local} AS day, count(*)::int AS n ${base} AND ${inRange} GROUP BY 1
    )
    SELECT to_char(d.day, 'YYYY-MM-DD') AS day, coalesce(x.n, 0)::int AS taps
    FROM d LEFT JOIN x ON x.day = d.day ORDER BY d.day`);

  const byCard = await q<{ id: string; code: string; label: string; location: string | null; taps: number; all_time: number; last_tap: string | null }>(sql`
    SELECT c.id, c.code, c.label, l.name AS location,
           count(t.id) FILTER (WHERE ${inRange} AND NOT t.is_bot)::int AS taps,
           count(t.id) FILTER (WHERE NOT t.is_bot)::int AS all_time,
           max(t.created_at) FILTER (WHERE NOT t.is_bot)::text AS last_tap
    FROM cards c
    LEFT JOIN locations l ON l.id = c.location_id
    LEFT JOIN taps t ON t.card_id = c.id
    WHERE c.business_id = ${businessId}
    GROUP BY c.id, l.name
    ORDER BY taps DESC, all_time DESC, c.label`);

  const byLocation = await q<{ location: string; taps: number; cards: number }>(sql`
    SELECT coalesce(l.name, 'No location') AS location,
           count(t.id) FILTER (WHERE ${inRange} AND NOT t.is_bot)::int AS taps,
           count(DISTINCT c.id)::int AS cards
    FROM cards c
    LEFT JOIN locations l ON l.id = c.location_id
    LEFT JOIN taps t ON t.card_id = c.id
    WHERE c.business_id = ${businessId}
    GROUP BY 1 ORDER BY taps DESC`);

  // 0 = Sunday ... 6 = Saturday, in the business's time zone.
  const byWeekday = await q<{ dow: number; taps: number }>(sql`
    SELECT extract(dow FROM ${local})::int AS dow, count(*)::int AS taps
    ${base} AND ${inRange} GROUP BY 1`);

  const byDevice = await q<{ device: string; taps: number }>(sql`
    SELECT t.device, count(*)::int AS taps ${base} AND ${inRange} GROUP BY 1 ORDER BY 2 DESC`);

  const weekday = Array.from({ length: 7 }, (_, i) => byWeekday.find((r) => r.dow === i)?.taps ?? 0);

  return { days, totals, daily, byCard, byLocation, weekday, byDevice };
}

/** All-time tap count only. Used for the locked (no add-on) view. */
export async function getAllTimeTaps(businessId: string) {
  const [r] = await q<{ n: number; cards: number }>(sql`
    SELECT count(t.id) FILTER (WHERE NOT t.is_bot)::int AS n, count(DISTINCT c.id)::int AS cards
    FROM cards c LEFT JOIN taps t ON t.card_id = c.id WHERE c.business_id = ${businessId}`);
  return r ?? { n: 0, cards: 0 };
}
