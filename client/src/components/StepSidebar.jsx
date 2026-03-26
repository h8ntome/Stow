/**
 * StepSidebar.jsx
 * Narrow left sidebar showing the 5-step flow.
 * Active step is highlighted; completed steps show a checkmark.
 */

import { Check } from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Source folder',  hint: 'Pick where to scan' },
  { id: 2, label: 'Set rules',      hint: 'Use presets or custom' },
  { id: 3, label: 'Destination',    hint: 'Where files will go' },
  { id: 4, label: 'Preview',        hint: 'Review before moving' },
  { id: 5, label: 'Apply',          hint: 'Confirm and move files' },
];

export function StepSidebar({ completedSteps, onStepClick }) {
  // Active = first incomplete step (1-indexed)
  const activeStep = STEPS.find(s => !completedSteps.includes(s.id))?.id ?? 5;

  return (
    <aside style={{
      width: '192px',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: '2px',
      paddingTop: '4px',
    }}>
      {STEPS.map((step) => {
        const done   = completedSteps.includes(step.id);
        const active = step.id === activeStep;
        const locked = !done && step.id > activeStep;

        return (
          <button
            key={step.id}
            onClick={() => done && onStepClick && onStepClick(step.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '7px 10px',
              borderRadius: '6px',
              border: 'none',
              background: active ? 'var(--accent-bg)' : 'transparent',
              cursor: done ? 'pointer' : 'default',
              textAlign: 'left',
              width: '100%',
              opacity: locked ? 0.35 : 1,
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => { if (done && !active) e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = active ? 'var(--accent-bg)' : 'transparent'; }}
          >
            {/* Badge */}
            <span style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 600,
              background: done ? 'var(--success)' : active ? 'var(--accent)' : 'var(--bg-input)',
              color: done || active ? 'white' : 'var(--text-subtle)',
              border: done || active ? 'none' : '1px solid var(--border)',
            }}>
              {done ? <Check size={11} strokeWidth={3} /> : step.id}
            </span>

            {/* Label */}
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: '12px',
                fontWeight: active ? 600 : 400,
                color: active ? 'var(--accent)' : done ? 'var(--text)' : 'var(--text-muted)',
                lineHeight: 1.3,
              }}>
                {step.label}
              </div>
              <div style={{
                fontSize: '11px',
                color: 'var(--text-subtle)',
                lineHeight: 1.3,
                marginTop: '1px',
              }}>
                {step.hint}
              </div>
            </div>
          </button>
        );
      })}
    </aside>
  );
}
