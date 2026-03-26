/**
 * RulesEditor.jsx
 * Rule list with drag-to-reorder, enable/disable, edit, delete.
 * Includes 5 targeted presets.
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
import { GripVertical, Pencil, Trash2, Plus, ToggleLeft, ToggleRight, ChevronDown } from 'lucide-react';
import { RuleForm } from './RuleForm.jsx';

// ─── Preset definitions ───────────────────────────────────────────────────

const PRESETS = [
  {
    id: 'downloads',
    name: 'Downloads Cleanup',
    description: 'Sorts by type: Screenshots, Images, Videos, Documents, Archives, Code',
    buildRules: () => [
      { name: 'Screenshots', type: 'category', condition: { category: 'screenshots' }, destination: 'Screenshots' },
      { name: 'Images',      type: 'category', condition: { category: 'images' },      destination: 'Images' },
      { name: 'Videos',      type: 'category', condition: { category: 'videos' },      destination: 'Videos' },
      { name: 'Documents',   type: 'category', condition: { category: 'documents' },   destination: 'Documents' },
      { name: 'Archives',    type: 'category', condition: { category: 'archives' },    destination: 'Archives' },
      { name: 'Code',        type: 'category', condition: { category: 'code' },        destination: 'Code' },
    ],
  },
  {
    id: 'screenshots',
    name: 'Screenshots',
    description: "Finds files with 'screenshot', 'screen shot', 'capture', or 'snip' in the name",
    buildRules: () => [
      { name: 'screenshot',  type: 'keyword', condition: { keyword: 'screenshot',  caseSensitive: false }, destination: 'Screenshots' },
      { name: 'screen shot', type: 'keyword', condition: { keyword: 'screen shot', caseSensitive: false }, destination: 'Screenshots' },
      { name: 'capture',     type: 'keyword', condition: { keyword: 'capture',     caseSensitive: false }, destination: 'Screenshots' },
      { name: 'snip',        type: 'keyword', condition: { keyword: 'snip',        caseSensitive: false }, destination: 'Screenshots' },
    ],
  },
  {
    id: 'by-month',
    name: 'Sort by Month',
    description: 'Groups all files into month subfolders — 2024-03, 2025-01, etc.',
    buildRules: () => [
      { name: 'By Month', type: 'dateGroup', condition: { groupBy: 'month' }, destination: '' },
    ],
  },
  {
    id: 'dev-files',
    name: 'Dev Files',
    description: 'Code files → Code, archives → Archives, log files → Logs',
    buildRules: () => [
      {
        name: 'Code',
        type: 'extension',
        condition: { extensions: ['.js','.ts','.jsx','.tsx','.py','.rb','.go','.rs','.java','.c','.cpp','.h','.cs','.sh','.json','.yaml','.yml','.toml','.md','.env'] },
        destination: 'Code',
      },
      {
        name: 'Archives',
        type: 'extension',
        condition: { extensions: ['.zip','.tar','.gz','.bz2','.7z','.rar','.tgz','.xz'] },
        destination: 'Archives',
      },
      {
        name: 'Logs',
        type: 'extension',
        condition: { extensions: ['.log'] },
        destination: 'Logs',
      },
    ],
  },
  {
    id: 'design-assets',
    name: 'Design Assets',
    description: '.fig/.psd/.ai/.svg → Design, images → Images, video → Video',
    buildRules: () => [
      {
        name: 'Design files',
        type: 'extension',
        condition: { extensions: ['.fig','.sketch','.ai','.psd','.svg','.xd'] },
        destination: 'Design',
      },
      {
        name: 'Images',
        type: 'extension',
        condition: { extensions: ['.png','.jpg','.jpeg','.webp','.gif','.tiff','.heic'] },
        destination: 'Images',
      },
      {
        name: 'Video',
        type: 'extension',
        condition: { extensions: ['.mp4','.mov','.avi','.mkv','.webm'] },
        destination: 'Video',
      },
    ],
  },
];

// ─── Type label colours (accent blue only, no purple) ─────────────────────

const TYPE_STYLE = {
  category:  { bg: 'var(--accent-bg)', color: 'var(--accent)' },
  extension: { bg: 'var(--bg-input)',  color: 'var(--text-muted)' },
  keyword:   { bg: 'var(--bg-input)',  color: 'var(--text-muted)' },
  size:      { bg: 'var(--bg-input)',  color: 'var(--text-muted)' },
  regex:     { bg: 'var(--bg-input)',  color: 'var(--text-muted)' },
  dateGroup: { bg: 'var(--accent-bg)', color: 'var(--accent)' },
  dateRange: { bg: 'var(--bg-input)',  color: 'var(--text-muted)' },
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
        flexShrink: 0, background: badge.bg, color: badge.color }}>
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

// ─── Presets panel ────────────────────────────────────────────────────────

function PresetsPanel({ onApply, onClose }) {
  return (
    <div style={{ marginTop: '8px', border: '1px solid var(--border)', borderRadius: '6px',
      background: 'var(--bg-card)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 12px', borderBottom: '1px solid var(--separator)',
        background: 'var(--bg)' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.04em' }}>Presets</span>
        <button onClick={onClose}
          style={{ fontSize: '12px', color: 'var(--text-subtle)', background: 'none', border: 'none', cursor: 'pointer' }}>
          Done
        </button>
      </div>
      {PRESETS.map((preset, i) => (
        <button key={preset.id}
          onClick={() => { onApply(preset); onClose(); }}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 12px', textAlign: 'left', background: 'none', border: 'none',
            borderTop: i > 0 ? '1px solid var(--separator)' : 'none',
            cursor: 'pointer', gap: '8px' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <div>
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>{preset.name}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{preset.description}</div>
          </div>
          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', flexShrink: 0,
            background: 'var(--bg-input)', color: 'var(--text-subtle)' }}>
            {preset.buildRules().length} rules
          </span>
        </button>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────

export function RulesEditor({ rules, onAdd, onUpdate, onDelete, onReorder, onToggle, loading }) {
  const [formOpen, setFormOpen] = useState(false);
  const [presetsOpen, setPresetsOpen] = useState(false);
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

  const handleApplyPreset = (preset) => {
    preset.buildRules().forEach(r => onAdd({ ...r, enabled: true }));
  };

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
        <span style={{ flex: 1, fontSize: '12px', color: 'var(--text-subtle)' }}>
          {rules.length > 0 ? `${rules.length} rule${rules.length !== 1 ? 's' : ''} — first match wins` : 'No rules yet'}
        </span>

        <button
          onClick={() => setPresetsOpen(o => !o)}
          style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px',
            fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border)',
            background: 'var(--bg-input)', color: 'var(--text-muted)', cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          Presets
          <ChevronDown size={12} style={{ transform: presetsOpen ? 'rotate(180deg)' : '', transition: 'transform 0.15s' }} />
        </button>

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

      {/* Presets panel */}
      {presetsOpen && (
        <PresetsPanel onApply={handleApplyPreset} onClose={() => setPresetsOpen(false)} />
      )}

      {/* Empty state */}
      {!loading && rules.length === 0 && !presetsOpen && (
        <div style={{ padding: '20px', textAlign: 'center', border: '1px dashed var(--border)',
          borderRadius: '6px', color: 'var(--text-subtle)', fontSize: '12px' }}>
          No rules. Use Presets to get started quickly, or add a custom rule.
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
