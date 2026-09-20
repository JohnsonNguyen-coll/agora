import { env } from './config/env.js';
import { migrate, closeDb } from './db/client.js';
import { buildApp } from './app.js';
await migrate();
const app = await buildApp();
await app.listen({ port: env.PORT, host: '127.0.0.1' });
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => {
  void app.close().then(closeDb).then(() => process.exit(0));
});
