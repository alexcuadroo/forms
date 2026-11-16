import { createApp } from "./app.ts";
import { pool } from "./database/connection.ts";
import { migrate } from "./database/migrate.ts";
import { cleanup } from "./services/file-lifecycle.ts";
await migrate();
await cleanup();
// Schedule the next pass after completion so slow cleanup jobs never overlap.
let stopping = false;
let cleanupTimer: ReturnType<typeof setTimeout>;
function scheduleCleanup() {
  cleanupTimer = setTimeout(async () => {
    try {
      await cleanup();
    } catch (error) {
      console.error(error);
    } finally {
      if (!stopping) scheduleCleanup();
    }
  }, 60000);
  cleanupTimer.unref();
}
scheduleCleanup();
const server = createApp().listen(Number(process.env.PORT || 3000));
function shutdown() {
  if (stopping) return;
  stopping = true;
  clearTimeout(cleanupTimer);
  const deadline = setTimeout(() => {
    server.closeAllConnections();
    process.exit(1);
  }, 10000);
  deadline.unref();
  server.close(async (error) => {
    try {
      await pool.end();
    } catch (failure) {
      console.error(failure);
      process.exitCode = 1;
    } finally {
      clearTimeout(deadline);
      if (error) {
        console.error(error);
        process.exitCode = 1;
      }
    }
  });
}
process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
