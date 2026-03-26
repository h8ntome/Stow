/**
 * terminal-ui.js
 * Full interactive terminal flow using @clack/prompts.
 * Handles: source selection, destination, rule management, preview, and apply.
 */

import * as p from '@clack/prompts';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { loadConfig, saveConfig } from '../core/config.js';
import { scanFolder } from '../core/scanner.js';
import { evaluate, describeRule, CATEGORY_EXTENSIONS } from '../core/rules-engine.js';
import { moveFile, previewMove } from '../core/mover.js';
import { formatPreview, formatSummary } from './formatter.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isCancelled(value) {
  return p.isCancel(value);
}

function cancel(message = 'Operation cancelled.') {
  p.cancel(chalk.yellow(message));
  process.exit(0);
}

function validateDir(value) {
  if (!value || !value.trim()) return 'Please enter a path.';
  const resolved = path.resolve(value.trim());
  if (!fs.existsSync(resolved)) return `Path does not exist: ${resolved}`;
  if (!fs.statSync(resolved).isDirectory()) return `Not a directory: ${resolved}`;
}

// ---------------------------------------------------------------------------
// Rule builder sub-flow
// ---------------------------------------------------------------------------

async function buildRule() {
  const type = await p.select({
    message: 'Rule type:',
    options: [
      { value: 'category',  label: 'File Category',     hint: 'images, videos, documents…' },
      { value: 'extension', label: 'File Extension',    hint: '.pdf, .jpg, .mp4…' },
      { value: 'keyword',   label: 'Filename Keyword',  hint: 'filename contains a word' },
      { value: 'size',      label: 'File Size',         hint: 'larger or smaller than…' },
      { value: 'regex',     label: 'Filename Regex',    hint: 'advanced pattern match' },
      { value: 'dateGroup', label: 'Group by Date',     hint: 'sort into month/year folders' },
      { value: 'dateRange', label: 'Date Range',        hint: 'files from a specific period' },
    ],
  });
  if (isCancelled(type)) cancel();

  let condition = {};

  if (type === 'category') {
    const category = await p.select({
      message: 'Category:',
      options: Object.keys(CATEGORY_EXTENSIONS).map(c => ({
        value: c,
        label: c.charAt(0).toUpperCase() + c.slice(1),
        hint: CATEGORY_EXTENSIONS[c].slice(0, 4).join(' ') + '…',
      })),
    });
    if (isCancelled(category)) cancel();
    condition = { category };
  }

  else if (type === 'extension') {
    const raw = await p.text({
      message: 'Extensions (comma-separated, e.g. .jpg, .png):',
      validate: v => (!v || !v.trim()) ? 'Enter at least one extension.' : undefined,
    });
    if (isCancelled(raw)) cancel();
    condition = {
      extensions: raw.split(',').map(e => {
        e = e.trim().toLowerCase();
        return e.startsWith('.') ? e : '.' + e;
      }),
    };
  }

  else if (type === 'keyword') {
    const keyword = await p.text({
      message: 'Keyword (filename must contain):',
      validate: v => (!v || !v.trim()) ? 'Enter a keyword.' : undefined,
    });
    if (isCancelled(keyword)) cancel();

    const cs = await p.confirm({ message: 'Case-sensitive?' });
    if (isCancelled(cs)) cancel();
    condition = { keyword: keyword.trim(), caseSensitive: cs };
  }

  else if (type === 'size') {
    const operator = await p.select({
      message: 'Condition:',
      options: [
        { value: 'gt', label: 'Larger than' },
        { value: 'lt', label: 'Smaller than' },
      ],
    });
    if (isCancelled(operator)) cancel();

    const amount = await p.text({
      message: 'Size threshold (e.g. 10 MB, 500 KB, 2 GB):',
      validate: v => {
        if (!v || !v.trim()) return 'Enter a size.';
        if (!/^\d+(\.\d+)?\s*(B|KB|MB|GB)$/i.test(v.trim())) return 'Format: 10 MB, 500 KB, 2 GB';
      },
    });
    if (isCancelled(amount)) cancel();

    const [num, unit] = amount.trim().split(/\s+/);
    const multipliers = { b: 1, kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3 };
    const bytes = parseFloat(num) * (multipliers[unit.toLowerCase()] || 1);
    condition = { operator, bytes: Math.round(bytes) };
  }

  else if (type === 'regex') {
    const pattern = await p.text({
      message: 'Regex pattern (e.g. ^invoice_\\d+):',
      validate: v => {
        if (!v || !v.trim()) return 'Enter a pattern.';
        try { new RegExp(v.trim()); } catch { return 'Invalid regular expression.'; }
      },
    });
    if (isCancelled(pattern)) cancel();

    const flags = await p.text({
      message: 'Flags (e.g. i for case-insensitive, leave blank for none):',
      placeholder: 'i',
    });
    if (isCancelled(flags)) cancel();
    condition = { pattern: pattern.trim(), flags: (flags || '').trim() };
  }

  else if (type === 'dateGroup') {
    const groupBy = await p.select({
      message: 'Group files by:',
      options: [
        { value: 'month',   label: 'Month  (e.g. 2024-03)' },
        { value: 'year',    label: 'Year   (e.g. 2024)' },
        { value: 'quarter', label: 'Quarter (e.g. 2024-Q1)' },
      ],
    });
    if (isCancelled(groupBy)) cancel();
    condition = { groupBy };
  }

  else if (type === 'dateRange') {
    const dateField = await p.select({
      message: 'Use which date?',
      options: [
        { value: 'created',  label: 'Date created' },
        { value: 'modified', label: 'Date modified' },
      ],
    });
    if (isCancelled(dateField)) cancel();

    const from = await p.text({
      message: 'From date (YYYY-MM-DD, or leave blank):',
      placeholder: '2024-01-01',
      validate: v => {
        if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v.trim())) return 'Use format YYYY-MM-DD';
      },
    });
    if (isCancelled(from)) cancel();

    const to = await p.text({
      message: 'To date (YYYY-MM-DD, or leave blank):',
      placeholder: '2024-12-31',
      validate: v => {
        if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v.trim())) return 'Use format YYYY-MM-DD';
      },
    });
    if (isCancelled(to)) cancel();
    condition = { dateField, from: from || null, to: to || null };
  }

  // Destination subfolder name
  const destination = await p.text({
    message: 'Destination subfolder name (e.g. "Images"):',
    validate: v => (!v || !v.trim()) ? 'Enter a folder name.' : undefined,
  });
  if (isCancelled(destination)) cancel();

  const name = await p.text({
    message: 'Rule name (for display):',
    initialValue: destination.trim(),
    validate: v => (!v || !v.trim()) ? 'Enter a rule name.' : undefined,
  });
  if (isCancelled(name)) cancel();

  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: name.trim(),
    type,
    condition,
    destination: destination.trim(),
    enabled: true,
  };
}

