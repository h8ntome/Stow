/**
 * api.js
 * All fetch wrappers for the stow API.
 */

const BASE = '/api';

async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

// ---------------------------------------------------------------------------
// Config / session
// ---------------------------------------------------------------------------
export const getConfig = () =>
  request(`${BASE}/rules/config`);

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------
export const getRules = () =>
  request(`${BASE}/rules`);

export const createRule = (rule) =>
  request(`${BASE}/rules`, { method: 'POST', body: JSON.stringify(rule) });

export const updateRule = (id, rule) =>
  request(`${BASE}/rules/${id}`, { method: 'PUT', body: JSON.stringify(rule) });

export const deleteRule = (id) =>
  request(`${BASE}/rules/${id}`, { method: 'DELETE' });

export const reorderRules = (orderedIds) =>
  request(`${BASE}/rules/reorder`, { method: 'PUT', body: JSON.stringify({ orderedIds }) });

// ---------------------------------------------------------------------------
// Filesystem browser
// ---------------------------------------------------------------------------
export const browseFolder = (folderPath) =>
  request(`${BASE}/fs/browse?path=${encodeURIComponent(folderPath)}`);

export const browseHome = () =>
  request(`${BASE}/fs/browse`);

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------
export const scanFolder = (folderPath) =>
  request(`${BASE}/scan?path=${encodeURIComponent(folderPath)}`);

export const suggestRules = (sourcePath) =>
  request(`${BASE}/suggest`, { method: 'POST', body: JSON.stringify({ sourcePath }) });

export const uploadFiles = (fileList) => {
  const form = new FormData();
  for (const file of fileList) form.append('files', file);
  return fetch(`${BASE}/upload`, { method: 'POST', body: form }).then(r => {
    if (!r.ok) return r.json().then(d => Promise.reject(new Error(d.error || 'Upload failed')));
    return r.json();
  });
};

// ---------------------------------------------------------------------------
// Organise
// ---------------------------------------------------------------------------
export const previewOrganize = ({ sourcePath, destinationBase, files }) =>
  request(`${BASE}/preview`, {
    method: 'POST',
    body: JSON.stringify({ sourcePath, destinationBase, files }),
  });

export const applyOrganize = ({ sourcePath, destinationBase, files }) =>
  request(`${BASE}/apply`, {
    method: 'POST',
    body: JSON.stringify({ sourcePath, destinationBase, files }),
  });
