import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
export const dailyPrices = sqliteTable("daily_prices", {
  id: text("id").primaryKey(),
  date: text("date").notNull(),
  regionId: text("region_id").notNull(),
  priceVndKg: integer("price_vnd_kg").notNull(),
  changeVndKg: integer("change_vnd_kg"),
  fetchedAt: text("fetched_at").notNull(),
  sourceUrl: text("source_url").notNull(),
});
export const sourceState = sqliteTable("source_state", {
  source: text("source").primaryKey(),
  lastAttempt: integer("last_attempt").notNull().default(0),
  lastSuccess: text("last_success"),
  lastSourceDate: text("last_source_date"),
  error: text("error"),
});
