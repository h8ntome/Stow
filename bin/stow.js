#!/usr/bin/env node
/**
 * bin/stow.js
 * Entry point for the stow CLI.
 * Asks the user to choose Web UI or Terminal mode, then delegates accordingly.
 */

import * as p from '@clack/prompts';
import chalk from 'chalk';

async function main() {
  console.log('');
  p.intro(chalk.bold.white(' stow ') + chalk.dim(' — smart file organiser'));

  const mode = await p.select({
    message: 'How would you like to use stow?',
    options: [
      {
        value: 'web',
        label: 'Web UI',
        hint: 'Opens a browser interface at localhost',
      },
      {
        value: 'terminal',
        label: 'Terminal',
        hint: 'Interactive prompts, no browser needed',
      },
    ],
  });

  if (p.isCancel(mode)) {
    p.cancel('Goodbye.');
    process.exit(0);
  }

  if (mode === 'web') {
    const { start } = await import('../src/web/server.js');
    await start();
  } else {
    const { run } = await import('../src/terminal/terminal-ui.js');
    await run();
  }
}

main().catch(err => {
  console.error(chalk.red(`\n  Error: ${err.message}\n`));
  process.exit(1);
});
