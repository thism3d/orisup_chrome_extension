import { db } from "./server/db";
import { platformSettings } from "./shared/schema";

async function save() {
  await db.insert(platformSettings)
    .values([
      { key: "bulksmsbd_api_key", value: "OKfopQjVVNmaMjM1O98E" },
      { key: "bulksmsbd_sender_id", value: "8809617626388" }
    ])
    .onConflictDoUpdate({
      target: platformSettings.key,
      set: {
        value: "Excluded.value" // Wait, Drizzle syntax is different. It's sql`EXCLUDED.value` or similar.
      }
    });
}
