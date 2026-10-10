import { pgTable, text, boolean, timestamp, index } from "drizzle-orm/pg-core";

const id = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

// A customer business (one salon, one auto shop, one restaurant group).
export const businesses = pgTable("businesses", {
  id: id(),
  name: text("name").notNull(),
  // Paid add-on. Taps are recorded for every card regardless, so a business that
  // upgrades sees its full history from day one.
  analyticsEnabled: boolean("analytics_enabled").notNull().default(false),
  timezone: text("timezone").notNull().default("America/New_York"),
  createdAt: createdAt(),
});

export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  role: text("role").notNull().default("owner"), // "owner" | "admin"
  businessId: text("business_id").references(() => businesses.id, { onDelete: "cascade" }),
  createdAt: createdAt(),
});

export const locations = pgTable("locations", {
  id: id(),
  name: text("name").notNull(),
  businessId: text("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  createdAt: createdAt(),
});

// One physical NFC card. The chip holds https://<domain>/c/<code>, never the review
// URL itself, so the destination can change and taps get counted with no reprogramming.
export const cards = pgTable("cards", {
  id: id(),
  code: text("code").notNull().unique(),
  label: text("label").notNull(),
  reviewUrl: text("review_url"), // null = card made but not assigned yet
  active: boolean("active").notNull().default(true),
  businessId: text("business_id").references(() => businesses.id, { onDelete: "set null" }),
  locationId: text("location_id").references(() => locations.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

export const taps = pgTable(
  "taps",
  {
    id: id(),
    cardId: text("card_id").notNull().references(() => cards.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    device: text("device").notNull(), // "iphone" | "android" | "other"
    // Link previewers and crawlers: stored for debugging, never counted.
    isBot: boolean("is_bot").notNull().default(false),
    // Hash of IP + browser + day + secret. Used only to drop double-fires from the
    // same phone within a few seconds. Not reversible to an IP.
    visitor: text("visitor").notNull(),
  },
  (t) => [index("taps_card_time").on(t.cardId, t.createdAt)],
);

export type Business = typeof businesses.$inferSelect;
export type Card = typeof cards.$inferSelect;
