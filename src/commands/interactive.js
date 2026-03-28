import chalk from 'chalk';
import readline from 'readline';
import { runLookup } from './lookup.js';
import { getHistory } from '../utils/history.js';

const BANNER = chalk.bold.cyan(`
  PhoneTracker Interactive Mode
  Type a phone number to look it up, or use a command:

  ${chalk.dim('Commands:')}
    ${chalk.cyan('help')}           Show this help
    ${chalk.cyan('history')}        Show recent lookups
    ${chalk.cyan('set format <f>')} Change format: pretty|json|table|minimal
    ${chalk.cyan('clear')}          Clear screen
    ${chalk.cyan('exit')} / ${chalk.cyan('quit')}    Exit interactive mode

  ${chalk.dim('Examples:')}
    ${chalk.white('+1 202 555 0147')}
    ${chalk.white('+44 7700 900123')}
    ${chalk.white('+91 9876543210')}
`);

export async function runInteractive(opts = {}) {
  let { format = 'pretty', defaultCountry } = opts;

  console.log(BANNER);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.cyan.bold('  tracker> '),
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    if (!input) { rl.prompt(); return; }

    // ── Commands ───────────────────────────────────────────────
    if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
      console.log(chalk.dim('\n  Goodbye!\n'));
      rl.close();
      process.exit(0);
    }

    if (input.toLowerCase() === 'help') {
      console.log(BANNER);
      rl.prompt();
      return;
    }

    if (input.toLowerCase() === 'clear') {
      console.clear();
      rl.prompt();
      return;
    }

    if (input.toLowerCase() === 'history') {
      const h = getHistory(15);
      if (h.length === 0) {
        console.log(chalk.dim('  No history yet.\n'));
      } else {
        console.log(chalk.bold.cyan('\n  Recent Lookups:'));
        for (const entry of h) {
          const d = new Date(entry.timestamp).toLocaleString();
          console.log(`  ${chalk.dim(d.padEnd(22))}  ${chalk.white((entry.number || '?').padEnd(20))}  ${chalk.cyan(entry.country || '?')}  ${chalk.dim(entry.carrier || '?')}`);
        }
        console.log('');
      }
      rl.prompt();
      return;
    }

    if (input.toLowerCase().startsWith('set format ')) {
      const f = input.slice(11).trim();
      if (['pretty', 'json', 'table', 'minimal'].includes(f)) {
        format = f;
        console.log(chalk.green(`  Format set to: ${f}\n`));
      } else {
        console.log(chalk.red(`  Unknown format. Use: pretty | json | table | minimal\n`));
      }
      rl.prompt();
      return;
    }

    // ── Phone lookup ───────────────────────────────────────────
    rl.pause();
    try {
      await runLookup(input, { format, defaultCountry, noHistory: false, quiet: false });
    } catch {}
    rl.resume();
    rl.prompt();
  });

  rl.on('close', () => {
    console.log('');
    process.exit(0);
  });
}
