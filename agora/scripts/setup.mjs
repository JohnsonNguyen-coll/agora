import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
const target = new URL('../.env', import.meta.url);
if (existsSync(target)) {
  console.log('Existing .env preserved. Fill missing settings using .env.example.');
} else {
  const template = readFileSync(new URL('../.env.example', import.meta.url), 'utf8');
  writeFileSync(target, template.replace('SESSION_SECRET=', 'SESSION_SECRET=' + randomBytes(32).toString('hex'))
    .replace('TOKEN_ENCRYPTION_KEY=', 'TOKEN_ENCRYPTION_KEY=' + randomBytes(32).toString('hex')), { mode: 0o600 });
  console.log('Created local secrets. Latch credentials remain empty.');
}
