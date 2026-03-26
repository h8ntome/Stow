/**
 * scanner.js
 * Recursively scans a directory and returns an array of file info objects.
 * Skips symlinks, hidden system files, and optionally excludes a destination path.
 */

import fs from 'fs';
import path from 'path';

/**
 * Recursively walks a directory.
 * @param {string} dirPath - Absolute path of the directory to scan.
 * @param {string|null} excludePath - Absolute path to exclude (e.g. destination folder inside source).
 * @param {object[]} files - Accumulator for found files.
 * @param {object[]} errors - Accumulator for directories that could not be read.
 */
function walk(dirPath, excludePath, files, errors) {
  let entries;

  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch (err) {
    errors.push({ path: dirPath, error: err.message });
    return;
  }

  for (const entry of entries) {
    // Skip symlinks to avoid loops
    if (entry.isSymbolicLink()) continue;

    const fullPath = path.join(dirPath, entry.name);

    // Skip if this path is (or is inside) the exclude path
    if (excludePath && (fullPath === excludePath || fullPath.startsWith(excludePath + path.sep))) {
      continue;
    }

    if (entry.isDirectory()) {
      walk(fullPath, excludePath, files, errors);
    } else if (entry.isFile()) {
      try {
        const stat = fs.statSync(fullPath);
        const ext = path.extname(entry.name).toLowerCase();

        files.push({
          name: entry.name,
          path: fullPath,
          ext,
          size: stat.size,
          createdAt: stat.birthtime,
          modifiedAt: stat.mtime,
          // Used by mover.js to detect cross-drive moves
          dev: stat.dev,
        });
      } catch (err) {
        errors.push({ path: fullPath, error: err.message });
      }
    }
  }
}

/**
 * Scans a folder recursively and returns all files within it.
 * @param {string} folderPath - The absolute path of the folder to scan.
 * @param {string|null} excludePath - Optional path to exclude from results.
 * @returns {{ files: object[], errors: object[] }}
 */
export function scanFolder(folderPath, excludePath = null) {
  const resolved = path.resolve(folderPath);
  const excludeResolved = excludePath ? path.resolve(excludePath) : null;

  if (!fs.existsSync(resolved)) {
    throw new Error(`Source folder does not exist: ${resolved}`);
  }

  const stat = fs.statSync(resolved);
  if (!stat.isDirectory()) {
    throw new Error(`Path is not a directory: ${resolved}`);
  }

  const files = [];
  const errors = [];

  walk(resolved, excludeResolved, files, errors);

  return { files, errors };
}
