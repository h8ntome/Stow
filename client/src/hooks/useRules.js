/**
 * useRules.js
 * Manages the rules list — fetches from server on mount and provides
 * CRUD + reorder operations that sync to the server.
 */

import { useState, useEffect, useCallback } from 'react';
import * as api from '../api.js';

export function useRules() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getRules();
      setRules(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const addRule = useCallback(async (rule) => {
    const created = await api.createRule(rule);
    setRules(prev => [...prev, created]);
    return created;
  }, []);

  const updateRule = useCallback(async (id, updates) => {
    const updated = await api.updateRule(id, updates);
    setRules(prev => prev.map(r => r.id === id ? updated : r));
    return updated;
  }, []);

  const removeRule = useCallback(async (id) => {
    await api.deleteRule(id);
    setRules(prev => prev.filter(r => r.id !== id));
  }, []);

  const reorderRules = useCallback(async (orderedIds) => {
    const reordered = await api.reorderRules(orderedIds);
    setRules(reordered);
  }, []);

  const toggleRule = useCallback(async (id) => {
    const rule = rules.find(r => r.id === id);
    if (!rule) return;
    await updateRule(id, { enabled: !rule.enabled });
  }, [rules, updateRule]);

  return { rules, loading, error, addRule, updateRule, removeRule, reorderRules, toggleRule, refresh: fetchRules };
}
