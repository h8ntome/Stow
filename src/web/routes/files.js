/**
 * routes/files.js
 * Endpoints for scanning, browsing, suggesting, and uploading files.
 */

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { scanFolder } from '../../core/scanner.js';
import { CATEGORY_EXTENSIONS } from '../../core/rules-engine.js';

const execFileAsync = promisify(execFile);

const router = Router();

// Multer config: save uploaded files to os.tmpdir()/stow-uploads/
const uploadDir = path.join(os.tmpdir(), 'stow-uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// ---------------------------------------------------------------------------
// GET /api/scan?path=... — scan a local folder
// ---------------------------------------------------------------------------
router.get('/scan', (req, res) => {
  const folderPath = req.query.path;
  if (!folderPath) return res.status(400).json({ error: 'Missing ?path= query parameter.' });

  const resolved = path.resolve(folderPath);
  if (!fs.existsSync(resolved)) return res.status(400).json({ error: `Path does not exist: ${resolved}` });
  if (!fs.statSync(resolved).isDirectory()) return res.status(400).json({ error: `Not a directory: ${resolved}` });

  try {
    res.json(scanFolder(resolved));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/fs/validate?path=... — check if a path is a usable folder
// Returns: { valid: bool, error?: string, home: string }
// ---------------------------------------------------------------------------
router.get('/fs/validate', (req, res) => {
  const home = os.homedir();
  if (!req.query.path) {
    return res.json({ valid: false, error: 'No path provided.', home });
  }
  const resolved = path.resolve(req.query.path);
  if (!fs.existsSync(resolved)) {
    return res.json({ valid: false, error: `Path does not exist: ${resolved}`, home });
  }
  if (!fs.statSync(resolved).isDirectory()) {
    return res.json({ valid: false, error: 'This is a file, not a folder.', home });
  }
  try {
    fs.accessSync(resolved, fs.constants.R_OK | fs.constants.W_OK);
  } catch {
    return res.json({ valid: false, error: 'No read/write permission for this folder.', home });
  }
  return res.json({ valid: true, home });
});

// ---------------------------------------------------------------------------
// GET /api/platform — return the server OS platform
// ---------------------------------------------------------------------------
router.get('/platform', (_req, res) => {
  res.json({ platform: process.platform });
});

// ---------------------------------------------------------------------------
// GET /api/fs/pick — trigger native OS folder picker (macOS only via osascript)
// Returns: { native: true, path: string } | { native: true, cancelled: true } | { native: false }
// ---------------------------------------------------------------------------
router.get('/fs/pick', async (_req, res) => {
  if (process.platform !== 'darwin') {
    return res.json({ native: false });
  }
  try {
    const { stdout } = await execFileAsync('osascript', ['-e', 'POSIX path of (choose folder)']);
    const picked = stdout.trim().replace(/\/$/, '');
    return res.json({ native: true, path: picked });
  } catch (err) {
    // Exit code 1 = user pressed Cancel in the dialog
    if (err.code === 1) return res.json({ native: true, cancelled: true });
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/fs/browse?path=... — list directories for the folder picker
// Returns: { path, parent, entries: [{ name, path, isDir }] }
// ---------------------------------------------------------------------------
router.get('/fs/browse', (req, res) => {
  // Default to home directory; allow explicit '/' for root
  const requestedPath = req.query.path || os.homedir();
  const resolved = path.resolve(requestedPath);

  if (!fs.existsSync(resolved)) {
    // Fall back to home if path doesn't exist
    return res.redirect(`/api/fs/browse?path=${encodeURIComponent(os.homedir())}`);
  }

  if (!fs.statSync(resolved).isDirectory()) {
    return res.status(400).json({ error: 'Not a directory.' });
  }

  let entries = [];
  try {
    entries = fs.readdirSync(resolved, { withFileTypes: true })
      .filter(d => d.isDirectory() && !d.isSymbolicLink() && !d.name.startsWith('.'))
      .map(d => ({
        name: d.name,
        path: path.join(resolved, d.name),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    // Permission error — return empty entries rather than crashing
    entries = [];
  }

  // Also include hidden folders if explicitly requested
  if (req.query.hidden === '1') {
    try {
      const hidden = fs.readdirSync(resolved, { withFileTypes: true })
        .filter(d => d.isDirectory() && !d.isSymbolicLink() && d.name.startsWith('.'))
        .map(d => ({ name: d.name, path: path.join(resolved, d.name) }))
        .sort((a, b) => a.name.localeCompare(b.name));
      entries = [...entries, ...hidden];
    } catch { /* ignore */ }
  }

  const parent = resolved === path.parse(resolved).root ? null : path.dirname(resolved);

  res.json({
    path: resolved,
    parent,
    home: os.homedir(),
    root: path.parse(resolved).root,
    entries,
  });
});

// ---------------------------------------------------------------------------
// POST /api/suggest — analyse a folder and suggest rules based on what's in it
// Body: { sourcePath }
// Returns: { suggestions: [{ ruleName, type, condition, destination, count }] }
// ---------------------------------------------------------------------------
router.post('/suggest', (req, res) => {
  const { sourcePath } = req.body;
  if (!sourcePath) return res.status(400).json({ error: 'sourcePath is required.' });

  const resolved = path.resolve(sourcePath);
  if (!fs.existsSync(resolved)) return res.status(400).json({ error: `Path does not exist: ${resolved}` });

  let files;
  try {
    ({ files } = scanFolder(resolved));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  // Count files per category using the same lookup table as the rules engine
  const ORDERED_CATEGORIES = [
    'screenshots', 'images', 'videos', 'audio',
    'documents', 'archives', 'code', 'fonts',
  ];

  const counts = {};
  for (const file of files) {
    const nameLower = file.name.toLowerCase();
    for (const category of ORDERED_CATEGORIES) {
      const exts = CATEGORY_EXTENSIONS[category];
      if (!exts || !exts.includes(file.ext)) continue;

      // Screenshots require keyword check
      if (category === 'screenshots') {
        if (!nameLower.includes('screenshot') && !nameLower.includes('screen shot')) continue;
      }

      counts[category] = (counts[category] || 0) + 1;
      break; // each file counts toward the first matching category only
    }
  }

  const CATEGORY_LABELS = {
    screenshots: 'Screenshots',
    images: 'Images',
    videos: 'Videos',
    audio: 'Audio',
    documents: 'Documents',
    archives: 'Archives',
    code: 'Code',
    fonts: 'Fonts',
  };

  const suggestions = ORDERED_CATEGORIES
    .filter(cat => (counts[cat] || 0) > 0)
    .map(cat => ({
      ruleName: CATEGORY_LABELS[cat],
      type: 'category',
      condition: { category: cat },
      destination: CATEGORY_LABELS[cat],
      count: counts[cat],
    }));

  res.json({ suggestions, total: files.length });
});

// ---------------------------------------------------------------------------
// POST /api/upload — accept drag-dropped files
// ---------------------------------------------------------------------------
router.post('/upload', upload.array('files'), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded.' });
  }

  try {
    const files = req.files.map(f => {
      const stat = fs.statSync(f.path);
      const ext = path.extname(f.originalname).toLowerCase();
      return {
        name: f.originalname,
        path: f.path,
        ext,
        size: stat.size,
        createdAt: stat.birthtime,
        modifiedAt: stat.mtime,
        dev: stat.dev,
        uploaded: true,
      };
    });
    res.json({ files, errors: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
