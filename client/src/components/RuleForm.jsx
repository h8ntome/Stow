/**
 * RuleForm.jsx
 * Modal for adding or editing a rule.
 * Dynamically renders condition fields based on selected rule type.
 */

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const RULE_TYPES = [
  { value: 'category',  label: 'File Category',    hint: 'images, videos, documents…' },
  { value: 'extension', label: 'File Extension',   hint: '.jpg, .pdf, .mp4…' },
  { value: 'keyword',   label: 'Filename Keyword', hint: 'filename contains word' },
  { value: 'size',      label: 'File Size',        hint: 'larger or smaller than…' },
  { value: 'regex',     label: 'Filename Regex',   hint: 'advanced pattern' },
  { value: 'dateGroup', label: 'Group by Date',    hint: 'sort into month/year folders' },
  { value: 'dateRange', label: 'Date Range',       hint: 'files from a specific period' },
];

const CATEGORIES = ['images', 'videos', 'audio', 'documents', 'archives', 'code', 'screenshots', 'fonts'];

const inputStyle = {
  width: '100%',
  padding: '6px 10px',
  borderRadius: '6px',
  fontSize: '12px',
  background: 'var(--bg-input)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  outline: 'none',
};

const selectStyle = { ...inputStyle, cursor: 'pointer' };

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '11px', fontWeight: 500,
        color: 'var(--text-muted)', marginBottom: '4px' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function buildDefaultCondition(type) {
  switch (type) {
    case 'category':  return { category: 'images' };
    case 'extension': return { extensions: [] };
    case 'keyword':   return { keyword: '', caseSensitive: false };
    case 'size':      return { operator: 'gt', bytes: 10 * 1024 * 1024 };
    case 'regex':     return { pattern: '', flags: 'i' };
    case 'dateGroup': return { groupBy: 'month' };
    case 'dateRange': return { dateField: 'created', from: '', to: '' };
    default:          return {};
  }
}

