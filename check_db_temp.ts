import { getDb } from "./server/db";
import { cargoLoads, cargoDestinations } from "./drizzle/schema";
import { desc } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) { console.log("No DB"); process.exit(1); }
  
  const dests = await db.select().from(cargoDestinations);
  console.log("=== DESTINATIONS ===");
  dests.forEach(d => console.log(`  ID: ${d.id}, Name: ${d.name}`));
  
  const loads = await db.select({
    id: cargoLoads.id,
    destinationId: cargoLoads.destinationId,
    destination: cargoLoads.destination,
    status: cargoLoads.status,
    date: cargoLoads.date,
  }).from(cargoLoads).orderBy(desc(cargoLoads.id));
  
  console.log("\n=== CARGO LOADS ===");
  loads.forEach(l => console.log(`  ID: ${l.id}, destId: ${l.destinationId}, dest: ${l.destination}, status: ${l.status}, date: ${l.date}`));
  
  process.exit(0);
}
main();
