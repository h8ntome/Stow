#!/usr/bin/env node
/**
 * bin/stow-dot.js
 * Entry point for the `stow.` command — repeats the last cleanup with zero config.
 */

import * as p from '@clack/prompts';
import chalk from 'chalk';
import { loadLast } from '../src/core/last.js';

async function main() {
  console.log('');
  p.intro(chalk.bold.white(' stow. ') + chalk.dim(' — repeat last cleanup'));

  const last = await loadLast();

  if (!last) {
    p.outro(chalk.yellow('No previous cleanup found. Run stow first to get started.'));
    process.exit(0);
  }

  // Format the timestamp in a readable way
  const when = new Date(last.timestamp);
  const timeStr = when.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  p.note(
    [
      `${chalk.dim('Source:     ')}  ${last.sourcePath}`,
      `${chalk.dim('Destination:')}  ${last.destinationPath}`,
      `${chalk.dim('Rules:      ')}  ${last.rules.length} rule(s)`,
      `${chalk.dim('Last run:   ')}  ${timeStr}`,
      `${chalk.dim('Files moved:')}  ${last.filesMoved}`,
    ].join('\n'),
    'Last cleanup'
  );

  const mode = await p.select({
    message: 'Run this again using:',
    options: [
      { value: 'terminal', label: 'Terminal', hint: 'Runs immediately, no browser needed' },
      { value: 'web',      label: 'Web UI',   hint: 'Opens browser with last config pre-loaded' },
    ],
  });
  if (p.isCancel(mode)) {
    p.cancel('Goodbye.');
    process.exit(0);
  }

  const confirmed = await p.confirm({
    message: `Re-run ${last.rules.length} rule(s) on ${last.sourcePath}?`,
  });
  if (p.isCancel(confirmed) || !confirmed) {
    p.cancel('No files were moved.');
    process.exit(0);
  }

  if (mode === 'terminal') {
    const { runRepeat } = await import('../src/terminal/terminal-ui.js');
    await runRepeat(last);
  } else {
    const { startRepeat } = await import('../src/web/server.js');
    await startRepeat(last);
  }
}

main().catch(err => {
  console.error(chalk.red(`\n  Error: ${err.message}\n`));
  process.exit(1);
});
