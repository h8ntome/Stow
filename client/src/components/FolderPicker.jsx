/**
 * FolderPicker.jsx
 * Unified folder selection component.
 * - macOS: native OS folder picker via /api/fs/pick
 * - Other: text input with 500ms debounce validation
 * Both modes show a colored dot: green = valid, red = invalid.
 */

import { useState, useEffect, useRef } from 'react';
import { FolderOpen } from 'lucide-react';
import { validateFolder, pickFolder } from '../api.js';

export function FolderPicker({ value, onChange, isMac, placeholder }) {
  const [dotStatus, setDotStatus] = useState(null); // null | 'valid' | 'invalid'
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!value?.trim()) { setDotStatus(null); return; }
    clearTimeout(debounceRef.current);
    const delay = isMac ? 80 : 500;
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await validateFolder(value.trim());
        setDotStatus(r.valid ? 'valid' : 'invalid');
      } catch {
        setDotStatus('invalid');
      }
    }, delay);
    return () => clearTimeout(debounceRef.current);
  }, [value, isMac]);

  const handlePick = async () => {
    try {
      const r = await pickFolder();
      if (r.native && !r.cancelled && r.path) {
        onChange(r.path);
      }
    } catch { /* ignore — cancelled or unavailable */ }
  };

  const dot = dotStatus ? (
    <span style={{
      width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0, display: 'inline-block',
      background: dotStatus === 'valid' ? 'var(--success)' : 'var(--danger)',
    }} />
  ) : null;

  if (isMac) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          onClick={handlePick}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '7px 12px', borderRadius: '6px', border: '1px solid var(--border)',
            background: 'var(--bg-input)', color: 'var(--text)', fontSize: '12px',
            cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <FolderOpen size={13} style={{ color: 'var(--text-subtle)' }} />
          Choose Folder
        </button>
        {value ? (
          <span style={{
            fontSize: '12px', color: 'var(--text)', flex: 1,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }} title={value}>
            {value}
          </span>
        ) : (
          <span style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>No folder selected</span>
        )}
        {dot}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ position: 'relative', flex: 1 }}>
        <FolderOpen size={13} style={{
          position: 'absolute', left: '9px', top: '50%',
          transform: 'translateY(-50%)', color: 'var(--text-subtle)', pointerEvents: 'none',
        }} />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder || '/Users/you/folder'}
          style={{
            width: '100%', paddingLeft: '28px', paddingRight: '10px',
            paddingTop: '7px', paddingBottom: '7px',
            borderRadius: '6px', fontSize: '12px',
            border: '1px solid var(--border)',
            background: 'var(--bg-input)', color: 'var(--text)', outline: 'none',
          }}
        />
      </div>
      {dot}
    </div>
  );
}
