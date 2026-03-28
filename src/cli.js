import { Command } from 'commander';
import chalk from 'chalk';
import { printBanner, printMini } from './display/banner.js';
import { runLookup } from './commands/lookup.js';
import { runBatch } from './commands/batch.js';
import { runValidate } from './commands/validate.js';
import { runInteractive } from './commands/interactive.js';
import { runHistory } from './commands/history.js';

const VERSION = '2.0.0';

export function run() {
  const program = new Command();

  program
    .name('tracker')
    .description('Advanced Phone Number Intelligence CLI')
    .version(VERSION, '-v, --version', 'Show version')
    .addHelpText('after', `
${chalk.bold('Examples:')}
  ${chalk.dim('$')} tracker lookup "+1 202 555 0147"
  ${chalk.dim('$')} tracker lookup +447700900123 --format table
  ${chalk.dim('$')} tracker lookup +919876543210 --json
  ${chalk.dim('$')} tracker batch numbers.txt --output results.csv
  ${chalk.dim('$')} tracker validate "+1-800-555-1234" "+44 20 7946 0958"
  ${chalk.dim('$')} tracker interactive
  ${chalk.dim('$')} tracker history --limit 30
`);

  // ── lookup ──────────────────────────────────────────────────────
  program
    .command('lookup <number>')
    .alias('l')
    .description('Look up detailed intelligence on a phone number')
    .option('-f, --format <format>', 'Output format: pretty | json | table | minimal', 'pretty')
    .option('-c, --country <code>', 'Default country ISO code (e.g. US, GB) for ambiguous numbers')
    .option('--no-cache', 'Bypass cache for fresh results')
    .option('--no-history', 'Do not save to history')
    .option('-q, --quiet', 'Suppress spinner and status messages')
    .option('--json', 'Shorthand for --format json')
    .option('--table', 'Shorthand for --format table')
    .option('--minimal', 'Shorthand for --format minimal')
    .action(async (number, opts) => {
      if (!opts.quiet) printBanner();
      const format = opts.json ? 'json' : opts.table ? 'table' : opts.minimal ? 'minimal' : opts.format;
      await runLookup(number, {
        format,
        defaultCountry: opts.country,
        noCache: !opts.cache,
        noHistory: !opts.history,
        quiet: opts.quiet,
      });
    });

  // ── batch ──────────────────────────────────────────────────────
  program
    .command('batch <file>')
    .alias('b')
    .description('Process multiple numbers from a file (one per line, or CSV)')
    .option('-f, --format <format>', 'Output format for console: pretty | json | table | minimal', 'pretty')
    .option('-o, --output <file>', 'Save results to file (.json, .csv, or .txt)')
    .option('-c, --country <code>', 'Default country code for ambiguous numbers')
    .option('--filter-invalid', 'Exclude invalid numbers from output')
    .action(async (file, opts) => {
      printMini();
      await runBatch(file, {
        format: opts.format,
        output: opts.output,
        defaultCountry: opts.country,
        filterInvalid: opts.filterInvalid,
      });
    });

  // ── validate ───────────────────────────────────────────────────
  program
    .command('validate <numbers...>')
    .alias('v')
    .description('Quickly validate one or more phone numbers (no carrier lookup)')
    .option('-c, --country <code>', 'Default country ISO code')
    .option('--json', 'Output as JSON')
    .action((numbers, opts) => {
      runValidate(numbers, {
        format: opts.json ? 'json' : 'pretty',
        defaultCountry: opts.country,
      });
    });

  // ── interactive ────────────────────────────────────────────────
  program
    .command('interactive')
    .alias('i')
    .description('Enter interactive REPL mode for repeated lookups')
    .option('-f, --format <format>', 'Default output format', 'pretty')
    .option('-c, --country <code>', 'Default country code')
    .action(async (opts) => {
      printBanner();
      await runInteractive({ format: opts.format, defaultCountry: opts.country });
    });

  // ── history ────────────────────────────────────────────────────
  program
    .command('history')
    .alias('h')
    .description('Show or manage lookup history')
    .option('-l, --limit <n>', 'Number of entries to show', '20')
    .option('--clear', 'Clear all history')
    .option('--json', 'Output as JSON')
    .action((opts) => {
      runHistory({
        limit: parseInt(opts.limit),
        clear: opts.clear,
        format: opts.json ? 'json' : 'table',
      });
    });

  // ── Default: if no subcommand, show banner + help ──────────────
  program.action(() => {
    printBanner();
    program.help();
  });

  // Handle empty args
  if (process.argv.length <= 2) {
    printBanner();
    program.help();
    return;
  }

  program.parseAsync(process.argv).catch(err => {
    console.error(chalk.red(`\n  Error: ${err.message}\n`));
    process.exit(1);
  });
}
