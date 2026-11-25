import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
} from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  RotateCcw,
  ShieldCheck,
  Sliders,
  Upload,
  XCircle,
} from 'lucide-react';
import type { ToolConfig } from '@/config/registry';
import type {
  CropRect,
  FitMode,
  ImageInspection,
  JobResult,
  JobStage,
  SupportedOutputMime,
} from '@/engines/contracts';
import { inspectImageBlob } from '@/engines/inspect';
import { resolveTargetDimensions } from '@/engines/geometry';
import { ImageJobManager, detectDeviceBudget } from '@/lib/job-manager';
import { buildOutputFilename, triggerBlobDownload } from '@/lib/downloads';
import { recordRecentTool } from '@/lib/storage';

interface ToolWorkspaceShellProps {
  tool: ToolConfig;
}

function formatBytes(bytes: number): string {
  if (bytes < 1000) return `${bytes} B`;
  if (bytes < 1_000_000) return `${(bytes / 1000).toFixed(1)} KB (${bytes.toLocaleString()} B)`;
  return `${(bytes / 1_000_000).toFixed(2)} MB (${bytes.toLocaleString()} B)`;
}

export default function ToolWorkspaceShell({ tool }: ToolWorkspaceShellProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const managerRef = useRef<ImageJobManager | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [inspection, setInspection] = useState<ImageInspection | null>(null);
  const [inputPreviewUrl, setInputPreviewUrl] = useState<string | null>(null);
  const [outputPreviewUrl, setOutputPreviewUrl] = useState<string | null>(null);

  const [width, setWidth] = useState<string>(tool.defaults.width ? String(tool.defaults.width) : '');
  const [height, setHeight] = useState<string>(
    tool.defaults.height ? String(tool.defaults.height) : ''
  );
  const [aspectLock, setAspectLock] = useState<boolean>(tool.defaults.aspectLock ?? true);
  const [fit, setFit] = useState<FitMode>(tool.defaults.fit ?? 'contain');
  const [maxKb, setMaxKb] = useState<string>(
    tool.defaults.maxBytes ? String(Math.round(tool.defaults.maxBytes / 1000)) : ''
  );
  const [allowDownscale, setAllowDownscale] = useState<boolean>(false);
  const [format, setFormat] = useState<SupportedOutputMime>(
    tool.defaults.format ?? 'image/jpeg'
  );
  const [quality, setQuality] = useState<number>(Math.round((tool.defaults.quality ?? 0.85) * 100));
  const [qualityFloor, setQualityFloor] = useState<number>(20);
  const [matteColor, setMatteColor] = useState<string>(tool.defaults.matteColor ?? '#ffffff');

  // Numeric crop controls for crop-image & general precision
  const [cropX, setCropX] = useState<string>('0');
  const [cropY, setCropY] = useState<string>('0');
  const [cropW, setCropW] = useState<string>('');
  const [cropH, setCropH] = useState<string>('');

  const [stage, setStage] = useState<JobStage>('idle');
  const [result, setResult] = useState<JobResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    managerRef.current = new ImageJobManager();
    recordRecentTool(tool.id);
    return () => {
      managerRef.current?.cancelActive();
      managerRef.current?.disposeWorker();
    };
  }, [tool.id]);

  useEffect(() => {
    return () => {
      if (inputPreviewUrl) URL.revokeObjectURL(inputPreviewUrl);
    };
  }, [inputPreviewUrl]);

  useEffect(() => {
    return () => {
      if (outputPreviewUrl) URL.revokeObjectURL(outputPreviewUrl);
    };
  }, [outputPreviewUrl]);

  const isBusy =
    stage === 'validating' ||
    stage === 'decoding' ||
    stage === 'processing' ||
    stage === 'verifying';

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    managerRef.current?.cancelActive();
    setResult(null);
    setErrorMsg('');
    setOutputPreviewUrl(null);
    setStage('validating');

    try {
      const budget = detectDeviceBudget();
      const info = await inspectImageBlob(file, file.name, budget);
      setSelectedFile(file);
      setInspection(info);

      if (tool.id === 'crop-image' && info.width && info.height) {
        setCropX('0');
        setCropY('0');
        setCropW(String(info.width));
        setCropH(String(info.height));
      }

      if (!tool.defaults.format && (info.detectedMime === 'image/jpeg' || info.detectedMime === 'image/png' || info.detectedMime === 'image/webp')) {
        setFormat(info.detectedMime);
      }

      setInputPreviewUrl(URL.createObjectURL(file));
      setStage('ready');

      // Auto-run read-only inspect tool
      if (tool.engine === 'inspect') {
        const inspectResult = await managerRef.current?.run(
          {
            jobId: `${tool.id}-${Date.now()}`,
            input: file,
            inputName: file.name,
            operation: 'inspect',
            constraints: { format: 'image/jpeg', fit: 'contain' },
          },
          setStage
        );
        if (inspectResult) {
          setResult(inspectResult);
          setStage(inspectResult.stage);
        }
      }
    } catch (err) {
      setSelectedFile(null);
      setInspection(null);
      setInputPreviewUrl(null);
      setStage('failed');
      setErrorMsg(err instanceof Error ? err.message : 'Unable to inspect selected file.');
    }
  };

  const onWidthChange = (val: string) => {
    setWidth(val);
    const numW = Number(val);
    if (aspectLock && inspection?.width && inspection?.height && numW > 0) {
      const resolved = resolveTargetDimensions(
        inspection.width,
        inspection.height,
        numW,
        undefined,
        true
      );
      setHeight(String(resolved.height));
    }
  };

  const onHeightChange = (val: string) => {
    setHeight(val);
    const numH = Number(val);
    if (aspectLock && inspection?.width && inspection?.height && numH > 0) {
      const resolved = resolveTargetDimensions(
        inspection.width,
        inspection.height,
        undefined,
        numH,
        true
      );
      setWidth(String(resolved.width));
    }
  };

  const applyCropRatio = (ratioW: number, ratioH: number) => {
    if (!inspection?.width || !inspection?.height) return;
    const srcW = inspection.width;
    const srcH = inspection.height;
    const targetRatio = ratioW / ratioH;
    let w = srcW;
    let h = Math.round(srcW / targetRatio);
    if (h > srcH) {
      h = srcH;
      w = Math.round(srcH * targetRatio);
    }
    setCropX(String(Math.round((srcW - w) / 2)));
    setCropY(String(Math.round((srcH - h) / 2)));
    setCropW(String(w));
    setCropH(String(h));
  };

  const handleProcess = async () => {
    if (!selectedFile || !managerRef.current) return;
    setErrorMsg('');
    setResult(null);
    setOutputPreviewUrl(null);

    const parsedW = width.trim() ? Number(width) : undefined;
    const parsedH = height.trim() ? Number(height) : undefined;
    const parsedMaxBytes = maxKb.trim() ? Math.round(Number(maxKb) * 1000) : undefined;

    let cropRect: CropRect | undefined;
    if (tool.id === 'crop-image' && cropW.trim() && cropH.trim()) {
      cropRect = {
        x: Math.max(0, Number(cropX) || 0),
        y: Math.max(0, Number(cropY) || 0),
        width: Math.max(1, Number(cropW)),
        height: Math.max(1, Number(cropH)),
      };
    }

    const jobResult = await managerRef.current.run(
      {
        jobId: `${tool.id}-${Date.now()}`,
        input: selectedFile,
        inputName: selectedFile.name,
        operation: tool.engine,
        constraints: {
          ...(parsedW ? { width: parsedW } : {}),
          ...(parsedH ? { height: parsedH } : {}),
          ...(parsedMaxBytes ? { maxBytes: parsedMaxBytes } : {}),
          format,
          fit,
          quality: quality / 100,
          qualityFloor: qualityFloor / 100,
          allowDownscale,
          matteColor,
          ...(cropRect ? { crop: cropRect } : {}),
          stripMetadata: tool.engine === 'metadata',
        },
      },
      setStage
    );

    setResult(jobResult);
    setStage(jobResult.stage);

    if (jobResult.output) {
      setOutputPreviewUrl(URL.createObjectURL(jobResult.output));
    }
    if (jobResult.stage === 'failed' && jobResult.message) {
      setErrorMsg(jobResult.message);
    }
  };

  const handleCancel = () => {
    managerRef.current?.cancelActive();
    setStage('cancelled');
  };

  const handleReset = () => {
    managerRef.current?.cancelActive();
    setSelectedFile(null);
    setInspection(null);
    setInputPreviewUrl(null);
    setOutputPreviewUrl(null);
    setResult(null);
    setErrorMsg('');
    setStage('idle');
    if (inputRef.current) inputRef.current.value = '';
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    void handleFile(e.target.files?.[0]);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    void handleFile(e.dataTransfer.files?.[0]);
  };

  const onPaste = (e: ClipboardEvent<HTMLDivElement>) => {
    const file = e.clipboardData.files?.[0];
    if (file) {
      void handleFile(file);
    }
  };

  const savingsPct = useMemo(() => {
    if (!inspection || !result?.actual) return null;
    if (inspection.bytes === 0) return null;
    return Math.round(((inspection.bytes - result.actual.bytes) / inspection.bytes) * 100);
  }, [inspection, result]);

  return (
    <section
      aria-label={`${tool.shortLabel} workspace`}
      className="card"
      style={{ marginTop: '16px' }}
      onPaste={onPaste}
    >
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
          Drop or paste an image here, or choose a file from your device
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={tool.acceptedFormats.join(',')}
          onChange={onFileChange}
          aria-label="Choose image file"
          className="sr-only"
          id={`file-input-${tool.id}`}
        />
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => inputRef.current?.click()}
          >
            Choose image
          </button>
          {selectedFile && (
            <button type="button" className="btn btn-secondary" onClick={handleReset}>
              <RotateCcw size={16} aria-hidden="true" />
              Reset
            </button>
          )}
        </div>
        <p style={{ margin: '10px 0 0', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
          Supported: {tool.acceptedFormats.map((m) => m.replace('image/', '').toUpperCase()).join(', ')}
          {' · '}Desktop limit: 20 MB / 24 MP
        </p>
      </div>

      {errorMsg && (
        <div
          role="alert"
          style={{
            marginTop: '16px',
            padding: '12px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--color-error-soft)',
            color: 'var(--color-error)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            fontSize: '0.9375rem',
          }}
        >
          <XCircle size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>{errorMsg}</strong>
            {result?.suggestions && result.suggestions.length > 0 && (
              <ul style={{ margin: '6px 0 0', paddingLeft: '18px' }}>
                {result.suggestions.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {inspection && (
        <div
          style={{
            marginTop: '16px',
            padding: '12px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            fontSize: '0.875rem',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <span>
            <strong>Format:</strong> {inspection.detectedMime.replace('image/', '').toUpperCase()}
          </span>
          <span>
            <strong>Size:</strong> {formatBytes(inspection.bytes)}
          </span>
          {inspection.width && inspection.height && (
            <span>
              <strong>Dimensions:</strong> {inspection.width}×{inspection.height} px
            </span>
          )}
          <span>
            <strong>Metadata:</strong>{' '}
            {inspection.hasGps ? 'GPS + EXIF present' : inspection.hasExif ? 'EXIF present' : 'None detected'}
          </span>
          {inspection.dpi && (
            <span>
              <strong>DPI:</strong> {inspection.dpi.x}×{inspection.dpi.y} ({inspection.dpi.unit})
            </span>
          )}
        </div>
      )}

      {tool.engine !== 'inspect' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginTop: '20px',
          }}
        >
          {(tool.engine === 'resize' || tool.engine === 'fix') && tool.id !== 'crop-image' && (
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
                  onChange={(e) => onWidthChange(e.target.value)}
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
                  onChange={(e) => onHeightChange(e.target.value)}
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
                <label htmlFor="ctrl-fit" style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem' }}>
                  Fit mode
                </label>
                <select
                  id="ctrl-fit"
                  value={fit}
                  onChange={(e) => setFit(e.target.value as FitMode)}
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
                  <option value="cover">Cover (crop to fill)</option>
                  <option value="contain">Contain (pad to fit)</option>
                  <option value="stretch">Stretch (distort)</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', paddingTop: '24px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={aspectLock}
                    onChange={(e) => setAspectLock(e.target.checked)}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span>Lock aspect ratio</span>
                </label>
              </div>
            </>
          )}

          {tool.id === 'crop-image' && (
            <>
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600, fontSize: '0.875rem', alignSelf: 'center' }}>
                  Aspect presets:
                </span>
                <button type="button" className="btn btn-secondary" onClick={() => applyCropRatio(1, 1)}>
                  1:1 Square
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => applyCropRatio(4, 3)}>
                  4:3
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => applyCropRatio(16, 9)}>
                  16:9
                </button>
              </div>
              <div>
                <label htmlFor="crop-x" style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem' }}>
                  Crop X (px)
                </label>
                <input
                  id="crop-x"
                  type="number"
                  min={0}
                  value={cropX}
                  onChange={(e) => setCropX(e.target.value)}
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
                <label htmlFor="crop-y" style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem' }}>
                  Crop Y (px)
                </label>
                <input
                  id="crop-y"
                  type="number"
                  min={0}
                  value={cropY}
                  onChange={(e) => setCropY(e.target.value)}
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
                <label htmlFor="crop-w" style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem' }}>
                  Crop Width (px)
                </label>
                <input
                  id="crop-w"
                  type="number"
                  min={1}
                  value={cropW}
                  onChange={(e) => setCropW(e.target.value)}
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
                <label htmlFor="crop-h" style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem' }}>
                  Crop Height (px)
                </label>
                <input
                  id="crop-h"
                  type="number"
                  min={1}
                  value={cropH}
                  onChange={(e) => setCropH(e.target.value)}
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
            <>
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
              {tool.engine === 'fix' && (
                <div>
                  <label htmlFor="ctrl-qfloor" style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem' }}>
                    Quality floor ({qualityFloor}%)
                  </label>
                  <input
                    id="ctrl-qfloor"
                    type="range"
                    min={10}
                    max={80}
                    value={qualityFloor}
                    onChange={(e) => setQualityFloor(Number(e.target.value))}
                    style={{ width: '100%', minHeight: '44px', marginTop: '4px' }}
                  />
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', paddingTop: '24px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={allowDownscale}
                    onChange={(e) => setAllowDownscale(e.target.checked)}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span>Allow downscale if needed</span>
                </label>
              </div>
            </>
          )}

          {tool.engine !== 'metadata' && (
            <div>
              <label htmlFor="ctrl-format" style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem' }}>
                Output format
              </label>
              <select
                id="ctrl-format"
                value={format}
                onChange={(e) => setFormat(e.target.value as SupportedOutputMime)}
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

          {tool.engine !== 'metadata' && format !== 'image/png' && (
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

          {tool.engine !== 'metadata' && format === 'image/jpeg' && (
            <div>
              <label htmlFor="ctrl-matte" style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem' }}>
                Background matte (for transparency)
              </label>
              <input
                id="ctrl-matte"
                type="color"
                value={matteColor}
                onChange={(e) => setMatteColor(e.target.value)}
                style={{
                  width: '64px',
                  height: '44px',
                  marginTop: '4px',
                  padding: '2px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--color-bg)',
                }}
              />
            </div>
          )}
        </div>
      )}

      {tool.engine !== 'inspect' && (
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
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.875rem',
              color: 'var(--color-text-secondary)',
            }}
          >
            <ShieldCheck size={18} aria-hidden="true" style={{ color: 'var(--color-success)' }} />
            <span>
              {isBusy ? `Stage: ${stage}...` : 'Runs locally in your browser. Files are never uploaded.'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {isBusy ? (
              <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                Cancel
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                disabled={!selectedFile}
                onClick={() => void handleProcess()}
              >
                <Sliders size={18} aria-hidden="true" />
                {tool.engine === 'metadata' ? 'Remove metadata' : 'Process image'}
              </button>
            )}
          </div>
        </div>
      )}

      {(inputPreviewUrl || outputPreviewUrl) && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            marginTop: '20px',
          }}
        >
          {inputPreviewUrl && (
            <figure style={{ margin: 0 }}>
              <figcaption style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                Original
              </figcaption>
              <img
                src={inputPreviewUrl}
                alt="Original input preview"
                style={{
                  maxHeight: '240px',
                  width: '100%',
                  objectFit: 'contain',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-surface)',
                }}
              />
            </figure>
          )}
          {outputPreviewUrl && (
            <figure style={{ margin: 0 }}>
              <figcaption style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                Result {savingsPct !== null ? `(${savingsPct >= 0 ? `-${savingsPct}%` : `+${Math.abs(savingsPct)}%`})` : ''}
              </figcaption>
              <img
                src={outputPreviewUrl}
                alt="Processed output preview"
                style={{
                  maxHeight: '240px',
                  width: '100%',
                  objectFit: 'contain',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-surface)',
                }}
              />
            </figure>
          )}
        </div>
      )}

      {result && result.checks.length > 0 && (
        <div
          style={{
            marginTop: '20px',
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            border: `1px solid ${result.stage === 'success' ? 'var(--color-success)' : 'var(--color-warning)'}`,
            backgroundColor:
              result.stage === 'success' ? 'var(--color-success-soft)' : 'var(--color-warning-soft)',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              marginBottom: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
              {result.stage === 'success' ? (
                <CheckCircle2 size={20} aria-hidden="true" style={{ color: 'var(--color-success)' }} />
              ) : (
                <AlertCircle size={20} aria-hidden="true" style={{ color: 'var(--color-warning)' }} />
              )}
              <span>
                {result.stage === 'success'
                  ? 'All selected technical checks passed'
                  : 'Best-effort output generated (some constraints unmet)'}
              </span>
            </div>

            {result.output && selectedFile && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() =>
                  triggerBlobDownload(
                    result.output!,
                    buildOutputFilename(selectedFile.name, result.actual?.mime ?? format)
                  )
                }
              >
                <Download size={18} aria-hidden="true" />
                Download ({formatBytes(result.output.size)})
              </button>
            )}
          </div>

          {result.suggestions && result.suggestions.length > 0 && (
            <ul style={{ margin: '0 0 12px', paddingLeft: '18px', fontSize: '0.875rem' }}>
              {result.suggestions.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          )}

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--color-border)' }}>
                    Check
                  </th>
                  <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--color-border)' }}>
                    Input
                  </th>
                  <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--color-border)' }}>
                    Required
                  </th>
                  <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--color-border)' }}>
                    Result
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.checks.map((chk) => (
                  <tr key={chk.key}>
                    <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--color-border)', fontWeight: 600 }}>
                      {chk.label}
                    </td>
                    <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--color-border)' }}>
                      {chk.input}
                    </td>
                    <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--color-border)' }}>
                      {chk.required}
                    </td>
                    <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--color-border)' }}>
                      {chk.actual}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div aria-live="polite" className="sr-only">
        {stage === 'success'
          ? 'Image processing complete. Output verified and ready to download.'
          : errorMsg || ''}
      </div>
    </section>
  );
}
