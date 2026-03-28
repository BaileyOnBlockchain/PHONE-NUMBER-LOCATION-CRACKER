import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

// Load .env if present
try {
  const { config } = await import('dotenv');
  const envPath = join(ROOT, '.env');
  if (existsSync(envPath)) config({ path: envPath });
} catch {}

export const config = {
  numverifyKey: process.env.NUMVERIFY_API_KEY || '',
  abstractKey: process.env.ABSTRACT_API_KEY || '',
  twilioSid: process.env.TWILIO_ACCOUNT_SID || '',
  twilioToken: process.env.TWILIO_AUTH_TOKEN || '',
  defaultFormat: process.env.DEFAULT_FORMAT || 'pretty',
  cacheTTL: parseInt(process.env.CACHE_TTL || '3600'),
  historyFile: process.env.HISTORY_FILE || join(ROOT, '.phonetracker_history.json'),
};

export function hasAPIKeys() {
  return !!(config.numverifyKey || config.abstractKey);
}
