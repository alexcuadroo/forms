import { createApp } from "./app.ts";
import { migrate } from "./database/migrate.ts";
import { cleanup } from "./services/file-lifecycle.ts";
await migrate();
await cleanup();
setInterval(() => cleanup().catch(console.error), 60000).unref();
createApp().listen(Number(process.env.PORT || 3000));
