import { readFileSync, writeFileSync, existsSync } from 'fs';
import { config } from './config.js';

function load() {
  try {
    if (existsSync(config.historyFile)) {
      return JSON.parse(readFileSync(config.historyFile, 'utf8'));
    }
  } catch {}
  return [];
}

function save(history) {
  try {
    writeFileSync(config.historyFile, JSON.stringify(history, null, 2));
  } catch {}
}

export function addToHistory(result) {
  const history = load();
  history.unshift({
    timestamp: new Date().toISOString(),
    number: result.phone?.e164 || result.phone?.raw,
    country: result.phone?.country,
    lineType: result.phone?.lineType,
    carrier: result.carrier?.carrier,
    risk: result.risk?.score,
  });
  // Keep last 500 entries
  save(history.slice(0, 500));
}

export function getHistory(limit = 20) {
  return load().slice(0, limit);
}

export function clearHistory() {
  save([]);
}
