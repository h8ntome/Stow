/**
 * App.jsx
 * Root component. Three-column layout: sidebar | main | preview.
 * Manages theme, step state, folder paths, suggestions, Smart Sort.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Layers, Zap, CheckCircle } from 'lucide-react';
import { ThemeToggle } from './components/ThemeToggle.jsx';
import { StepSidebar } from './components/StepSidebar.jsx';
import { FolderInput } from './components/FolderInput.jsx';
import { DestinationInput } from './components/DestinationInput.jsx';
import { RulesEditor } from './components/RulesEditor.jsx';
import { PreviewPanel } from './components/PreviewPanel.jsx';
import { SuggestionsBar } from './components/SuggestionsBar.jsx';
import { useRules } from './hooks/useRules.js';
import { useOrganize } from './hooks/useOrganize.js';
import { uploadFiles, suggestRules, getConfig } from './api.js';

// ─── Shared style atoms ───────────────────────────────────────────────────

const card = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  padding: '16px',
};

const sectionLabel = {
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: 'var(--text-subtle)',
  marginBottom: '12px',
  display: 'block',
};

// ─────────────────────────────────────────────────────────────────────────

export default function App() {

  // ── Theme ──────────────────────────────────────────────────────────────
  const [theme, setTheme] = useState(() => localStorage.getItem('stow-theme') || 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('stow-theme', theme);
  }, [theme]);

  // ── Paths ──────────────────────────────────────────────────────────────
  const [sourcePath, setSourcePath] = useState('');
  const [destinationPath, setDestinationPath] = useState('');

  useEffect(() => {
    getConfig().then(cfg => {
      if (cfg.lastSource) setSourcePath(prev => prev || cfg.lastSource);
      if (cfg.lastDestination) setDestinationPath(prev => prev || cfg.lastDestination);
    }).catch(() => {});
  }, []); // eslint-disable-line

  // ── Uploaded files ─────────────────────────────────────────────────────
  const [droppedFiles, setDroppedFiles] = useState([]);
  const [uploadedFileData, setUploadedFileData] = useState(null);
  const [uploading, setUploading] = useState(false);

  // ── Auto-suggestions ────────────────────────────────────────────────────
  const [suggestions, setSuggestions] = useState(null);
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
  const suggestTimer = useRef(null);

  useEffect(() => {
    setSuggestions(null);
    setSuggestionsDismissed(false);
    if (!sourcePath?.trim()) return;
    clearTimeout(suggestTimer.current);
    suggestTimer.current = setTimeout(async () => {
      try {
        const r = await suggestRules(sourcePath.trim());
        if (r.suggestions?.length > 0) setSuggestions(r);
      } catch { /* folder might not exist yet */ }
    }, 700);
    return () => clearTimeout(suggestTimer.current);
  }, [sourcePath]);

  // ── Rules & organise hooks ─────────────────────────────────────────────
  const { rules, loading: rulesLoading, addRule, updateRule, removeRule, reorderRules, toggleRule } = useRules();
  const { previewResult, applyResult, loading: organizeLoading, error, preview, apply, reset } = useOrganize();

  // ── File upload ────────────────────────────────────────────────────────
  const handleFilesDropped = useCallback(async (files) => {
    setDroppedFiles(files);
    setUploading(true);
    try {
      const r = await uploadFiles(files);
      setUploadedFileData(r.files);
    } catch { /* silent */ } finally { setUploading(false); }
  }, []);

  const handleClearDropped = useCallback(() => {
    setDroppedFiles([]);
    setUploadedFileData(null);
    reset();
  }, [reset]);

  // ── Preview / Apply ────────────────────────────────────────────────────
  const handlePreview = useCallback(async () => {
    await preview({
      sourcePath: uploadedFileData ? null : sourcePath,
      destinationBase: destinationPath,
      files: uploadedFileData || null,
    });
  }, [preview, sourcePath, destinationPath, uploadedFileData]);

  const handleApply = useCallback(async () => {
    await apply({
      sourcePath: uploadedFileData ? null : sourcePath,
      destinationBase: destinationPath,
      files: uploadedFileData ? previewResult?.matched.map(m => m.file) : null,
    });
    localStorage.setItem('stow-first-done', '1');
  }, [apply, sourcePath, destinationPath, uploadedFileData, previewResult]);

  // ── Smart Sort ─────────────────────────────────────────────────────────
  const [smartSorting, setSmartSorting] = useState(false);

  const handleSmartSort = useCallback(async () => {
    if (!sourcePath || !destinationPath) return;
    setSmartSorting(true);
    try {
      const r = await suggestRules(sourcePath.trim());
      if (!r.suggestions?.length) return;
      for (const s of r.suggestions) {
        await addRule({ name: s.ruleName, type: s.type, condition: s.condition, destination: s.destination, enabled: true });
      }
      setSuggestionsDismissed(true);
      await preview({ sourcePath, destinationBase: destinationPath });
    } finally { setSmartSorting(false); }
  }, [sourcePath, destinationPath, addRule, preview]);

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

  // ── Step logic ─────────────────────────────────────────────────────────
  const completedSteps = [
    sourcePath.trim() && 1,
    rules.length > 0 && 2,
    destinationPath.trim() && 3,
    previewResult && 4,
    applyResult && 5,
  ].filter(Boolean);

  const canPreview = (sourcePath.trim() || uploadedFileData) && destinationPath.trim() && rules.length > 0;
  const canSmartSort = (sourcePath.trim() || uploadedFileData) && destinationPath.trim() && rules.length === 0;
  const showSuggestions = suggestions && !suggestionsDismissed;
  const firstDone = !!localStorage.getItem('stow-first-done');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden',
      background: 'var(--bg)', color: 'var(--text)' }}>

      {/* ── Titlebar ──────────────────────────────────────────────────── */}
      <header style={{ flexShrink: 0, height: '44px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg-card)', display: 'flex', alignItems: 'center',
        padding: '0 16px', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Layers size={15} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '-0.2px' }}>stow</span>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-subtle)', marginTop: '1px' }}>file organiser</span>
        <div style={{ marginLeft: 'auto' }}>
          <ThemeToggle theme={theme} onToggle={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} />
        </div>
      </header>

      {/* ── Three-column body ─────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Sidebar */}
        <div style={{ width: '200px', flexShrink: 0, borderRight: '1px solid var(--border)',
          background: 'var(--bg-card)', padding: '16px 8px', overflowY: 'auto' }}>
          <StepSidebar completedSteps={completedSteps} />
        </div>

        {/* Main column */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          <div style={{ maxWidth: '620px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* Welcome / empty state (step 1 not done) */}
            {!sourcePath.trim() && !uploadedFileData && !firstDone && (
              <div style={{ ...card, borderStyle: 'dashed', padding: '24px',
                display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                  Welcome to stow
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  Pick a source folder below, then set rules for how files should be sorted.
                  stow will preview every move before touching anything.
                </span>
                <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {['1. Pick your source folder', '2. Choose a preset or add rules', '3. Set your destination folder', '4. Preview — then apply'].map((step, i) => (
                    <span key={i} style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>{step}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Source folder */}
            <div style={card}>
              <span style={sectionLabel}>Source</span>
              <FolderInput
                value={sourcePath}
                onChange={setSourcePath}
                onFilesDropped={handleFilesDropped}
                droppedFiles={droppedFiles}
                onClearDropped={handleClearDropped}
              />
            </div>

            {/* Suggestions bar */}
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
            <div style={card}>
              <span style={sectionLabel}>Rules</span>
              <RulesEditor
                rules={rules}
                loading={rulesLoading}
                onAdd={addRule}
                onUpdate={updateRule}
                onDelete={removeRule}
                onReorder={reorderRules}
                onToggle={toggleRule}
              />
            </div>

            {/* Destination */}
            <div style={card}>
              <span style={sectionLabel}>Destination</span>
              <DestinationInput value={destinationPath} onChange={setDestinationPath} />
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '8px' }}>
              {canSmartSort && (
                <button
                  onClick={handleSmartSort}
                  disabled={smartSorting || organizeLoading}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px',
                    fontSize: '13px', fontWeight: 500, borderRadius: '6px',
                    background: 'var(--accent)', color: 'white', border: 'none',
                    cursor: smartSorting ? 'wait' : 'pointer',
                    opacity: smartSorting ? 0.7 : 1 }}
                  onMouseEnter={e => { if (!smartSorting) e.currentTarget.style.background = 'var(--accent-hover)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)'; }}
                >
                  <Zap size={14} />
                  {smartSorting ? 'Analysing…' : 'Smart Sort'}
                </button>
              )}

              <button
                onClick={handlePreview}
                disabled={!canPreview || organizeLoading || uploading}
                style={{ padding: '7px 14px', fontSize: '13px', fontWeight: 500, borderRadius: '6px',
                  background: canPreview ? 'var(--accent)' : 'var(--bg-input)',
                  color: canPreview ? 'white' : 'var(--text-muted)',
                  border: canPreview ? 'none' : '1px solid var(--border)',
                  cursor: !canPreview ? 'not-allowed' : 'pointer',
                  opacity: (!canPreview || organizeLoading || uploading) ? 0.5 : 1 }}
                onMouseEnter={e => { if (canPreview) e.currentTarget.style.background = 'var(--accent-hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = canPreview ? 'var(--accent)' : 'var(--bg-input)'; }}
              >
                {uploading ? 'Uploading…' : 'Preview'}
              </button>

              {!canPreview && !canSmartSort && (
                <span style={{ fontSize: '12px', color: 'var(--text-subtle)', alignSelf: 'center', marginLeft: '4px' }}>
                  {!sourcePath && !uploadedFileData && 'Select a source. '}
                  {sourcePath && rules.length === 0 && 'Add rules or use Smart Sort. '}
                  {sourcePath && rules.length > 0 && !destinationPath && 'Set a destination.'}
                </span>
              )}
            </div>

          </div>
        </div>

        {/* Preview column */}
        <div style={{ width: '320px', flexShrink: 0, borderLeft: '1px solid var(--border)',
          overflowY: 'auto', background: 'var(--bg-card)' }}>
          <div style={{ padding: '16px' }}>
            <span style={{ ...sectionLabel }}>Preview</span>
            <PreviewPanel
              previewResult={previewResult}
              applyResult={applyResult}
              loading={organizeLoading || uploading}
              error={error}
              destinationBase={destinationPath}
              onApply={handleApply}
              onReset={() => { reset(); handleClearDropped(); setSuggestions(null); }}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
