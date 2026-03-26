/**
 * PreviewPanel.jsx
 * Shows the preview of what will happen when rules are applied.
 */

import { useState } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle, CheckCircle2, MoveRight, Loader2 } from 'lucide-react';

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function truncatePath(fullPath, base) {
  if (!fullPath) return '';
  const normalBase = (base || '').replace(/\\/g, '/');
  const normalFull = fullPath.replace(/\\/g, '/');
  if (normalBase && normalFull.startsWith(normalBase)) {
    return normalFull.slice(normalBase.length).replace(/^\//, '') || fullPath;
  }
  return fullPath;
}

function ApplyResult({ result, onReset }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px',
        borderRadius: '8px', background: 'var(--accent-bg)' }}>
        <CheckCircle2 size={18} style={{ color: 'var(--success)', flexShrink: 0 }} />
        <div>
          <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>
            {result.moved.length} file{result.moved.length !== 1 ? 's' : ''} moved
          </p>
          {result.failed.length > 0 && (
            <p style={{ fontSize: '11px', color: 'var(--danger)', marginTop: '2px' }}>
              {result.failed.length} failed
            </p>
          )}
        </div>
      </div>

      {result.failed.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {result.failed.map((f, i) => (
            <div key={i} style={{ fontSize: '11px', color: 'var(--danger)', padding: '6px 10px',
              borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
              {f.name}: {f.error}
            </div>
          ))}
        </div>
      )}

      <button onClick={onReset}
        style={{ width: '100%', padding: '7px', fontSize: '12px', borderRadius: '6px', cursor: 'pointer',
          background: 'var(--bg-input)', border: 'none', color: 'var(--text-muted)' }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
        Organise more files
      </button>
    </div>
  );
}

export function PreviewPanel({ previewResult, applyResult, loading, error, destinationBase, onApply, onReset }) {
  const [unmatchedOpen, setUnmatchedOpen] = useState(false);

  if (applyResult) return <ApplyResult result={applyResult} onReset={onReset} />;

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '48px 0', gap: '10px', color: 'var(--text-subtle)' }}>
        <Loader2 size={20} className="animate-spin" />
        <span style={{ fontSize: '12px' }}>Working…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px',
        borderRadius: '8px', background: 'var(--bg-input)' }}>
        <AlertTriangle size={15} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: '1px' }} />
        <p style={{ fontSize: '12px', color: 'var(--danger)' }}>{error}</p>
      </div>
    );
  }

  if (!previewResult) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '48px 0', gap: '8px', color: 'var(--text-subtle)' }}>
        <MoveRight size={24} style={{ color: 'var(--border)' }} />
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Click Preview to see what will happen</span>
        <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>No files will be moved until you confirm.</span>
      </div>
    );
  }

  const { matched, unmatched } = previewResult;
  const conflictCount = matched.filter(m => m.conflict).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Stats bar */}
      <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-subtle)' }}>
        <span><span style={{ color: 'var(--text)', fontWeight: 500 }}>{matched.length}</span> will move</span>
        {unmatched.length > 0 && <span><span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{unmatched.length}</span> unmatched</span>}
        {conflictCount > 0 && <span><span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{conflictCount}</span> renamed</span>}
      </div>

      {/* Matched files table */}
      {matched.length > 0 ? (
        <div style={{ borderRadius: '6px', overflow: 'hidden' }}>
          <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg)' }}>
                <th style={{ textAlign: 'left', padding: '6px 10px', fontWeight: 500, color: 'var(--text-subtle)' }}>File</th>
                <th style={{ textAlign: 'left', padding: '6px 10px', fontWeight: 500, color: 'var(--text-subtle)' }}>Rule</th>
                <th style={{ textAlign: 'left', padding: '6px 10px', fontWeight: 500, color: 'var(--text-subtle)' }}>Dest</th>
              </tr>
            </thead>
            <tbody>
              {matched.map((item, i) => {
                const destRelative = truncatePath(item.destPath, destinationBase || '');
                const parts = destRelative.replace(/\\/g, '/').split('/');
                const destDir = parts.slice(0, -1).join('/');
                return (
                  <tr key={i} style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '6px 10px' }}>
                      <span style={{ color: 'var(--text)', display: 'block', overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }} title={item.file.name}>
                        {item.file.name}
                      </span>
                      <span style={{ color: 'var(--text-subtle)' }}>{formatSize(item.file.size)}</span>
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      <span style={{ color: 'var(--accent)', display: 'block', overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80px' }}>
                        {item.rule.name}
                      </span>
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      <span style={{ color: 'var(--text)', display: 'block', overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '90px' }}>
                        {destDir || '/'}
                      </span>
                      {item.conflict && <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>renamed</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '6px',
          background: 'var(--bg-input)',
          fontSize: '12px', color: 'var(--text-muted)' }}>
          <AlertTriangle size={14} style={{ flexShrink: 0 }} />
          No files matched any rule.
        </div>
      )}

      {/* Unmatched — collapsible */}
      {unmatched.length > 0 && (
        <div style={{ borderRadius: '6px', overflow: 'hidden' }}>
          <button onClick={() => setUnmatchedOpen(o => !o)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 10px',
              fontSize: '11px', color: 'var(--text-muted)', background: 'none', border: 'none',
              cursor: 'pointer', textAlign: 'left' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
            {unmatchedOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            {unmatched.length} file{unmatched.length !== 1 ? 's' : ''} with no matching rule
          </button>
          {unmatchedOpen && (
            <div>
              {unmatched.map((file, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px',
                  fontSize: '11px', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap', maxWidth: '200px' }}>{file.name}</span>
                  <span style={{ color: 'var(--text-subtle)', flexShrink: 0, marginLeft: '8px' }}>{formatSize(file.size)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Apply button */}
      {matched.length > 0 && (
        <button onClick={onApply} disabled={loading}
          style={{ width: '100%', padding: '7px 14px', fontSize: '13px', fontWeight: 500, borderRadius: '6px',
            background: 'var(--accent)', color: 'white', border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}
          onMouseEnter={e => !loading && (e.currentTarget.style.background = 'var(--accent-hover)')}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}>
          Move {matched.length} file{matched.length !== 1 ? 's' : ''}
        </button>
      )}
    </div>
  );
}
