import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { parsePhone } from '../core/phoneParser.js';
import { lookupCarrier, checkVoIPIndicators, checkFlaggedPatterns } from '../core/carrierLookup.js';
import { calculateRiskScore } from '../core/riskScore.js';
import { getCountryByISO } from '../data/countries.js';
import { renderReport, renderBatchSummary } from '../display/renderer.js';

/**
 * Process a file or stdin containing phone numbers (one per line, or CSV)
 */
export async function runBatch(inputFile, opts = {}) {
  const {
    format = 'pretty',
    output,
    defaultCountry,
    filterInvalid = false,
    delimiter = '\t',
  } = opts;

  // ── Read input ─────────────────────────────────────────────────
  let raw;
  if (inputFile === '-') {
    raw = readFileSync('/dev/stdin', 'utf8');
  } else {
    const filePath = resolve(inputFile);
    if (!existsSync(filePath)) {
      console.error(chalk.red(`  Error: File not found: ${filePath}`));
      process.exit(1);
    }
    raw = readFileSync(filePath, 'utf8');
  }

  // Extract phone numbers: one per line, skip blanks & comments
  const lines = raw.split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#') && !l.startsWith('//'));

  // Handle CSV: extract first column if looks like CSV
  const numbers = lines.map(l => {
    if (l.includes(',')) return l.split(',')[0].trim().replace(/"/g, '');
    if (l.includes('\t')) return l.split('\t')[0].trim();
    return l;
  }).filter(n => n.length > 0);

  console.log(chalk.bold.cyan(`\n  PhoneTracker Batch Mode`));
  console.log(chalk.dim(`  Processing ${numbers.length} number(s) from ${inputFile === '-' ? 'stdin' : inputFile}\n`));

  const spinner = ora({ text: 'Processing...', color: 'cyan' }).start();
  const results = [];

  for (let i = 0; i < numbers.length; i++) {
    const num = numbers[i];
    spinner.text = `Processing ${i + 1}/${numbers.length}: ${chalk.dim(num)}`;

    const phone = parsePhone(num, defaultCountry || undefined);
    const carrier = lookupCarrier(phone);
    const voip = checkVoIPIndicators(phone);
    const flagged = checkFlaggedPatterns(phone);
    const geo = phone.country ? getCountryByISO(phone.country) : null;
    const risk = calculateRiskScore(phone, carrier, voip, flagged);

    const result = { phone, carrier, geo, voip, flagged, risk, apiData: null, timestamp: new Date().toISOString() };

    if (!filterInvalid || phone.valid) {
      results.push(result);
    }
  }

  spinner.succeed(`Processed ${numbers.length} numbers (${results.length} included)`);

  // ── Output results ─────────────────────────────────────────────
  if (output) {
    const ext = output.split('.').pop().toLowerCase();
    if (ext === 'json') {
      writeFileSync(output, JSON.stringify(results, null, 2));
      console.log(chalk.green(`\n  Results saved to ${output}`));
    } else if (ext === 'csv') {
      const csvLines = [
        'Input,E164,Valid,LineType,Country,Region,Carrier,Network,RiskScore,RiskLevel,VoIP,Lat,Lng,Timezone',
        ...results.map(r => csvRow(r)),
      ];
      writeFileSync(output, csvLines.join('\n'));
      console.log(chalk.green(`\n  Results saved to ${output}`));
    } else {
      // Text file with tab-separated
      const rows = results.map(r => minimalRow(r, delimiter));
      writeFileSync(output, rows.join('\n'));
      console.log(chalk.green(`\n  Results saved to ${output}`));
    }
  } else {
    // Print each result
    for (const result of results) {
      if (format === 'json') {
        console.log(JSON.stringify(result));
      } else if (format === 'minimal') {
        console.log(minimalRow(result, '\t'));
      } else {
        renderReport(result, { format: 'pretty' });
      }
    }
  }

  renderBatchSummary(results);
  return results;
}

function csvRow(r) {
  const { phone, carrier, geo, voip, risk } = r;
  const q = (s) => s != null ? `"${String(s).replace(/"/g, '""')}"` : '""';
  return [
    q(phone.raw),
    q(phone.e164),
    phone.valid ? 'true' : 'false',
    q(phone.lineTypeLabel),
    q(geo?.name || phone.country),
    q(carrier?.region || ''),
    q(carrier?.carrier || ''),
    q(carrier?.network || ''),
    risk?.score ?? '',
    q(risk?.level || ''),
    voip?.isVoIP ? 'true' : 'false',
    geo?.lat ?? '',
    geo?.lng ?? '',
    q(geo?.timezone || ''),
  ].join(',');
}

function minimalRow(r, delim = '\t') {
  const { phone, carrier, geo, risk, voip } = r;
  return [
    phone.e164 || phone.raw,
    phone.valid ? 'VALID' : 'INVALID',
    phone.lineTypeLabel,
    geo?.name || phone.country || '',
    carrier?.region || '',
    carrier?.carrier || '',
    risk ? `${risk.score}` : '',
    voip?.isVoIP ? 'VoIP' : '',
  ].join(delim);
}
