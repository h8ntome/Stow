/**
 * routes/organize.js
 * Preview and apply file organisation based on saved rules.
 */

import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { loadConfig, saveConfig } from '../../core/config.js';
import { saveLast } from '../../core/last.js';
import { scanFolder } from '../../core/scanner.js';
import { evaluate } from '../../core/rules-engine.js';
import { moveFile, previewMove } from '../../core/mover.js';

const router = Router();

/**
 * Shared logic: scan files, apply rules, resolve conflicts.
 * Does NOT touch the filesystem.
 *
 * Body: { sourcePath, destinationBase, files? }
 * - sourcePath: scan this folder (required if files not provided)
 * - files: pre-scanned file list (e.g. from /api/upload)
 * - destinationBase: absolute path of the destination folder
 */
async function buildPreview(req, res) {
  const { sourcePath, destinationBase, files: providedFiles } = req.body;

  if (!destinationBase) {
    return res.status(400).json({ error: 'destinationBase is required.' });
  }

  const resolvedDest = path.resolve(destinationBase);

  let files;

  if (providedFiles && Array.isArray(providedFiles)) {
    files = providedFiles;
  } else {
    if (!sourcePath) {
      return res.status(400).json({ error: 'Either sourcePath or files must be provided.' });
    }

    const resolvedSrc = path.resolve(sourcePath);

    if (!fs.existsSync(resolvedSrc)) {
      return res.status(400).json({ error: `Source path does not exist: ${resolvedSrc}` });
    }

    try {
      const { files: scanned, errors } = scanFolder(resolvedSrc, resolvedDest);
      files = scanned;
      if (errors.length > 0) {
        // Include scan errors in response but don't abort
        res.locals.scanErrors = errors;
      }
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  const config = await loadConfig();
  const rules = config.rules || [];

  const { matched, unmatched } = evaluate(files, rules, resolvedDest);

  // Resolve conflicts without touching the filesystem
  const matchedWithConflicts = matched.map(item => {
    const { resolvedDestPath, conflict } = previewMove(item.file.path, item.destPath);
    return { ...item, destPath: resolvedDestPath, conflict };
  });

  return { matched: matchedWithConflicts, unmatched, scanErrors: res.locals.scanErrors || [] };
}

// POST /api/preview — dry run, no filesystem writes
router.post('/preview', async (req, res) => {
  try {
    const preview = await buildPreview(req, res);
    if (!preview) return; // response already sent by buildPreview on error
    res.json(preview);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/apply — execute moves sequentially
router.post('/apply', async (req, res) => {
  try {
    const preview = await buildPreview(req, res);
    if (!preview) return;

    const { matched } = preview;
    const moved = [];
    const failed = [];

    // Sequential moves to avoid race conditions on conflict numbering
    for (const { file, destPath } of matched) {
      try {
        const actualDest = await moveFile(file.path, destPath);
        moved.push({ from: file.path, to: actualDest, name: file.name });
      } catch (err) {
        failed.push({ from: file.path, name: file.name, error: err.message });
      }
    }

    // Save last used paths to config
    const config = await loadConfig();
    if (req.body.sourcePath) config.lastSource = path.resolve(req.body.sourcePath);
    config.lastDestination = path.resolve(req.body.destinationBase);
    await saveConfig(config);

    // Save last-run record for `stow.`
    await saveLast({
      sourcePath:      config.lastSource || '',
      destinationPath: config.lastDestination,
      rules:           config.rules || [],
      filesMoved:      moved.length,
    });

    res.json({ moved, failed, total: matched.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
