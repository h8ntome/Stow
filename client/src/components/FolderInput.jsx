/**
 * FolderInput.jsx
 * Source folder input with folder browser button and drag-drop support.
 */

import { useState, useRef } from 'react';
import { FolderOpen, Upload, X } from 'lucide-react';
import { FolderBrowser } from './FolderBrowser.jsx';

export function FolderInput({ value, onChange, onFilesDropped, droppedFiles, onClearDropped }) {
  const [dragging, setDragging] = useState(false);
  const [browserOpen, setBrowserOpen] = useState(false);
  const inputRef = useRef(null);

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) onFilesDropped(files);
  };

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) onFilesDropped(files);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Path input + browse button */}
      <div style={{ display: 'flex', gap: '6px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <FolderOpen size={13} style={{ position: 'absolute', left: '9px', top: '50%',
            transform: 'translateY(-50%)', color: 'var(--text-subtle)', pointerEvents: 'none' }} />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="/Users/you/Downloads"
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

      {/* Drag-drop zone — only when no files dropped */}
      {!droppedFiles?.length && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: '6px', height: '60px', borderRadius: '6px', border: '1.5px dashed',
            cursor: 'pointer', userSelect: 'none', fontSize: '12px',
            borderColor: dragging ? 'var(--accent)' : 'var(--border)',
            background: dragging ? 'var(--accent-bg)' : 'transparent',
            color: dragging ? 'var(--accent)' : 'var(--text-subtle)',
          }}
        >
          <Upload size={15} />
          <span>Or drop files here to upload &amp; organise</span>
          <input ref={inputRef} type="file" multiple style={{ display: 'none' }} onChange={handleFileInput} />
        </div>
      )}

      {/* Dropped files badge */}
      {droppedFiles?.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px',
          borderRadius: '6px', fontSize: '12px', border: '1px solid var(--border)',
          background: 'var(--accent-bg)', color: 'var(--accent)' }}>
          <Upload size={13} />
          <span>{droppedFiles.length} file{droppedFiles.length !== 1 ? 's' : ''} ready to organise</span>
          <button onClick={onClearDropped}
            style={{ marginLeft: 'auto', padding: '2px', background: 'none', border: 'none',
              cursor: 'pointer', color: 'var(--accent)', display: 'flex', opacity: 0.7 }}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
            onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}>
            <X size={13} />
          </button>
        </div>
      )}

      {/* Folder browser modal */}
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
