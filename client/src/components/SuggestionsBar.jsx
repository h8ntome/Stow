/**
 * SuggestionsBar.jsx
 * Shows auto-detected file types found in the source folder,
 * with one-click buttons to add rules for each.
 */

import { Sparkles, Plus, X, PlusCircle } from 'lucide-react';

export function SuggestionsBar({ suggestions, total, onAddOne, onAddAll, onDismiss }) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div style={{ borderRadius: '8px', padding: '12px',
      background: 'var(--accent-bg)', display: 'flex', flexDirection: 'column', gap: '10px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)' }}>Smart suggestions</p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
              Found {total} file{total !== 1 ? 's' : ''} in {suggestions.length} categor{suggestions.length !== 1 ? 'ies' : 'y'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={onAddAll}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px',
              borderRadius: '6px', fontSize: '11px', fontWeight: 500, border: 'none',
              background: 'var(--accent)', color: 'white', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}>
            <PlusCircle size={12} />
            Add all
          </button>
          <button
            onClick={onDismiss}
            style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-subtle)', display: 'flex' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-muted)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-subtle)'}
            aria-label="Dismiss suggestions">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Suggestion chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {suggestions.map(s => (
          <button
            key={s.destination}
            onClick={() => onAddOne(s)}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 8px',
              borderRadius: '6px', fontSize: '11px', border: '1px solid var(--border)',
              background: 'var(--bg-card)', color: 'var(--text)', cursor: 'pointer' }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.color = 'var(--accent)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.color = 'var(--text)';
            }}
          >
            <Plus size={10} />
            {s.ruleName}
            <span style={{ padding: '1px 5px', borderRadius: '4px', fontSize: '10px',
              background: 'var(--bg-input)', color: 'var(--text-muted)' }}>
              {s.count}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