export function RuleForm({ rule, onSave, onClose }) {
  const isEdit = Boolean(rule);
  const [type, setType] = useState(rule?.type || 'category');
  const [condition, setCondition] = useState(rule?.condition || buildDefaultCondition('category'));
  const [destination, setDestination] = useState(rule?.destination || '');
  const [name, setName] = useState(rule?.name || '');
  const [extensionInput, setExtensionInput] = useState(
    rule?.type === 'extension' ? (rule.condition.extensions || []).join(', ') : ''
  );

  useEffect(() => {
    if (!isEdit) {
      setCondition(buildDefaultCondition(type));
      setExtensionInput('');
    }
  }, [type, isEdit]);

  const updateCondition = (key, value) => setCondition(prev => ({ ...prev, [key]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    let finalCondition = { ...condition };
    if (type === 'extension') {
      finalCondition.extensions = extensionInput
        .split(',').map(s => { s = s.trim().toLowerCase(); return s.startsWith('.') ? s : '.' + s; })
        .filter(Boolean);
    }
    onSave({
      ...(rule || {}),
      type,
      condition: finalCondition,
      destination: destination.trim(),
      name: name.trim() || destination.trim(),
      enabled: rule?.enabled !== false,
    });
  };

  const renderConditionFields = () => {
    switch (type) {
      case 'category':
        return (
          <Field label="Category">
            <select value={condition.category || 'images'}
              onChange={e => updateCondition('category', e.target.value)} style={selectStyle}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </Field>
        );

      case 'extension':
        return (
          <Field label="Extensions (comma-separated, e.g. .jpg, .png)">
            <input type="text" value={extensionInput} onChange={e => setExtensionInput(e.target.value)}
              placeholder=".jpg, .png, .gif" style={inputStyle} />
          </Field>
        );

      case 'keyword':
        return (
          <>
            <Field label="Keyword">
              <input type="text" value={condition.keyword || ''}
                onChange={e => updateCondition('keyword', e.target.value)}
                placeholder="e.g. invoice, screenshot" style={inputStyle} />
            </Field>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px',
              fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <input type="checkbox" checked={condition.caseSensitive || false}
                onChange={e => updateCondition('caseSensitive', e.target.checked)} />
              Case-sensitive
            </label>
          </>
        );

      case 'size':
        return (
          <div style={{ display: 'flex', gap: '10px' }}>
            <Field label="Condition">
              <select value={condition.operator || 'gt'}
                onChange={e => updateCondition('operator', e.target.value)} style={selectStyle}>
                <option value="gt">Larger than</option>
                <option value="lt">Smaller than</option>
              </select>
            </Field>
            <Field label="Size (MB)">
              <input type="number" min="0" step="0.1"
                value={condition.bytes ? (condition.bytes / (1024 * 1024)).toFixed(1) : '10'}
                onChange={e => updateCondition('bytes', Math.round(parseFloat(e.target.value) * 1024 * 1024))}
                style={inputStyle} />
            </Field>
          </div>
        );

      case 'regex':
        return (
          <>
            <Field label="Pattern">
              <input type="text" value={condition.pattern || ''}
                onChange={e => updateCondition('pattern', e.target.value)}
                placeholder="e.g. ^invoice_\d+" style={{ ...inputStyle, fontFamily: 'monospace' }} />
            </Field>
            <Field label="Flags (e.g. i for case-insensitive)">
              <input type="text" value={condition.flags || ''}
                onChange={e => updateCondition('flags', e.target.value)}
                placeholder="i" maxLength={6} style={{ ...inputStyle, fontFamily: 'monospace' }} />
            </Field>
          </>
        );

      case 'dateGroup':
        return (
          <Field label="Group files by">
            <select value={condition.groupBy || 'month'}
              onChange={e => updateCondition('groupBy', e.target.value)} style={selectStyle}>
              <option value="month">Month (e.g. 2024-03)</option>
              <option value="year">Year (e.g. 2024)</option>
              <option value="quarter">Quarter (e.g. 2024-Q1)</option>
            </select>
          </Field>
        );

      case 'dateRange':
        return (
          <>
            <Field label="Use date">
              <select value={condition.dateField || 'created'}
                onChange={e => updateCondition('dateField', e.target.value)} style={selectStyle}>
                <option value="created">Date created</option>
                <option value="modified">Date modified</option>
              </select>
            </Field>
            <div style={{ display: 'flex', gap: '10px' }}>
              <Field label="From (YYYY-MM-DD)">
                <input type="date" value={condition.from || ''}
                  onChange={e => updateCondition('from', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="To (YYYY-MM-DD)">
                <input type="date" value={condition.to || ''}
                  onChange={e => updateCondition('to', e.target.value)} style={inputStyle} />
              </Field>
            </div>
          </>
        );

      default: return null;
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.65)' }}>
      <div style={{ width: '100%', maxWidth: '420px', borderRadius: '10px',
        background: 'var(--bg-card)', border: '1px solid var(--border)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
            {isEdit ? 'Edit rule' : 'Add rule'}
          </span>
          <button onClick={onClose}
            style={{ padding: '3px', borderRadius: '4px', color: 'var(--text-muted)',
              background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}
          style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

          <Field label="Rule type">
            <select value={type} onChange={e => setType(e.target.value)} style={selectStyle}>
              {RULE_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label} — {t.hint}</option>
              ))}
            </select>
          </Field>

          {renderConditionFields()}

          <Field label="Move to folder named">
            <input type="text" value={destination} onChange={e => setDestination(e.target.value)}
              placeholder="e.g. Images" required style={inputStyle} />
          </Field>

          <Field label="Rule name (for display)">
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder={destination || 'My Rule'} style={inputStyle} />
          </Field>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', paddingTop: '4px' }}>
            <button type="button" onClick={onClose}
              style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px', background: 'none',
                border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
              Cancel
            </button>
            <button type="submit"
              style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 500, borderRadius: '6px',
                background: 'var(--accent)', color: 'white', border: 'none', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}>
              {isEdit ? 'Save changes' : 'Add rule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
