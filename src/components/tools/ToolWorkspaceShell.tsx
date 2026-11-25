import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { Upload, ShieldCheck, Sliders, AlertCircle } from 'lucide-react';
import type { ToolConfig } from '@/config/registry';

interface ToolWorkspaceShellProps {
  tool: ToolConfig;
}

export default function ToolWorkspaceShell({ tool }: ToolWorkspaceShellProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [width, setWidth] = useState<string>(tool.defaults.width ? String(tool.defaults.width) : '');
  const [height, setHeight] = useState<string>(
    tool.defaults.height ? String(tool.defaults.height) : ''
  );
  const [maxKb, setMaxKb] = useState<string>(
    tool.defaults.maxBytes ? String(Math.round(tool.defaults.maxBytes / 1000)) : ''
  );
  const [format, setFormat] = useState<string>(tool.defaults.format ?? 'image/jpeg');
  const [quality, setQuality] = useState<number>(Math.round((tool.defaults.quality ?? 0.85) * 100));
  const [statusMessage, setStatusMessage] = useState<string>('');

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    setSelectedFile(file);
    setStatusMessage(
      `Selected ${file.name} (${file.size.toLocaleString()} bytes). Local processing engine activates in Phase 2.`
    );
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0]);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files?.[0]);
  };

  return (
    <section aria-label={`${tool.shortLabel} workspace`} className="card" style={{ marginTop: '16px' }}>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        style={{
          border: '2px dashed var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '24px 16px',
          textAlign: 'center',
          backgroundColor: 'var(--color-surface)',
        }}
      >
        <Upload size={28} aria-hidden="true" style={{ marginInline: 'auto', color: 'var(--color-primary)' }} />
        <p style={{ margin: '8px 0 12px', fontWeight: 600 }}>
          Drop an image here, or choose a file from your device
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={tool.acceptedFormats.join(',')}
          onChange={onFileChange}
          className="sr-only"
          id={`file-input-${tool.id}`}
        />
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => inputRef.current?.click()}
        >
          Choose image
        </button>
        <p style={{ margin: '10px 0 0', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
          Supported: {tool.acceptedFormats.map((m) => m.replace('image/', '').toUpperCase()).join(', ')}
        </p>
      </div>

      {selectedFile && (
        <div
          style={{
            marginTop: '16px',
            padding: '12px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--color-primary-soft)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.875rem',
          }}
        >
          <AlertCircle size={18} aria-hidden="true" />
          <span>{statusMessage}</span>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginTop: '20px',
        }}
      >
        {(tool.engine === 'resize' || tool.engine === 'fix') && (
          <>
            <div>
              <label htmlFor="ctrl-width" style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem' }}>
                Width (px)
              </label>
              <input
                id="ctrl-width"
                type="number"
                min={1}
                max={8192}
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                placeholder="Auto"
                style={{
                  width: '100%',
                  minHeight: '44px',
                  marginTop: '4px',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg)',
                }}
              />
            </div>
            <div>
              <label htmlFor="ctrl-height" style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem' }}>
                Height (px)
              </label>
              <input
                id="ctrl-height"
                type="number"
                min={1}
                max={8192}
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="Auto"
                style={{
                  width: '100%',
                  minHeight: '44px',
                  marginTop: '4px',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg)',
                }}
              />
            </div>
          </>
        )}

        {(tool.engine === 'compress' || tool.engine === 'fix') && (
          <div>
            <label htmlFor="ctrl-max-kb" style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem' }}>
              Target max size (KB, 1 KB = 1,000 B)
            </label>
            <input
              id="ctrl-max-kb"
              type="number"
              min={1}
              max={20000}
              value={maxKb}
              onChange={(e) => setMaxKb(e.target.value)}
              placeholder="Optional"
              style={{
                width: '100%',
                minHeight: '44px',
                marginTop: '4px',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg)',
              }}
            />
          </div>
        )}

        {tool.engine !== 'inspect' && tool.engine !== 'metadata' && (
          <div>
            <label htmlFor="ctrl-format" style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem' }}>
              Output format
            </label>
            <select
              id="ctrl-format"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              style={{
                width: '100%',
                minHeight: '44px',
                marginTop: '4px',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg)',
              }}
            >
              <option value="image/jpeg">JPEG (.jpg)</option>
              <option value="image/png">PNG (.png)</option>
              <option value="image/webp">WebP (.webp)</option>
            </select>
          </div>
        )}

        {(tool.engine === 'compress' || tool.engine === 'convert' || tool.engine === 'fix') &&
          format !== 'image/png' && (
            <div>
              <label htmlFor="ctrl-quality" style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem' }}>
                Quality ({quality}%)
              </label>
              <input
                id="ctrl-quality"
                type="range"
                min={10}
                max={100}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                style={{ width: '100%', minHeight: '44px', marginTop: '4px' }}
              />
            </div>
          )}
      </div>

      <div
        style={{
          marginTop: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          paddingTop: '16px',
          borderTop: '1px solid var(--color-border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
          <ShieldCheck size={18} aria-hidden="true" style={{ color: 'var(--color-success)' }} />
          <span>Runs locally in your browser. Files are never uploaded.</span>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          disabled={!selectedFile}
          onClick={() =>
            setStatusMessage(
              'Workspace shell ready. Real Web Worker processing engines will be connected in Phase 2.'
            )
          }
        >
          <Sliders size={18} aria-hidden="true" />
          Process image
        </button>
      </div>

      <div aria-live="polite" className="sr-only">
        {statusMessage}
      </div>
    </section>
  );
}
