/**
 * config.js
 * Loads and saves the stow configuration from ~/.stow/config.json.
 * All other modules read rules and preferences through this module.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.stow');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');
const TEMP_PATH = path.join(CONFIG_DIR, 'config.tmp.json');

const DEFAULT_CONFIG = {
  version: 1,
  rules: [],
  lastSource: null,
  lastDestination: null,
};

/**
 * Ensures ~/.stow/ directory exists.
 */
function ensureConfigDir() {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

/**
 * Loads the config from disk.
 * If the file does not exist, returns the default config.
 * If the file is corrupt, resets to default and warns.
 * @returns {object} The config object.
 */
export async function loadConfig() {
  ensureConfigDir();

  if (!fs.existsSync(CONFIG_PATH)) {
    return structuredClone(DEFAULT_CONFIG);
  }

  try {
    const raw = await fs.promises.readFile(CONFIG_PATH, 'utf-8');
    const parsed = JSON.parse(raw);

    // Basic schema migration: if version field missing, treat as v1
    if (!parsed.version) parsed.version = 1;

    return parsed;
  } catch (err) {
    process.stderr.write(
      `[stow] Warning: config file at ${CONFIG_PATH} is corrupt and has been reset. (${err.message})\n`
    );
    const fresh = structuredClone(DEFAULT_CONFIG);
    await saveConfig(fresh);
    return fresh;
  }
}

/**
 * Saves the config to disk atomically (write to temp, then rename).
 * @param {object} config - The config object to save.
 */
export async function saveConfig(config) {
  ensureConfigDir();
  const json = JSON.stringify(config, null, 2);
  await fs.promises.writeFile(TEMP_PATH, json, 'utf-8');
  await fs.promises.rename(TEMP_PATH, CONFIG_PATH);
}

/**
 * Returns the path to the config file (for display purposes).
 */
export { CONFIG_PATH };
