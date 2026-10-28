import "dotenv/config";
import cron from "node-cron";
import { checkAndRunBackup } from "@/lib/services/backupScheduler.service";

console.log("[Backup CLI Worker] Starting standalone backup scheduler worker...");

cron.schedule("* * * * *", async () => {
  await checkAndRunBackup();
});

// Run immediate check on start
void checkAndRunBackup();
