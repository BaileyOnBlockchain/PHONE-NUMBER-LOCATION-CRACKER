import ora from 'ora';
import chalk from 'chalk';
import { parsePhone } from '../core/phoneParser.js';
import { lookupCarrier, checkVoIPIndicators, checkFlaggedPatterns } from '../core/carrierLookup.js';
import { calculateRiskScore } from '../core/riskScore.js';
import { enrichWithAPIs } from '../core/apiClient.js';
import { getCountryByISO } from '../data/countries.js';
import { renderReport } from '../display/renderer.js';
import { getCached, setCached } from '../utils/cache.js';
import { addToHistory } from '../utils/history.js';
import { config, hasAPIKeys } from '../utils/config.js';

/**
 * Core lookup pipeline: parse → carrier → geo → risk → render
 */
export async function runLookup(numberInput, opts = {}) {
  const {
    country: defaultCountry,
    format = config.defaultFormat,
    noCache = false,
    noHistory = false,
    quiet = false,
  } = opts;

  // ── Cache check ────────────────────────────────────────────────
  if (!noCache) {
    const cached = getCached(numberInput);
    if (cached) {
      if (!quiet) console.log(chalk.dim('  [cached result]'));
      renderReport(cached, { format });
      return cached;
    }
  }

  // ── Spinner ────────────────────────────────────────────────────
  let spinner;
  if (!quiet && format === 'pretty') {
    spinner = ora({ text: 'Analyzing number...', color: 'cyan' }).start();
  }

  try {
    // ── 1. Parse & validate ────────────────────────────────────────
    const phone = parsePhone(numberInput, defaultCountry || undefined);

    if (spinner) spinner.text = 'Looking up carrier...';

    // ── 2. Carrier lookup ──────────────────────────────────────────
    const carrier = lookupCarrier(phone);

    // ── 3. VoIP & flag checks ──────────────────────────────────────
    const voip = checkVoIPIndicators(phone);
    const flagged = checkFlaggedPatterns(phone);

    // ── 4. Geographic enrichment ───────────────────────────────────
    const geo = phone.country ? getCountryByISO(phone.country) : null;

    // ── 5. Optional API enrichment ─────────────────────────────────
    let apiData = null;
    if (hasAPIKeys() && phone.valid) {
      if (spinner) spinner.text = 'Fetching API data...';
      apiData = await enrichWithAPIs(phone, {
        numverifyKey: config.numverifyKey,
        abstractKey: config.abstractKey,
      });
    }

    // ── 6. Risk score ──────────────────────────────────────────────
    const risk = calculateRiskScore(phone, carrier, voip, flagged);

    if (spinner) spinner.succeed(chalk.green('Analysis complete'));

    const result = { phone, carrier, geo, voip, flagged, risk, apiData, timestamp: new Date().toISOString() };

    // ── 7. Cache & history ─────────────────────────────────────────
    if (!noCache) setCached(numberInput, result);
    if (!noHistory) addToHistory(result);

    // ── 8. Render ──────────────────────────────────────────────────
    renderReport(result, { format });

    return result;

  } catch (err) {
    if (spinner) spinner.fail(chalk.red('Analysis failed'));
    console.error(chalk.red(`\n  Error: ${err.message}\n`));
    if (process.env.DEBUG) console.error(err.stack);
    process.exit(1);
  }
}
