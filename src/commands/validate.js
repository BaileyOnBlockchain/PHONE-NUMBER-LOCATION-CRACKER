import chalk from 'chalk';
import { parsePhone } from '../core/phoneParser.js';

/**
 * Quick validate-only command — no carrier lookup, just parse and validate
 */
export function runValidate(numbers, opts = {}) {
  const { format = 'pretty', defaultCountry } = opts;
  const results = [];

  for (const num of numbers) {
    const phone = parsePhone(num.trim(), defaultCountry || undefined);
    results.push({ input: num, phone });
  }

  if (format === 'json') {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  console.log('');
  for (const r of results) {
    const { input, phone } = r;
    const icon = phone.valid ? chalk.green('✓') : phone.possible ? chalk.yellow('~') : chalk.red('✗');
    const status = phone.valid ? chalk.green('VALID') : phone.possible ? chalk.yellow('POSSIBLE') : chalk.red('INVALID');
    const country = phone.country ? `  [${phone.country}]` : '';
    const type = phone.lineType !== 'UNKNOWN' ? chalk.dim(`  ${phone.lineTypeIcon} ${phone.lineTypeLabel}`) : '';

    console.log(`  ${icon}  ${status.padEnd(10)}  ${chalk.white(phone.e164 || input).padEnd(20)}${country}${type}`);
    if (phone.error && !phone.possible) {
      console.log(`     ${chalk.dim(phone.error)}`);
    }
  }
  console.log('');
}
