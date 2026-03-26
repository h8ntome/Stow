/**
 * RulesEditor.jsx
 * Rule list with drag-to-reorder, enable/disable, edit, delete.
 */

import { useState } from 'react';
import {
  DndContext, closestCenter, KeyboardSensor,
  PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2, Plus, ToggleLeft, ToggleRight } from 'lucide-react';
import { RuleForm } from './RuleForm.jsx';

// ─── Smart Cleanup rule set (exported for use in App.jsx) ─────────────────

export const SMART_CLEANUP_RULES = [
  // Screenshots: keyword-based, first-match-wins before image category
  { name: 'screenshot keyword',  type: 'keyword', condition: { keyword: 'screenshot',  caseSensitive: false }, destination: 'Screenshots' },
  { name: 'screen shot keyword', type: 'keyword', condition: { keyword: 'screen shot', caseSensitive: false }, destination: 'Screenshots' },
  { name: 'capture keyword',     type: 'keyword', condition: { keyword: 'capture',     caseSensitive: false }, destination: 'Screenshots' },
  { name: 'snip keyword',        type: 'keyword', condition: { keyword: 'snip',        caseSensitive: false }, destination: 'Screenshots' },
  { name: 'grab keyword',        type: 'keyword', condition: { keyword: 'grab',        caseSensitive: false }, destination: 'Screenshots' },
  // File type categories
  { name: 'Images',    type: 'category',  condition: { category: 'images' },    destination: 'Images' },
  { name: 'Videos',    type: 'category',  condition: { category: 'videos' },    destination: 'Videos' },
  { name: 'Audio',     type: 'category',  condition: { category: 'audio' },     destination: 'Audio' },
  { name: 'Documents', type: 'category',  condition: { category: 'documents' }, destination: 'Documents' },
  { name: 'Code',      type: 'category',  condition: { category: 'code' },      destination: 'Code' },
  { name: 'Archives',  type: 'category',  condition: { category: 'archives' },  destination: 'Archives' },
  // Design files (no backend category; use extension type)
  { name: 'Design',    type: 'extension', condition: { extensions: ['.fig', '.sketch', '.ai', '.psd', '.xd'] }, destination: 'Design' },
];

// ─── Type label colours ───────────────────────────────────────────────────

const TYPE_STYLE = {
  category:  { bg: 'var(--accent-bg)', color: 'var(--accent)',     border: 'none' },
  extension: { bg: 'transparent',       color: 'var(--text-muted)', border: '1px solid var(--border)' },
  keyword:   { bg: 'transparent',       color: 'var(--text-muted)', border: '1px solid var(--border)' },
  size:      { bg: 'transparent',       color: 'var(--text-muted)', border: '1px solid var(--border)' },
  regex:     { bg: 'transparent',       color: 'var(--text-muted)', border: '1px solid var(--border)' },
  dateGroup: { bg: 'var(--accent-bg)', color: 'var(--accent)',     border: 'none' },
  dateRange: { bg: 'transparent',       color: 'var(--text-muted)', border: '1px solid var(--border)' },
};

function describeCondition({ type, condition }) {
  switch (type) {
    case 'category':  return condition.category;
    case 'extension': return (condition.extensions || []).slice(0, 4).join(', ') + ((condition.extensions?.length > 4) ? '…' : '');
    case 'keyword':   return `contains "${condition.keyword}"`;
    case 'size': return `${condition.operator === 'gt' ? '>' : '<'} ${(condition.bytes / 1048576).toFixed(1)} MB`;
    case 'regex':     return `/${condition.pattern}/${condition.flags || ''}`;
    case 'dateGroup': return `by ${condition.groupBy}`;
    case 'dateRange': return [condition.from, condition.to].filter(Boolean).join(' → ') || 'any date';
    default: return type;
  }
}

// ─── Sortable rule row ────────────────────────────────────────────────────

function RuleRow({ rule, onEdit, onDelete, onToggle }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: rule.id });
  const enabled = rule.enabled !== false;
  const badge = TYPE_STYLE[rule.type] || TYPE_STYLE.extension;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : enabled ? 1 : 0.45,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '7px 10px',
        borderRadius: '6px',
        border: '1px solid var(--border)',
        background: 'var(--bg-card)',
        marginBottom: '4px',
      }}
    >
      <button {...attributes} {...listeners}
        style={{ color: 'var(--text-subtle)', background: 'none', border: 'none', cursor: 'grab',
          padding: '2px', display: 'flex', flexShrink: 0 }}>
        <GripVertical size={14} />
      </button>

      <span style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '4px', fontWeight: 500,
        flexShrink: 0, background: badge.bg, color: badge.color, border: badge.border }}>
        {rule.type}
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {rule.name}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-subtle)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {describeCondition(rule)}{rule.destination ? ` → ${rule.destination}` : ''}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
        <button onClick={() => onToggle(rule.id)}
          style={{ padding: '3px', background: 'none', border: 'none', cursor: 'pointer',
            color: enabled ? 'var(--accent)' : 'var(--text-subtle)', display: 'flex' }}>
          {enabled ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
        </button>
        <button onClick={() => onEdit(rule)}
          style={{ padding: '3px', background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-subtle)', display: 'flex' }}>
          <Pencil size={13} />
        </button>
        <button onClick={() => onDelete(rule.id)}
          style={{ padding: '3px', background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-subtle)', display: 'flex' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-subtle)'}>
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────

export function RulesEditor({ rules, onAdd, onUpdate, onDelete, onReorder, onToggle, loading }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oi = rules.findIndex(r => r.id === active.id);
    const ni = rules.findIndex(r => r.id === over.id);
    onReorder(arrayMove(rules, oi, ni).map(r => r.id));
  };

  const handleSave = (rule) => {
    if (editingRule) onUpdate(rule.id, rule); else onAdd(rule);
    setFormOpen(false);
    setEditingRule(null);
  };

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
        <span style={{ flex: 1, fontSize: '12px', color: 'var(--text-subtle)' }}>
          {rules.length > 0 ? `${rules.length} rule${rules.length !== 1 ? 's' : ''} — first match wins` : 'No rules yet'}
        </span>

        <button
          onClick={() => { setEditingRule(null); setFormOpen(true); }}
          style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px',
            fontSize: '12px', fontWeight: 500, borderRadius: '6px', border: 'none',
            background: 'var(--accent)', color: 'white', cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}
        >
          <Plus size={13} />
          Add rule
        </button>
      </div>

      {/* Empty state */}
      {!loading && rules.length === 0 && (
        <div style={{ padding: '20px', textAlign: 'center', border: '1px dashed var(--border)',
          borderRadius: '6px', color: 'var(--text-subtle)', fontSize: '12px' }}>
          No rules yet. Use Smart Cleanup above, or add a custom rule.
        </div>
      )}

      {/* Rule list */}
      {rules.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={rules.map(r => r.id)} strategy={verticalListSortingStrategy}>
            {rules.map(rule => (
              <RuleRow key={rule.id} rule={rule}
                onEdit={r => { setEditingRule(r); setFormOpen(true); }}
                onDelete={onDelete}
                onToggle={onToggle}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}

      {/* Rule form modal */}
      {formOpen && (
        <RuleForm rule={editingRule} onSave={handleSave}
          onClose={() => { setFormOpen(false); setEditingRule(null); }} />
      )}
    </div>
  );
}
