/**
 * FolderBrowser.jsx
 * A modal filesystem navigator that lets users click through directories
 * and select any folder on the local machine.
 */

import { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronLeft, Home, Folder, Check, X, Loader2, RefreshCw } from 'lucide-react';
import { browseFolder, browseHome } from '../api.js';

export function FolderBrowser({ onSelect, onClose, initialPath }) {
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useCallback(async (targetPath) => {
    setLoading(true);
    setError(null);
    try {
      const data = targetPath ? await browseFolder(targetPath) : await browseHome();
      setCurrent(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    navigate(initialPath || null);
  }, [navigate, initialPath]);

  const breadcrumbs = current ? buildBreadcrumbs(current.path, current.root) : [];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.65)' }}>
      <div style={{ width: '100%', maxWidth: '480px', borderRadius: '10px', overflow: 'hidden',
        border: '1px solid var(--border)', background: 'var(--bg-card)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>Select folder</span>
          <button onClick={onClose}
            style={{ padding: '3px', background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', display: 'flex' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
            <X size={16} />
          </button>
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', padding: '6px 10px',
          borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
          <button
            onClick={() => current?.parent && navigate(current.parent)}
            disabled={!current?.parent || loading}
            style={{ padding: '5px', background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', display: 'flex', opacity: (!current?.parent || loading) ? 0.3 : 1 }}
            aria-label="Go up">
            <ChevronLeft size={15} />
          </button>

          <button
            onClick={() => navigate(current?.home || null)}
            disabled={loading}
            style={{ padding: '5px', background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', display: 'flex', opacity: loading ? 0.3 : 1 }}
            aria-label="Go home">
            <Home size={15} />
          </button>

          {/* Breadcrumbs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginLeft: '6px',
            overflow: 'hidden', flex: 1, fontSize: '11px', color: 'var(--text-muted)' }}>
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.path} style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                {i > 0 && <ChevronRight size={11} style={{ opacity: 0.4 }} />}
                <button
                  onClick={() => navigate(crumb.path)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 3px',
                    color: i === breadcrumbs.length - 1 ? 'var(--text)' : 'var(--text-muted)',
                    fontSize: '11px', maxWidth: '100px', overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {crumb.label}
                </button>
              </span>
            ))}
          </div>

          <button
            onClick={() => current && navigate(current.path)}
            disabled={loading}
            style={{ padding: '5px', background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', display: 'flex', opacity: loading ? 0.3 : 1, marginLeft: 'auto' }}
            aria-label="Refresh">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Entries */}
        <div style={{ overflowY: 'auto', maxHeight: '280px', minHeight: '160px' }}>
          {loading && !current && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
              <Loader2 size={18} className="animate-spin" style={{ color: 'var(--text-subtle)' }} />
            </div>
          )}

          {error && (
            <div style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--danger)' }}>
              {error}
            </div>
          )}

          {current && !loading && current.entries.length === 0 && (
            <div style={{ padding: '32px 14px', fontSize: '12px', textAlign: 'center',
              color: 'var(--text-subtle)' }}>
              No subfolders here.
            </div>
          )}

          {current?.entries.map(entry => (
            <button
              key={entry.path}
              onClick={() => navigate(entry.path)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                padding: '8px 14px', fontSize: '12px', textAlign: 'left', background: 'none',
                border: 'none', cursor: 'pointer', color: 'var(--text)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <Folder size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {entry.name}
              </span>
              <ChevronRight size={12} style={{ flexShrink: 0, opacity: 0.3 }} />
            </button>
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px',
          borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
          <p style={{ flex: 1, fontSize: '11px', color: 'var(--text-subtle)', overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {current?.path || '…'}
          </p>

          <button onClick={onClose}
            style={{ padding: '5px 10px', fontSize: '12px', borderRadius: '6px', background: 'none',
              border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
            Cancel
          </button>

          <button
            onClick={() => current && onSelect(current.path)}
            disabled={!current}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px',
              fontSize: '12px', fontWeight: 500, borderRadius: '6px', border: 'none',
              background: 'var(--accent)', color: 'white', cursor: current ? 'pointer' : 'not-allowed',
              opacity: current ? 1 : 0.4 }}
            onMouseEnter={e => current && (e.currentTarget.style.background = 'var(--accent-hover)')}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}>
            <Check size={13} />
            Select
          </button>
        </div>
      </div>
    </div>
  );
}

function buildBreadcrumbs(currentPath, root) {
  const crumbs = [];
  let p = currentPath;
  const visited = new Set();

  while (p && !visited.has(p)) {
    visited.add(p);
    const parts = p.split(/[/\\]/).filter(Boolean);
    crumbs.unshift({ path: p, label: parts[parts.length - 1] || p });
    const parent = p.split(/[/\\]/).slice(0, -1).join('/') || root;
    if (parent === p) break;
    p = parent;
  }

  if (crumbs.length > 0) {
    const rootResolved = root.replace(/\\/g, '/');
    if (crumbs[0].path.replace(/\\/g, '/') === rootResolved) {
      crumbs[0].label = '/';
    }
  }

  return crumbs;
}
