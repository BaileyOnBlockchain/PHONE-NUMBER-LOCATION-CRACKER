import chalk from 'chalk';
import boxen from 'boxen';
import Table from 'cli-table3';

/**
 * Render a full phone intelligence report to the terminal
 */
export function renderReport(result, opts = {}) {
  const { format = 'pretty', noColor } = opts;

  if (format === 'json') {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (format === 'minimal') {
    renderMinimal(result);
    return;
  }

  if (format === 'table') {
    renderTable(result);
    return;
  }

  // Default: pretty
  renderPretty(result);
}

// ─── Pretty (boxed) output ──────────────────────────────────────────────────

function renderPretty(r) {
  const { phone, carrier, risk, geo, voip, flagged, apiData } = r;

  const valid = phone.valid;
  const c = chalk;

  const sectionTitle = (t) => c.bold.cyan(` ▸ ${t}`);
  const label = (l) => c.dim(l.padEnd(22));
  const value = (v, color) => color ? chalk[color](v) : c.white(v);
  const row = (l, v, color) => `  ${label(l)}  ${value(v ?? '—', color)}`;
  const divider = () => c.dim('  ' + '─'.repeat(58));

  const lines = [];

  // ── Header ─────────────────────────────────────────────────────
  lines.push('');
  if (!valid) {
    lines.push(c.bold.red('  ✗  INVALID / UNRECOGNIZED NUMBER'));
  } else {
    lines.push(c.bold.green('  ✓  ') + c.bold.white('NUMBER INTELLIGENCE REPORT'));
  }
  lines.push(c.dim('  ') + c.bold.white(phone.e164 || phone.raw));
  lines.push('');

  // ── Number Details ─────────────────────────────────────────────
  lines.push(sectionTitle('Number Details'));
  lines.push(divider());
  lines.push(row('E.164 Format', phone.e164, 'greenBright'));
  lines.push(row('International', phone.international));
  lines.push(row('National Format', phone.national));
  lines.push(row('Valid', valid ? '✓ Yes' : '✗ No', valid ? 'green' : 'red'));
  lines.push(row('Line Type', `${phone.lineTypeIcon}  ${phone.lineTypeLabel}`, lineTypeColor(phone.lineType)));
  if (phone.nationalNumber) lines.push(row('National Number', phone.nationalNumber));
  lines.push('');

  // ── Geographic Data ─────────────────────────────────────────────
  lines.push(sectionTitle('Geographic Data'));
  lines.push(divider());
  if (geo) {
    const countryLine = geo.flag ? `${geo.flag}  ${geo.name}` : geo.name;
    lines.push(row('Country', countryLine));
    lines.push(row('Country Code', `+${phone.countryCode}`));
    lines.push(row('Region', geo.region || '—'));
    lines.push(row('Sub-region', geo.subregion || '—'));
    if (carrier?.region) lines.push(row('Area / City', carrier.region, 'cyan'));
    lines.push(row('Capital', geo.capital || '—'));
    lines.push(row('Coordinates', `${formatCoord(geo.lat, 'N', 'S')}, ${formatCoord(geo.lng, 'E', 'W')}`));
    lines.push(row('Timezone', `${geo.timezone || '—'}  (UTC${geo.utcOffset || ''})`));
    lines.push(row('Currency', geo.currency || '—'));
    lines.push(row('Language(s)', geo.language || '—'));
    if (geo.population) lines.push(row('Population', formatNum(geo.population)));
  } else {
    lines.push(row('Country Code', `+${phone.countryCode}`));
    lines.push(row('Country', phone.country || 'Unknown'));
  }
  lines.push('');

  // ── Carrier Data ────────────────────────────────────────────────
  lines.push(sectionTitle('Carrier & Network'));
  lines.push(divider());
  if (carrier) {
    lines.push(row('Carrier', carrier.carrier || '—', carrier.carrier?.includes('Unknown') ? 'dim' : 'yellowBright'));
    lines.push(row('Line Type', carrier.type || '—'));
    lines.push(row('Network', carrier.network || '—', 'cyan'));
    const confColor = { high: 'green', medium: 'yellow', low: 'dim', none: 'red' }[carrier.confidence] || 'white';
    lines.push(row('Data Confidence', capitalize(carrier.confidence), confColor));
    if (carrier.note) lines.push(row('Note', carrier.note, 'dim'));
  }
  if (voip?.isVoIP) {
    lines.push(row('VoIP Detected', `⚠  ${voip.note || 'Yes'}`, 'yellowBright'));
  }
  lines.push('');

  // ── API Enrichment ──────────────────────────────────────────────
  if (apiData && apiData.sources?.length > 0) {
    lines.push(sectionTitle('API Enrichment') + c.dim(` (${apiData.sources.join(', ')})`));
    lines.push(divider());
    if (apiData.carrier) lines.push(row('API Carrier', apiData.carrier, 'yellowBright'));
    if (apiData.lineType) lines.push(row('API Line Type', apiData.lineType));
    if (apiData.location) lines.push(row('API Location', apiData.location));
    lines.push('');
  }

  // ── Risk Assessment ─────────────────────────────────────────────
  lines.push(sectionTitle('Risk Assessment'));
  lines.push(divider());
  if (risk) {
    const riskColor = risk.color || 'white';
    lines.push(row('Risk Score', `${risk.bar} ${risk.score}/100`, riskColor));
    lines.push(row('Risk Level', risk.level, riskColor));
    if (flagged?.flagged) {
      lines.push(row('⚠ Flagged', flagged.reason, 'redBright'));
    }
    if (risk.factors?.length > 0) {
      lines.push('');
      lines.push('  ' + c.dim('Risk factors:'));
      for (const f of risk.factors) {
        const sign = f.delta > 0 ? '+' : '';
        const fc = f.severity === 'positive' ? 'green' :
                   f.severity === 'high' ? 'red' :
                   f.severity === 'medium' ? 'yellow' : 'dim';
        lines.push(`    ${c[fc](`${sign}${f.delta}`).padEnd(8)}  ${c.white(f.label)}`);
      }
    }
  }
  lines.push('');

  // ── Box it ──────────────────────────────────────────────────────
  const boxed = boxen(lines.join('\n'), {
    padding: { top: 0, bottom: 0, left: 1, right: 1 },
    borderStyle: 'round',
    borderColor: valid ? 'cyan' : 'red',
    dimBorder: false,
  });

  console.log(boxed);
  console.log('');
}

// ─── Table output ──────────────────────────────────────────────────────────

function renderTable(r) {
  const { phone, carrier, risk, geo, voip } = r;

  const table = new Table({
    head: [chalk.bold.cyan('Field'), chalk.bold.cyan('Value')],
    colWidths: [28, 50],
    style: { head: [], border: ['dim'] },
  });

  const add = (field, val) => table.push([chalk.dim(field), val ?? '—']);

  add('Input', phone.raw);
  add('E.164', phone.e164 || phone.raw);
  add('International', phone.international || '—');
  add('National', phone.national || '—');
  add('Valid', phone.valid ? chalk.green('✓ Yes') : chalk.red('✗ No'));
  add('Line Type', `${phone.lineTypeIcon}  ${phone.lineTypeLabel}`);
  add('Country', geo ? `${geo.flag}  ${geo.name}` : phone.country || '—');
  add('Country Code', phone.countryCode ? `+${phone.countryCode}` : '—');
  add('Region', carrier?.region || geo?.subregion || '—');
  add('Capital', geo?.capital || '—');
  add('Timezone', geo ? `${geo.timezone} (UTC${geo.utcOffset})` : '—');
  add('Carrier', carrier?.carrier || '—');
  add('Network', carrier?.network || '—');
  add('VoIP', voip?.isVoIP ? chalk.yellow('⚠ Yes') : 'No');
  add('Risk Score', risk ? `${risk.score}/100 — ${risk.level}` : '—');
  add('Coordinates', geo ? `${formatCoord(geo.lat,'N','S')}, ${formatCoord(geo.lng,'E','W')}` : '—');

  console.log('\n' + table.toString() + '\n');
}

// ─── Minimal output ─────────────────────────────────────────────────────────

function renderMinimal(r) {
  const { phone, carrier, geo, risk } = r;
  console.log([
    phone.e164 || phone.raw,
    phone.valid ? 'VALID' : 'INVALID',
    phone.lineTypeLabel,
    geo?.name || phone.country || '?',
    carrier?.carrier || '?',
    carrier?.region || '?',
    risk ? `RISK:${risk.score}` : '?',
  ].join('\t'));
}

// ─── Batch summary table ────────────────────────────────────────────────────

export function renderBatchSummary(results) {
  const valid = results.filter(r => r.phone.valid).length;
  const invalid = results.length - valid;
  const byCountry = {};
  const byType = {};

  for (const r of results) {
    if (r.phone.country) byCountry[r.phone.country] = (byCountry[r.phone.country] || 0) + 1;
    const t = r.phone.lineType;
    byType[t] = (byType[t] || 0) + 1;
  }

  console.log(chalk.bold.cyan('\n  Batch Processing Summary'));
  console.log(chalk.dim('  ' + '─'.repeat(40)));
  console.log(`  Total processed:  ${chalk.bold(results.length)}`);
  console.log(`  Valid:            ${chalk.green(valid)}`);
  console.log(`  Invalid:          ${chalk.red(invalid)}`);
  console.log('');
  console.log('  Countries detected:');
  for (const [c, n] of Object.entries(byCountry).sort((a,b) => b[1]-a[1]).slice(0,10)) {
    console.log(`    ${chalk.cyan(c.padEnd(6))}  ${n}`);
  }
  console.log('');
  console.log('  Line types:');
  for (const [t, n] of Object.entries(byType).sort((a,b) => b[1]-a[1])) {
    console.log(`    ${chalk.yellow(t.padEnd(25))}  ${n}`);
  }
  console.log('');
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function lineTypeColor(type) {
  const map = {
    MOBILE: 'greenBright',
    FIXED_LINE: 'cyan',
    FIXED_LINE_OR_MOBILE: 'cyan',
    TOLL_FREE: 'yellow',
    PREMIUM_RATE: 'red',
    VOIP: 'magenta',
    PERSONAL_NUMBER: 'blue',
    UNKNOWN: 'dim',
  };
  return map[type] || 'white';
}

function formatCoord(val, pos, neg) {
  if (val == null) return '—';
  const abs = Math.abs(val).toFixed(4);
  return `${abs}°${val >= 0 ? pos : neg}`;
}

function formatNum(n) {
  return n?.toLocaleString() || '—';
}

function capitalize(s) {
  if (!s) return '—';
  return s.charAt(0).toUpperCase() + s.slice(1);
}
