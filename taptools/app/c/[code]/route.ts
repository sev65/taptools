import { NextResponse, type NextRequest } from "next/server";
import { and, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { cards, taps } from "@/db/schema";
import { classify, visitorHash, DOUBLE_TAP_WINDOW_SECONDS } from "@/lib/taps";

export const dynamic = "force-dynamic";

// This is the URL written onto every NFC card: https://<domain>/c/<code>
// It records the tap, then sends the customer to the business's review page.
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const [card] = await db.select().from(cards).where(eq(cards.code, code.toUpperCase())).limit(1);

  if (!card || !card.active || !card.reviewUrl) {
    return noStore(NextResponse.redirect(new URL("/card-not-set-up", req.url), 302));
  }

  // Never let a failed write stop the customer from reaching the review page.
  try {
    const ua = req.headers.get("user-agent") ?? "";
    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
    const { isBot, device } = classify(ua);
    const visitor = visitorHash(ip, ua);
    const since = new Date(Date.now() - DOUBLE_TAP_WINDOW_SECONDS * 1000);
    const recent = await db
      .select({ id: taps.id })
      .from(taps)
      .where(and(eq(taps.cardId, card.id), eq(taps.visitor, visitor), gte(taps.createdAt, since)))
      .limit(1);
    if (recent.length === 0) await db.insert(taps).values({ cardId: card.id, device, isBot, visitor });
  } catch (err) {
    console.error("tap log failed", err);
  }

  // 302 + no-store, never 301: a cached permanent redirect would skip this server
  // on the next tap from the same phone and the tap would go uncounted.
  return noStore(NextResponse.redirect(card.reviewUrl, 302));
}

// Link checkers send HEAD; answer them without logging a tap.
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}

function noStore(res: NextResponse) {
  res.headers.set("Cache-Control", "no-store, max-age=0");
  return res;
}
