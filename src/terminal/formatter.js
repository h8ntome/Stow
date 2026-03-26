/**
 * formatter.js
 * Renders preview and summary data as formatted tables in the terminal.
 * Uses cli-table3 for ASCII tables and chalk for colour.
 */

import Table from 'cli-table3';
import chalk from 'chalk';
import path from 'path';

/**
 * Truncates a string to a max length, appending '…' if truncated.
 */
function trunc(str, max = 40) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

/**
 * Formats file size in human-readable form.
 */
export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Prints the preview table showing what will happen when rules are applied.
 * @param {{ matched: object[], unmatched: object[] }} previewResult
 * @param {string} destinationBase
 */
export function formatPreview(previewResult, destinationBase) {
  const { matched, unmatched } = previewResult;

  console.log('');
  console.log(chalk.bold.white('  Preview — files to be moved'));
  console.log(chalk.dim(`  Destination: ${destinationBase}`));
  console.log('');

  if (matched.length === 0) {
    console.log(chalk.yellow('  No files matched any rule.'));
  } else {
    const table = new Table({
      head: [
        chalk.cyan('File'),
        chalk.cyan('Size'),
        chalk.cyan('Rule'),
        chalk.cyan('Destination Folder'),
        chalk.cyan('Conflict'),
      ],
      style: { head: [], border: ['dim'] },
      colWidths: [32, 10, 22, 36, 10],
      wordWrap: false,
    });

    for (const { file, rule, destPath, conflict } of matched) {
      const destFolder = path.relative(destinationBase, path.dirname(destPath));
      const conflictLabel = conflict ? chalk.yellow('rename') : chalk.dim('—');
      table.push([
        trunc(file.name, 30),
        chalk.dim(formatSize(file.size)),
        trunc(rule.name, 20),
        trunc(destFolder || '.', 34),
        conflictLabel,
      ]);
    }

    console.log(table.toString());
    console.log(chalk.dim(`  ${matched.length} file(s) will be moved.`));
  }

  if (unmatched.length > 0) {
    console.log('');
    console.log(chalk.bold.yellow(`  Unmatched — ${unmatched.length} file(s) will NOT be moved`));

    const table = new Table({
      head: [chalk.yellow('File'), chalk.yellow('Size')],
      style: { head: [], border: ['dim'] },
      colWidths: [44, 12],
    });

    for (const file of unmatched) {
      table.push([trunc(file.name, 42), chalk.dim(formatSize(file.size))]);
    }

    console.log(table.toString());
  }

  console.log('');
}

/**
 * Prints a summary after applying moves.
 * @param {{ moved: object[], failed: object[] }} applyResult
 */
export function formatSummary(applyResult) {
  const { moved, failed } = applyResult;

  console.log('');

  if (moved.length > 0) {
    console.log(chalk.green(`  ✓ ${moved.length} file(s) moved successfully.`));
  }

  if (failed.length > 0) {
    console.log(chalk.red(`  ✗ ${failed.length} file(s) failed:`));
    for (const { from, error } of failed) {
      console.log(chalk.red(`    • ${path.basename(from)}: ${error}`));
    }
  }

  if (moved.length === 0 && failed.length === 0) {
    console.log(chalk.dim('  Nothing to move.'));
  }

  console.log('');
}