// ---------------------------------------------------------------------------
// Main terminal flow
// ---------------------------------------------------------------------------

export async function run() {
  p.intro(chalk.bold.white(' stow — smart file organiser '));

  const config = await loadConfig();

  // 1. Source folder
  const sourcePath = await p.text({
    message: 'Source folder path (files to organise):',
    initialValue: config.lastSource || '',
    placeholder: '/Users/you/Downloads',
    validate: validateDir,
  });
  if (isCancelled(sourcePath)) cancel();

  // 2. Destination folder
  const destinationPath = await p.text({
    message: 'Destination folder path (where organised files go):',
    initialValue: config.lastDestination || '',
    placeholder: '/Users/you/Organised',
    validate: v => {
      if (!v || !v.trim()) return 'Please enter a path.';
    },
  });
  if (isCancelled(destinationPath)) cancel();

  const resolvedSource = path.resolve(sourcePath.trim());
  const resolvedDest = path.resolve(destinationPath.trim());

  // 3. Rules
  let rules = config.rules || [];

  if (rules.length > 0) {
    p.note(
      rules.map((r, i) => `${i + 1}. ${r.name}  ${chalk.dim('→')} ${r.destination}  ${chalk.dim(describeRule(r))}`).join('\n'),
      'Saved rules'
    );

    const useExisting = await p.confirm({ message: 'Use these saved rules?' });
    if (isCancelled(useExisting)) cancel();

    if (!useExisting) rules = [];
  }

  // Add new rules
  let addMore = rules.length === 0;
  if (rules.length > 0) {
    const wantAdd = await p.confirm({ message: 'Add more rules?' });
    if (isCancelled(wantAdd)) cancel();
    addMore = wantAdd;
  }

  while (addMore) {
    const rule = await buildRule();
    rules.push(rule);

    const another = await p.confirm({ message: 'Add another rule?' });
    if (isCancelled(another)) cancel();
    addMore = another;
  }

  if (rules.length === 0) {
    p.cancel(chalk.yellow('No rules defined. Nothing to do.'));
    process.exit(0);
  }

  // 4. Scan
  const scanSpinner = p.spinner();
  scanSpinner.start('Scanning source folder…');

  let scanResult;
  try {
    scanResult = scanFolder(resolvedSource, resolvedDest);
    scanSpinner.stop(`Found ${scanResult.files.length} file(s).`);
  } catch (err) {
    scanSpinner.stop(chalk.red('Scan failed.'));
    p.cancel(err.message);
    process.exit(1);
  }

  if (scanResult.errors.length > 0) {
    p.note(
      scanResult.errors.map(e => `${e.path}: ${e.error}`).join('\n'),
      chalk.yellow(`${scanResult.errors.length} folder(s) could not be read`)
    );
  }

  // 5. Preview
  const previewResult = evaluate(scanResult.files, rules, resolvedDest);

  // Resolve conflicts in preview (pure, no filesystem writes)
  for (const item of previewResult.matched) {
    const { resolvedDestPath, conflict } = previewMove(item.file.path, item.destPath);
    item.destPath = resolvedDestPath;
    item.conflict = conflict;
  }

  formatPreview(previewResult, resolvedDest);

  if (previewResult.matched.length === 0) {
    p.outro(chalk.dim('No files matched any rule. Nothing to move.'));
    process.exit(0);
  }

  // 6. Confirm
  const confirm = await p.confirm({
    message: `Move ${previewResult.matched.length} file(s)?`,
  });
  if (isCancelled(confirm) || !confirm) cancel('No files were moved.');

  // 7. Apply
  const applySpinner = p.spinner();
  applySpinner.start('Moving files…');

  const moved = [];
  const failed = [];

  for (const { file, destPath } of previewResult.matched) {
    try {
      const actualDest = await moveFile(file.path, destPath);
      moved.push({ from: file.path, to: actualDest });
    } catch (err) {
      failed.push({ from: file.path, error: err.message });
    }
  }

  applySpinner.stop('Done.');

  // 8. Save config
  config.rules = rules;
  config.lastSource = resolvedSource;
  config.lastDestination = resolvedDest;
  await saveConfig(config);

  // 9. Summary
  formatSummary({ moved, failed });

  p.outro(chalk.green('All done. Config saved to ~/.stow/config.json'));
}
