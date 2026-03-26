/**
 * App.jsx
 * Root component. Single-column layout with Smart Cleanup as the hero action.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Layers, Sparkles, MoveRight, ChevronDown, ChevronRight } from 'lucide-react';
import { ThemeToggle } from './components/ThemeToggle.jsx';
import { FolderPicker } from './components/FolderPicker.jsx';
import { RulesEditor, SMART_CLEANUP_RULES } from './components/RulesEditor.jsx';
import { PreviewPanel } from './components/PreviewPanel.jsx';
import { SuggestionsBar } from './components/SuggestionsBar.jsx';
import { useRules } from './hooks/useRules.js';
import { useOrganize } from './hooks/useOrganize.js';
import { suggestRules, getConfig } from './api.js';

export default function App() {

  // ── Theme ──────────────────────────────────────────────────────────────
  const [theme, setTheme] = useState(() => localStorage.getItem('stow-theme') || 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('stow-theme', theme);
  }, [theme]);

  // ── Platform ───────────────────────────────────────────────────────────
  // Use navigator.platform for instant init; server and client are on same machine
  const [isMac] = useState(() => /Mac/i.test(navigator.platform));

  // ── Paths ──────────────────────────────────────────────────────────────
  const [sourcePath, setSourcePath] = useState('');
  const [destinationPath, setDestinationPath] = useState('');

  useEffect(() => {
    getConfig().then(cfg => {
      if (cfg.lastSource) setSourcePath(prev => prev || cfg.lastSource);
      if (cfg.lastDestination) setDestinationPath(prev => prev || cfg.lastDestination);
    }).catch(() => {});
  }, []); // eslint-disable-line

  // ── Auto-suggestions & file count ─────────────────────────────────────
  const [suggestions, setSuggestions] = useState(null);
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
  const [fileCount, setFileCount] = useState(null);
  const suggestTimer = useRef(null);

  useEffect(() => {
    setSuggestions(null);
    setSuggestionsDismissed(false);
    setFileCount(null);
    if (!sourcePath?.trim()) return;
    clearTimeout(suggestTimer.current);
    suggestTimer.current = setTimeout(async () => {
      try {
        const r = await suggestRules(sourcePath.trim());
        setFileCount(r.total ?? null);
        if (r.suggestions?.length > 0) setSuggestions(r);
      } catch { /* folder might not exist yet */ }
    }, 700);
    return () => clearTimeout(suggestTimer.current);
  }, [sourcePath]);

  // ── Rules & organise hooks ─────────────────────────────────────────────
  const { rules, loading: rulesLoading, addRule, updateRule, removeRule, reorderRules, toggleRule, clearRules } = useRules();
  const { previewResult, applyResult, loading: organizeLoading, error, preview, apply, reset } = useOrganize();

  // ── Rules UI state ─────────────────────────────────────────────────────
  const [rulesExpanded, setRulesExpanded] = useState(false);

  // ── Preview / Apply ────────────────────────────────────────────────────
  const handlePreview = useCallback(async () => {
    await preview({ sourcePath, destinationBase: destinationPath });
  }, [preview, sourcePath, destinationPath]);

  const handleApply = useCallback(async () => {
    await apply({ sourcePath, destinationBase: destinationPath });
    localStorage.setItem('stow-first-done', '1');
  }, [apply, sourcePath, destinationPath]);

  // ── Auto-preview for `stow.` web mode (?repeat=1) ─────────────────────
  const repeatPending = useRef(new URLSearchParams(window.location.search).has('repeat'));

  useEffect(() => {
    if (!repeatPending.current) return;
    if (rulesLoading || !sourcePath.trim() || !destinationPath.trim() || rules.length === 0) return;
    repeatPending.current = false;
    window.history.replaceState({}, '', window.location.pathname);
    handlePreview();
  }, [rulesLoading, sourcePath, destinationPath, rules, handlePreview]);

  // ── Smart Cleanup ──────────────────────────────────────────────────────
  const [smartCleaning, setSmartCleaning] = useState(false);

  const handleSmartCleanup = useCallback(async () => {
    if (!sourcePath.trim()) return;
    setSmartCleaning(true);
    try {
      await clearRules();
      for (const r of SMART_CLEANUP_RULES) {
        await addRule({ ...r, enabled: true });
      }
      setRulesExpanded(false);
      setSuggestionsDismissed(true);
      if (sourcePath.trim() && destinationPath.trim()) {
        await preview({ sourcePath: sourcePath.trim(), destinationBase: destinationPath.trim() });
      }
    } finally { setSmartCleaning(false); }
  }, [sourcePath, destinationPath, clearRules, addRule, preview]);

  // ── Suggestions ────────────────────────────────────────────────────────
  const handleAddOneSuggestion = useCallback((s) => {
    addRule({ name: s.ruleName, type: s.type, condition: s.condition, destination: s.destination, enabled: true });
  }, [addRule]);

  const handleAddAllSuggestions = useCallback(() => {
    if (!suggestions) return;
    suggestions.suggestions.forEach(s =>
      addRule({ name: s.ruleName, type: s.type, condition: s.condition, destination: s.destination, enabled: true })
    );
    setSuggestionsDismissed(true);
  }, [suggestions, addRule]);

  // ── Derived state ──────────────────────────────────────────────────────
  const canPreview = sourcePath.trim() && destinationPath.trim() && rules.length > 0;
  const showSuggestions = suggestions && !suggestionsDismissed;
  const showPreviewSection = !!(previewResult || applyResult || organizeLoading || error);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden',
      background: 'var(--bg)', color: 'var(--text)' }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header style={{ flexShrink: 0, height: '44px',
        background: 'var(--bg)', display: 'flex', alignItems: 'center',
        padding: '0 24px', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Layers size={15} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '-0.2px' }}>stow</span>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-subtle)', marginTop: '1px' }}>file organiser</span>
        <div style={{ marginLeft: 'auto' }}>
          <ThemeToggle theme={theme} onToggle={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} />
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>

          {/* Smart Cleanup */}
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '4px' }}>
                  <Sparkles size={14} style={{ color: 'var(--accent)' }} />
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>Smart Cleanup</span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                  Sorts files into Screenshots, Images, Videos, Audio, Documents, Code, Archives, Design — leaves everything else untouched.
                </p>
                {!sourcePath.trim() && (
                  <p style={{ fontSize: '11px', color: 'var(--text-subtle)', margin: '5px 0 0' }}>
                    Set source and destination folders below, then click Smart Cleanup.
                  </p>
                )}
                {sourcePath.trim() && !destinationPath.trim() && (
                  <p style={{ fontSize: '11px', color: 'var(--text-subtle)', margin: '5px 0 0' }}>
                    Set a destination folder, then click Smart Cleanup to preview.
                  </p>
                )}
              </div>
              <button
                onClick={handleSmartCleanup}
                disabled={!sourcePath.trim() || smartCleaning || organizeLoading}
                style={{
                  display: 'flex', alignItems: 'center', gap: '7px',
                  padding: '9px 18px', fontSize: '13px', fontWeight: 500,
                  borderRadius: '8px', border: 'none', flexShrink: 0,
                  background: sourcePath.trim() ? 'var(--accent)' : 'var(--bg-input)',
                  color: sourcePath.trim() ? 'white' : 'var(--text-muted)',
                  cursor: (!sourcePath.trim() || smartCleaning || organizeLoading) ? 'not-allowed' : 'pointer',
                  opacity: (!sourcePath.trim() || smartCleaning || organizeLoading) ? 0.6 : 1,
                }}
                onMouseEnter={e => { if (sourcePath.trim() && !smartCleaning) e.currentTarget.style.background = 'var(--accent-hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = sourcePath.trim() ? 'var(--accent)' : 'var(--bg-input)'; }}
              >
                <Sparkles size={13} />
                {smartCleaning ? 'Applying…' : 'Smart Cleanup'}
              </button>
            </div>
          </div>

          {/* Source + Destination */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em',
                textTransform: 'uppercase', color: 'var(--text-subtle)', display: 'block', marginBottom: '8px' }}>
                Source
              </span>
              <FolderPicker
                value={sourcePath}
                onChange={setSourcePath}
                isMac={isMac}
                placeholder="/Users/you/Downloads"
              />
              {fileCount !== null && (
                <p style={{ fontSize: '11px', color: 'var(--text-subtle)', margin: '5px 0 0' }}>
                  {fileCount} file{fileCount !== 1 ? 's' : ''} in folder
                </p>
              )}
            </div>

            <MoveRight size={16} style={{ color: 'var(--text-subtle)', flexShrink: 0, marginTop: '20px' }} />

            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em',
                textTransform: 'uppercase', color: 'var(--text-subtle)', display: 'block', marginBottom: '8px' }}>
                Destination
              </span>
              <FolderPicker
                value={destinationPath}
                onChange={setDestinationPath}
                isMac={isMac}
                placeholder="/Users/you/Organised"
              />
              <p style={{ fontSize: '11px', color: 'var(--text-subtle)', margin: '5px 0 0' }}>
                Subfolders will be created here.
              </p>
            </div>
          </div>

          {/* Suggestions */}
          {showSuggestions && (
            <SuggestionsBar
              suggestions={suggestions.suggestions}
              total={suggestions.total}
              onAddOne={handleAddOneSuggestion}
              onAddAll={handleAddAllSuggestions}
              onDismiss={() => setSuggestionsDismissed(true)}
            />
          )}

          {/* Rules */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: rulesExpanded ? '12px' : '0' }}>
              <span style={{ flex: 1, fontSize: '12px', color: 'var(--text-muted)' }}>
                {rules.length > 0
                  ? `${rules.length} rule${rules.length !== 1 ? 's' : ''} active`
                  : 'No rules — use Smart Cleanup above or add a custom rule'}
              </span>
              <button
                onClick={() => setRulesExpanded(e => !e)}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 0',
                  fontSize: '12px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {rulesExpanded
                  ? <><ChevronDown size={13} />Hide rules</>
                  : <><ChevronRight size={13} />Add custom rule</>
                }
              </button>
            </div>
            {rulesExpanded && (
              <RulesEditor
                rules={rules}
                loading={rulesLoading}
                onAdd={addRule}
                onUpdate={updateRule}
                onDelete={removeRule}
                onReorder={reorderRules}
                onToggle={toggleRule}
              />
            )}
          </div>

          {/* Preview button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handlePreview}
              disabled={!canPreview || organizeLoading}
              style={{
                padding: '8px 20px', fontSize: '13px', fontWeight: 500, borderRadius: '8px', border: 'none',
                background: canPreview ? 'var(--accent)' : 'var(--bg-input)',
                color: canPreview ? 'white' : 'var(--text-muted)',
                cursor: !canPreview ? 'not-allowed' : 'pointer',
                opacity: (!canPreview || organizeLoading) ? 0.5 : 1,
              }}
              onMouseEnter={e => { if (canPreview) e.currentTarget.style.background = 'var(--accent-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = canPreview ? 'var(--accent)' : 'var(--bg-input)'; }}
            >
              Preview
            </button>
            {!canPreview && (
              <span style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>
                {!sourcePath.trim() && 'Select a source folder. '}
                {sourcePath.trim() && rules.length === 0 && 'Use Smart Cleanup above or add rules. '}
                {sourcePath.trim() && rules.length > 0 && !destinationPath.trim() && 'Set a destination folder.'}
              </span>
            )}
          </div>

          {/* Preview results (inline) */}
          {showPreviewSection && (
            <div>
              <PreviewPanel
                previewResult={previewResult}
                applyResult={applyResult}
                loading={organizeLoading}
                error={error}
                destinationBase={destinationPath}
                onApply={handleApply}
                onReset={() => { reset(); setSuggestions(null); setSuggestionsDismissed(false); }}
              />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
