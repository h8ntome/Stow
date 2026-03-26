/**
 * useOrganize.js
 * Manages preview and apply state for file organisation.
 */

import { useState, useCallback } from 'react';
import * as api from '../api.js';

export function useOrganize() {
  const [previewResult, setPreviewResult] = useState(null);
  const [applyResult, setApplyResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const preview = useCallback(async ({ sourcePath, destinationBase, files }) => {
    try {
      setLoading(true);
      setError(null);
      setApplyResult(null);
      const result = await api.previewOrganize({ sourcePath, destinationBase, files });
      setPreviewResult(result);
      return result;
    } catch (err) {
      setError(err.message);
      setPreviewResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const apply = useCallback(async ({ sourcePath, destinationBase, files }) => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.applyOrganize({ sourcePath, destinationBase, files });
      setApplyResult(result);
      setPreviewResult(null);
      return result;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setPreviewResult(null);
    setApplyResult(null);
    setError(null);
  }, []);

  return { previewResult, applyResult, loading, error, preview, apply, reset };
}
