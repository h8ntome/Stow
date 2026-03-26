/**
 * DestinationInput.jsx
 * Destination folder path input with folder browser button.
 */

import { useState } from 'react';
import { FolderOpen } from 'lucide-react';
import { FolderBrowser } from './FolderBrowser.jsx';

export function DestinationInput({ value, onChange }) {
  const [browserOpen, setBrowserOpen] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', gap: '6px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <FolderOpen size={13} style={{ position: 'absolute', left: '9px', top: '50%',
            transform: 'translateY(-50%)', color: 'var(--text-subtle)', pointerEvents: 'none' }} />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="/Users/you/Organised"
            style={{ width: '100%', paddingLeft: '28px', paddingRight: '10px', paddingTop: '6px',
              paddingBottom: '6px', borderRadius: '6px', fontSize: '12px', border: '1px solid var(--border)',
              background: 'var(--bg-input)', color: 'var(--text)', outline: 'none' }}
          />
        </div>
        <button
          type="button"
          onClick={() => setBrowserOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 10px',
            fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border)',
            background: 'var(--bg-input)', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <FolderOpen size={13} />
          Browse
        </button>
      </div>

      <p style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>
        Subfolders will be created here based on your rules.
      </p>

      {browserOpen && (
        <FolderBrowser
          initialPath={value || null}
          onSelect={(folderPath) => { onChange(folderPath); setBrowserOpen(false); }}
          onClose={() => setBrowserOpen(false)}
        />
      )}
    </div>
  );
}
