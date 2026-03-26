/**
 * routes/rules.js
 * CRUD endpoints for managing stow rules.
 * Rules are stored in ~/.stow/config.json via config.js.
 */

import { Router } from 'express';
import { loadConfig, saveConfig } from '../../core/config.js';

const router = Router();

// GET /api/config — return full config (lastSource, lastDestination, rules)
router.get('/config', async (req, res) => {
  try {
    const config = await loadConfig();
    res.json({
      rules: config.rules || [],
      lastSource: config.lastSource || null,
      lastDestination: config.lastDestination || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/rules — return all rules
router.get('/', async (req, res) => {
  try {
    const config = await loadConfig();
    res.json(config.rules || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/rules — create a new rule
router.post('/', async (req, res) => {
  try {
    const config = await loadConfig();
    const rule = {
      ...req.body,
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      enabled: req.body.enabled !== false,
    };
    config.rules = [...(config.rules || []), rule];
    await saveConfig(config);
    res.status(201).json(rule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/rules/reorder — reorder rules by providing an array of ordered IDs
// Must be defined BEFORE /api/rules/:id to avoid 'reorder' being treated as an ID
router.put('/reorder', async (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ error: 'orderedIds must be an array.' });
    }

    const config = await loadConfig();
    const rulesById = Object.fromEntries((config.rules || []).map(r => [r.id, r]));
    const reordered = orderedIds.map(id => rulesById[id]).filter(Boolean);

    // Append any rules not in orderedIds at the end (safety net)
    const includedIds = new Set(orderedIds);
    for (const rule of config.rules || []) {
      if (!includedIds.has(rule.id)) reordered.push(rule);
    }

    config.rules = reordered;
    await saveConfig(config);
    res.json(config.rules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/rules/:id — update a rule
router.put('/:id', async (req, res) => {
  try {
    const config = await loadConfig();
    const index = (config.rules || []).findIndex(r => r.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Rule not found.' });

    config.rules[index] = { ...config.rules[index], ...req.body, id: req.params.id };
    await saveConfig(config);
    res.json(config.rules[index]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/rules/:id — delete a rule
router.delete('/:id', async (req, res) => {
  try {
    const config = await loadConfig();
    const before = (config.rules || []).length;
    config.rules = (config.rules || []).filter(r => r.id !== req.params.id);

    if (config.rules.length === before) {
      return res.status(404).json({ error: 'Rule not found.' });
    }

    await saveConfig(config);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
