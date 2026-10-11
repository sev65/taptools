"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { businesses, cards, locations } from "@/db/schema";
import { newCardCode } from "@/lib/taps";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

function validUrl(u: string) {
  try {
    const url = new URL(u);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export async function createBusiness(form: FormData) {
  const name = str(form, "name");
  if (!name) return;
  const [b] = await db
    .insert(businesses)
    .values({ name, timezone: str(form, "timezone") || "America/New_York", analyticsEnabled: form.get("analytics") === "on" })
    .returning();
  redirect(`/admin/${b.id}`);
}

export async function updateBusiness(form: FormData) {
  const id = str(form, "id");
  await db
    .update(businesses)
    .set({ name: str(form, "name"), timezone: str(form, "timezone") || "America/New_York", analyticsEnabled: form.get("analytics") === "on" })
    .where(eq(businesses.id, id));
  revalidatePath(`/admin/${id}`);
}

export async function addLocation(form: FormData) {
  const businessId = str(form, "businessId");
  const name = str(form, "name");
  if (name) await db.insert(locations).values({ name, businessId });
  revalidatePath(`/admin/${businessId}`);
}

/** Pre-make blank cards (codes only) so you can program a stack of chips ahead of time. */
export async function makeBlankCards(form: FormData) {
  const count = Math.min(100, Math.max(1, Number(str(form, "count")) || 1));
  await db.insert(cards).values(Array.from({ length: count }, () => ({ code: newCardCode(), label: "Unassigned" })));
  revalidatePath("/admin");
}

export async function addCard(form: FormData) {
  const businessId = str(form, "businessId");
  const reviewUrl = str(form, "reviewUrl");
  const label = str(form, "label") || "Card";
  const locationId = str(form, "locationId") || null;
  const existingCode = str(form, "code").toUpperCase();
  if (!validUrl(reviewUrl)) redirect(`/admin/${businessId}?err=${encodeURIComponent("Review link must be a full https:// URL.")}`);

  if (existingCode) {
    // Assign a blank card that's already programmed.
    const [blank] = await db.select().from(cards).where(and(eq(cards.code, existingCode), isNull(cards.businessId)));
    if (!blank) redirect(`/admin/${businessId}?err=${encodeURIComponent(`No unassigned card with code ${existingCode}.`)}`);
    await db.update(cards).set({ businessId, label, reviewUrl, locationId }).where(eq(cards.id, blank.id));
  } else {
    await db.insert(cards).values({ code: newCardCode(), businessId, label, reviewUrl, locationId });
  }
  revalidatePath(`/admin/${businessId}`);
}

export async function updateCard(form: FormData) {
  const businessId = str(form, "businessId");
  const reviewUrl = str(form, "reviewUrl");
  if (!validUrl(reviewUrl)) redirect(`/admin/${businessId}?err=${encodeURIComponent("Review link must be a full https:// URL.")}`);
  await db
    .update(cards)
    .set({ label: str(form, "label") || "Card", reviewUrl, locationId: str(form, "locationId") || null, active: form.get("active") === "on" })
    .where(eq(cards.id, str(form, "cardId")));
  revalidatePath(`/admin/${businessId}`);
}
