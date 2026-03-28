import chalk from 'chalk';
import gradient from 'gradient-string';

export function printBanner() {
  const lines = [
    '  ██████╗ ██╗  ██╗ ██████╗ ███╗   ██╗███████╗',
    '  ██╔══██╗██║  ██║██╔═══██╗████╗  ██║██╔════╝',
    '  ██████╔╝███████║██║   ██║██╔██╗ ██║█████╗  ',
    '  ██╔═══╝ ██╔══██║██║   ██║██║╚██╗██║██╔══╝  ',
    '  ██║     ██║  ██║╚██████╔╝██║ ╚████║███████╗',
    '  ╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝',
    '  ████████╗██████╗  █████╗  ██████╗██╗  ██╗███████╗██████╗',
    '  ╚══██╔══╝██╔══██╗██╔══██╗██╔════╝██║ ██╔╝██╔════╝██╔══██╗',
    '     ██║   ██████╔╝███████║██║     █████╔╝ █████╗  ██████╔╝',
    '     ██║   ██╔══██╗██╔══██║██║     ██╔═██╗ ██╔══╝  ██╔══██╗',
    '     ██║   ██║  ██║██║  ██║╚██████╗██║  ██╗███████╗██║  ██║',
    '     ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝',
  ];

  const grad = gradient(['#00b4d8', '#0077b6', '#023e8a', '#48cae4']);
  console.log('');
  for (const line of lines) {
    console.log(grad(line));
  }

  console.log('');
  console.log(
    chalk.bold.white('  Advanced Phone Number Intelligence') +
    chalk.dim('  v2.0.0  |  OSINT Edition')
  );
  console.log(
    chalk.dim('  ─────────────────────────────────────────────────────────────')
  );
  console.log(
    chalk.dim('  Carrier Lookup  •  Geolocation  •  Risk Scoring  •  Batch Mode')
  );
  console.log('');
}

export function printMini() {
  const grad = gradient(['#00b4d8', '#023e8a']);
  console.log(grad('  PhoneTracker Advanced v2.0.0'));
  console.log('');
}
