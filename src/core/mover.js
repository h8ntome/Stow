/**
 * mover.js
 * Handles all filesystem mutation: moving files, resolving name conflicts,
 * and falling back to copy+delete for cross-drive moves.
 */

import fs from 'fs';
import path from 'path';

const MAX_SUFFIX = 999;

/**
 * Generates a conflict-free destination path by appending a numeric suffix.
 * e.g. photo.jpg → photo(1).jpg → photo(2).jpg
 *
 * @param {string} destPath - The originally desired destination path.
 * @returns {string} A path guaranteed not to exist yet.
 */
function resolveConflict(destPath) {
  if (!fs.existsSync(destPath)) return destPath;

  const ext = path.extname(destPath);
  const base = path.basename(destPath, ext);
  const dir = path.dirname(destPath);

  for (let i = 1; i <= MAX_SUFFIX; i++) {
    const candidate = path.join(dir, `${base}(${i})${ext}`);
    if (!fs.existsSync(candidate)) return candidate;
  }

  throw new Error(
    `Could not resolve filename conflict for "${path.basename(destPath)}" after ${MAX_SUFFIX} attempts.`
  );
}

/**
 * Determines whether a cross-drive move is needed by comparing device IDs.
 * @param {string} sourcePath
 * @param {string} destDir
 * @returns {boolean}
 */
function isCrossDrive(sourcePath, destDir) {
  try {
    const srcDev = fs.statSync(sourcePath).dev;
    const destDev = fs.statSync(destDir).dev;
    return srcDev !== destDev;
  } catch {
    // If we can't stat (e.g. destDir doesn't exist yet), assume same drive
    return false;
  }
}

/**
 * Previews a move without touching the filesystem.
 * Returns the resolved destination path and whether a conflict was detected.
 *
 * @param {string} sourcePath - Absolute source file path.
 * @param {string} destPath   - Desired absolute destination path.
 * @returns {{ resolvedDestPath: string, conflict: boolean }}
 */
export function previewMove(sourcePath, destPath) {
  const conflict = fs.existsSync(destPath);
  const resolvedDestPath = conflict ? resolveConflict(destPath) : destPath;
  return { resolvedDestPath, conflict };
}

/**
 * Moves a file from sourcePath to destPath.
 * - Creates destination directory if it doesn't exist.
 * - Resolves filename conflicts with numeric suffix.
 * - Uses fs.rename for same-drive, copyFile+unlink for cross-drive.
 *
 * @param {string} sourcePath - Absolute source file path.
 * @param {string} destPath   - Desired absolute destination path.
 * @returns {Promise<string>}  The actual destination path used.
 */
export async function moveFile(sourcePath, destPath) {
  const destDir = path.dirname(destPath);

  // Ensure destination directory exists
  await fs.promises.mkdir(destDir, { recursive: true });

  // Resolve any filename conflict
  const resolvedDest = resolveConflict(destPath);

  if (isCrossDrive(sourcePath, destDir)) {
    // Cross-drive: copy then delete
    await fs.promises.copyFile(sourcePath, resolvedDest);
    try {
      await fs.promises.unlink(sourcePath);
    } catch (err) {
      process.stderr.write(
        `[stow] Warning: file copied to "${resolvedDest}" but original could not be deleted: ${err.message}\n`
      );
    }
  } else {
    // Same drive: atomic rename
    await fs.promises.rename(sourcePath, resolvedDest);
  }

  return resolvedDest;
}
