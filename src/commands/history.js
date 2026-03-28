import chalk from 'chalk';
import Table from 'cli-table3';
import { getHistory, clearHistory } from '../utils/history.js';

export function runHistory(opts = {}) {
  const { limit = 20, clear = false, format = 'table' } = opts;

  if (clear) {
    clearHistory();
    console.log(chalk.green('\n  History cleared.\n'));
    return;
  }

  const history = getHistory(limit);
  if (history.length === 0) {
    console.log(chalk.dim('\n  No lookup history found.\n'));
    return;
  }

  if (format === 'json') {
    console.log(JSON.stringify(history, null, 2));
    return;
  }

  console.log(chalk.bold.cyan(`\n  Lookup History  (last ${history.length} entries)\n`));

  const table = new Table({
    head: [
      chalk.bold.cyan('#'),
      chalk.bold.cyan('Timestamp'),
      chalk.bold.cyan('Number'),
      chalk.bold.cyan('Country'),
      chalk.bold.cyan('Type'),
      chalk.bold.cyan('Carrier'),
      chalk.bold.cyan('Risk'),
    ],
    colWidths: [5, 22, 20, 10, 16, 28, 10],
    style: { head: [], border: ['dim'] },
  });

  history.forEach((h, i) => {
    const d = new Date(h.timestamp).toLocaleString();
    const riskColor = h.risk <= 15 ? 'green' : h.risk <= 30 ? 'cyan' : h.risk <= 50 ? 'yellow' : 'red';
    table.push([
      chalk.dim(String(i + 1)),
      chalk.dim(d),
      chalk.white(h.number || '—'),
      chalk.cyan(h.country || '—'),
      chalk.dim(h.lineType || '—'),
      h.carrier || '—',
      h.risk != null ? chalk[riskColor](h.risk) : '—',
    ]);
  });

  console.log(table.toString());
  console.log('');
}
