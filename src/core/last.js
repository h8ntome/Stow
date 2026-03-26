/**
 * last.js
 * Loads and saves the last-run record at ~/.stow/last.json.
 * Written after every successful apply (terminal and web modes).
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

const LAST_PATH = path.join(os.homedir(), '.stow', 'last.json');
const LAST_TMP  = LAST_PATH + '.tmp';

/**
 * Loads ~/.stow/last.json.
 * Returns null if the file doesn't exist or is unreadable.
 * @returns {Promise<object|null>}
 */
export async function loadLast() {
  if (!fs.existsSync(LAST_PATH)) return null;
  try {
    const raw = await fs.promises.readFile(LAST_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Saves a last-run record to ~/.stow/last.json atomically.
 * @param {{ sourcePath: string, destinationPath: string, rules: object[], filesMoved: number }} opts
 */
export async function saveLast({ sourcePath, destinationPath, rules, filesMoved }) {
  const dir = path.dirname(LAST_PATH);
  fs.mkdirSync(dir, { recursive: true });
  const record = {
    sourcePath,
    destinationPath,
    rules,
    filesMoved,
    timestamp: new Date().toISOString(),
  };
  await fs.promises.writeFile(LAST_TMP, JSON.stringify(record, null, 2), 'utf-8');
  await fs.promises.rename(LAST_TMP, LAST_PATH);
}
