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
  Crop,
  Download,
  FileImage,
  Loader2,
  Maximize2,
  Minimize2,
  RotateCcw,
  ShieldCheck,
  ShieldOff,
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

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export default function ToolWorkspaceShell({ tool }: ToolWorkspaceShellProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const managerRef = useRef<ImageJobManager | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [inspection, setInspection] = useState<ImageInspection | null>(null);
  const [inputPreviewUrl, setInputPreviewUrl] = useState<string | null>(null);
  const [outputPreviewUrl, setOutputPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

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
    const pendingFile = inputRef.current?.files?.[0];
    if (pendingFile) {
      void handleFile(pendingFile);
    }
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
      managerRef.current?.warmup();
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

      if (
        tool.engine === 'resize' &&
        tool.id !== 'crop-image' &&
        !tool.defaults.width &&
        !tool.defaults.height &&
        info.width &&
        info.height
      ) {
        setWidth(String(info.width));
        setHeight(String(info.height));
      }

      if (
        !tool.defaults.format &&
        (info.detectedMime === 'image/jpeg' ||
          info.detectedMime === 'image/png' ||
          info.detectedMime === 'image/webp')
      ) {
        setFormat(info.detectedMime);
      }

      setInputPreviewUrl(URL.createObjectURL(file));
      setStage('ready');

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

  const applyScalePreset = (scale: number) => {
    if (!inspection?.width || !inspection?.height) return;
    setWidth(String(Math.max(1, Math.round(inspection.width * scale))));
    setHeight(String(Math.max(1, Math.round(inspection.height * scale))));
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
      const x = Math.max(0, Number(cropX) || 0);
      const y = Math.max(0, Number(cropY) || 0);
      const maxW = inspection?.width ? Math.max(1, inspection.width - x) : Number(cropW);
      const maxH = inspection?.height ? Math.max(1, inspection.height - y) : Number(cropH);
      cropRect = {
        x,
        y,
        width: Math.max(1, Math.min(maxW, Number(cropW))),
        height: Math.max(1, Math.min(maxH, Number(cropH))),
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
          aspectLock,
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
    setIsDragging(false);
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

  const aspectRatioLabel = useMemo(() => {
    if (!inspection?.width || !inspection?.height) return 'Unknown';
    const d = gcd(inspection.width, inspection.height);
    return `${inspection.width / d}:${inspection.height / d}`;
  }, [inspection]);

  const stageLabel: Partial<Record<JobStage, string>> = {
    idle: 'Ready',
    validating: 'Validating file…',
    decoding: 'Decoding image…',
    ready: 'File ready',
    processing: 'Processing locally in Web Worker…',
    verifying: 'Verifying output…',
    success: 'Complete',
    failed: 'Processing failed',
    cancelled: 'Cancelled',
  };

  const showDimensionsPanel = (tool.engine === 'resize' || tool.engine === 'fix') && tool.id !== 'crop-image';
  const showCropPanel = tool.id === 'crop-image';
  const showCompressionPanel = tool.engine === 'compress' || tool.engine === 'fix';
  const showFormatPanel = tool.engine !== 'inspect' && tool.engine !== 'metadata';

  return (
    <section
      aria-label={`${tool.shortLabel} workspace`}
      className="mt-5 rounded-xl border border-border bg-card p-4 shadow-xs sm:p-6"
      onPaste={onPaste}
    >
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`rounded-lg border-2 border-dashed px-4 py-7 text-center transition-colors ${
          isDragging
            ? 'border-foreground bg-accent/60'
            : 'border-border bg-muted/30 hover:border-foreground/30'
        }`}
      >
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background text-foreground shadow-xs">
          <Upload size={18} aria-hidden="true" />
        </div>
        <p className="m-0 mb-3 text-sm font-medium text-foreground">
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
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => inputRef.current?.click()}
          >
            <Upload size={15} aria-hidden="true" />
            Choose image
          </button>
          {selectedFile && (
            <button type="button" className="btn btn-secondary" onClick={handleReset}>
              <RotateCcw size={15} aria-hidden="true" />
              Reset
            </button>
          )}
        </div>
        <p className="mb-0 mt-3 text-xs text-muted-foreground">
          Supported: {tool.acceptedFormats.map((m) => m.replace('image/', '').toUpperCase()).join(', ')}
          {' · '}Desktop limit: 20 MB / 24 MP
        </p>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 p-3.5 text-sm text-destructive"
        >
          <XCircle size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
          <div>
            <strong className="font-semibold">{errorMsg}</strong>
            {result?.suggestions && result.suggestions.length > 0 && (
              <ul className="mb-0 mt-1.5 list-disc pl-4 text-xs">
                {result.suggestions.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {inspection && (
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs sm:text-sm">
          <span>
            <strong className="font-medium text-muted-foreground">Format:</strong>{' '}
            <span className="font-mono font-medium text-foreground">
              {inspection.detectedMime.replace('image/', '').toUpperCase()}
            </span>
          </span>
          <span>
            <strong className="font-medium text-muted-foreground">Size:</strong>{' '}
            <span className="font-mono font-medium tabular-nums text-foreground">
              {formatBytes(inspection.bytes)}
            </span>
          </span>
          {inspection.width && inspection.height && (
            <span>
              <strong className="font-medium text-muted-foreground">Dimensions:</strong>{' '}
              <span className="font-mono font-medium tabular-nums text-foreground">
                {inspection.width}×{inspection.height} px
              </span>
            </span>
          )}
          <span>
            <strong className="font-medium text-muted-foreground">Metadata:</strong>{' '}
            <span className="font-medium text-foreground">
              {inspection.hasGps ? 'GPS + EXIF present' : inspection.hasExif ? 'EXIF present' : 'None detected'}
            </span>
          </span>
          {inspection.dpi && (
            <span>
              <strong className="font-medium text-muted-foreground">DPI:</strong>{' '}
              <span className="font-mono font-medium tabular-nums text-foreground">
                {inspection.dpi.x}×{inspection.dpi.y} ({inspection.dpi.unit})
              </span>
            </span>
          )}
        </div>
      )}

      {tool.engine === 'inspect' && inspection && (
        <div className="ws-panel mt-4">
          <h3 className="ws-panel-title">
            <FileImage size={16} aria-hidden="true" className="text-muted-foreground" />
            Detailed Image Report
          </h3>
          <dl className="m-0 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-md border border-border bg-background p-3">
              <dt className="text-xs text-muted-foreground">Detected MIME</dt>
              <dd className="m-0 mt-1 font-mono text-sm font-semibold text-foreground">
                {inspection.detectedMime}
              </dd>
            </div>
            <div className="rounded-md border border-border bg-background p-3">
              <dt className="text-xs text-muted-foreground">File extension</dt>
              <dd className="m-0 mt-1 font-mono text-sm font-semibold text-foreground">
                {inspection.extension ? `.${inspection.extension}` : 'None'}
              </dd>
            </div>
            <div className="rounded-md border border-border bg-background p-3">
              <dt className="text-xs text-muted-foreground">Exact bytes / KiB</dt>
              <dd className="m-0 mt-1 font-mono text-sm font-semibold tabular-nums text-foreground">
                {inspection.bytes.toLocaleString()} B ({(inspection.bytes / 1024).toFixed(1)} KiB)
              </dd>
            </div>
            <div className="rounded-md border border-border bg-background p-3">
              <dt className="text-xs text-muted-foreground">Megapixels / Ratio</dt>
              <dd className="m-0 mt-1 font-mono text-sm font-semibold tabular-nums text-foreground">
                {inspection.width && inspection.height
                  ? `${((inspection.width * inspection.height) / 1_000_000).toFixed(2)} MP (${aspectRatioLabel})`
                  : 'Unknown'}
              </dd>
            </div>
          </dl>
        </div>
      )}

      {tool.engine === 'metadata' && (
        <div className="ws-panel mt-4">
          <h3 className="ws-panel-title">
            <ShieldOff size={16} aria-hidden="true" className="text-muted-foreground" />
            Metadata &amp; GPS Stripping
          </h3>
          <p className="m-0 text-sm text-muted-foreground">
            Re-encodes the image pixels locally in your browser to strip targeted EXIF camera tags
            and GPS coordinates, then verifies the output file.
          </p>
        </div>
      )}

      {tool.engine !== 'inspect' && tool.engine !== 'metadata' && (
        <div className="ws-section-grid">
          {showDimensionsPanel && (
            <div className="ws-panel">
              <h3 className="ws-panel-title">
                <Maximize2 size={16} aria-hidden="true" className="text-muted-foreground" />
                Dimensions &amp; Fit
              </h3>
              {tool.id === 'resize-image' && inspection?.width && inspection?.height && (
                <div className="ws-presets">
                  <button
                    type="button"
                    className="btn btn-secondary ws-preset-btn"
                    onClick={() => applyScalePreset(0.5)}
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary ws-preset-btn"
                    onClick={() => applyScalePreset(0.75)}
                  >
                    75%
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary ws-preset-btn"
                    onClick={() => {
                      setWidth('600');
                      setHeight('600');
                    }}
                  >
                    600×600
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary ws-preset-btn"
                    onClick={() => {
                      setWidth('1080');
                      setHeight('1080');
                    }}
                  >
                    1080×1080
                  </button>
                </div>
              )}
              {tool.id === 'passport-photo-resizer' && (
                <div className="ws-presets">
                  <button
                    type="button"
                    className="btn btn-secondary ws-preset-btn"
                    onClick={() => {
                      setWidth('600');
                      setHeight('600');
                      setMaxKb('240');
                    }}
                  >
                    2×2 in (600×600)
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary ws-preset-btn"
                    onClick={() => {
                      setWidth('413');
                      setHeight('531');
                      setMaxKb('100');
                    }}
                  >
                    35×45 mm (413×531)
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary ws-preset-btn"
                    onClick={() => {
                      setWidth('200');
                      setHeight('200');
                      setMaxKb('50');
                    }}
                  >
                    200×200 (50 KB)
                  </button>
                </div>
              )}
              {tool.id === 'signature-resizer' && (
                <div className="ws-presets">
                  <button
                    type="button"
                    className="btn btn-secondary ws-preset-btn"
                    onClick={() => {
                      setWidth('200');
                      setHeight('80');
                      setMaxKb('20');
                    }}
                  >
                    200×80 (20 KB)
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary ws-preset-btn"
                    onClick={() => {
                      setWidth('140');
                      setHeight('60');
                      setMaxKb('20');
                    }}
                  >
                    140×60 (20 KB)
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary ws-preset-btn"
                    onClick={() => {
                      setWidth('300');
                      setHeight('100');
                      setMaxKb('50');
                    }}
                  >
                    300×100 (50 KB)
                  </button>
                </div>
              )}
              {tool.id === 'social-media-image-resizer' && (
                <div className="ws-presets">
                  <button
                    type="button"
                    className="btn btn-secondary ws-preset-btn"
                    onClick={() => {
                      setWidth('1080');
                      setHeight('1080');
                    }}
                  >
                    IG Square (1080×1080)
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary ws-preset-btn"
                    onClick={() => {
                      setWidth('1080');
                      setHeight('1350');
                    }}
                  >
                    IG Portrait (1080×1350)
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary ws-preset-btn"
                    onClick={() => {
                      setWidth('1280');
                      setHeight('720');
                    }}
                  >
                    YouTube (1280×720)
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary ws-preset-btn"
                    onClick={() => {
                      setWidth('1584');
                      setHeight('396');
                    }}
                  >
                    LinkedIn (1584×396)
                  </button>
                </div>
              )}
              <div className="ws-row">
                <div className="ws-field">
                  <label htmlFor="ctrl-width" className="ws-label">
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
                    className="ws-input font-mono tabular-nums"
                  />
                </div>
                <div className="ws-field">
                  <label htmlFor="ctrl-height" className="ws-label">
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
                    className="ws-input font-mono tabular-nums"
                  />
                </div>
                <div className="ws-field">
                  <label htmlFor="ctrl-fit" className="ws-label">
                    Fit mode
                  </label>
                  <select
                    id="ctrl-fit"
                    value={fit}
                    onChange={(e) => setFit(e.target.value as FitMode)}
                    className="ws-input"
                  >
                    <option value="cover">Cover (crop)</option>
                    <option value="contain">Contain (pad)</option>
                    <option value="stretch">Stretch</option>
                  </select>
                </div>
              </div>
              <div className="ws-checkbox-row">
                <label className="ws-checkbox">
                  <input
                    type="checkbox"
                    checked={aspectLock}
                    onChange={(e) => setAspectLock(e.target.checked)}
                  />
                  <span>Lock aspect ratio</span>
                </label>
              </div>
            </div>
          )}

          {showCropPanel && (
            <div className="ws-panel">
              <h3 className="ws-panel-title">
                <Crop size={16} aria-hidden="true" className="text-muted-foreground" />
                Crop Bounds
              </h3>
              <div className="ws-presets">
                <button
                  type="button"
                  className="btn btn-secondary ws-preset-btn"
                  onClick={() => applyCropRatio(1, 1)}
                >
                  1:1 Square
                </button>
                <button
                  type="button"
                  className="btn btn-secondary ws-preset-btn"
                  onClick={() => applyCropRatio(4, 3)}
                >
                  4:3
                </button>
                <button
                  type="button"
                  className="btn btn-secondary ws-preset-btn"
                  onClick={() => applyCropRatio(16, 9)}
                >
                  16:9
                </button>
                {inspection?.width && inspection?.height && (
                  <button
                    type="button"
                    className="btn btn-secondary ws-preset-btn"
                    onClick={() => {
                      setCropX('0');
                      setCropY('0');
                      setCropW(String(inspection.width));
                      setCropH(String(inspection.height));
                    }}
                  >
                    Full image
                  </button>
                )}
              </div>
              <div className="ws-row">
                <div className="ws-field">
                  <label htmlFor="crop-x" className="ws-label">
                    X (px)
                  </label>
                  <input
                    id="crop-x"
                    type="number"
                    min={0}
                    value={cropX}
                    onChange={(e) => setCropX(e.target.value)}
                    className="ws-input font-mono tabular-nums"
                  />
                </div>
                <div className="ws-field">
                  <label htmlFor="crop-y" className="ws-label">
                    Y (px)
                  </label>
                  <input
                    id="crop-y"
                    type="number"
                    min={0}
                    value={cropY}
                    onChange={(e) => setCropY(e.target.value)}
                    className="ws-input font-mono tabular-nums"
                  />
                </div>
                <div className="ws-field">
                  <label htmlFor="crop-w" className="ws-label">
                    Width (px)
                  </label>
                  <input
                    id="crop-w"
                    type="number"
                    min={1}
                    value={cropW}
                    onChange={(e) => setCropW(e.target.value)}
                    className="ws-input font-mono tabular-nums"
                  />
                </div>
                <div className="ws-field">
                  <label htmlFor="crop-h" className="ws-label">
                    Height (px)
                  </label>
                  <input
                    id="crop-h"
                    type="number"
                    min={1}
                    value={cropH}
                    onChange={(e) => setCropH(e.target.value)}
                    className="ws-input font-mono tabular-nums"
                  />
                </div>
              </div>
            </div>
          )}

          {showCompressionPanel && (
            <div className="ws-panel">
              <h3 className="ws-panel-title">
                <Minimize2 size={16} aria-hidden="true" className="text-muted-foreground" />
                File Size Target
              </h3>
              {tool.id === 'compress-image-to-kb' && (
                <div className="ws-presets">
                  {[20, 50, 100, 200, 500].map((kb) => (
                    <button
                      key={kb}
                      type="button"
                      className="btn btn-secondary ws-preset-btn"
                      onClick={() => setMaxKb(String(kb))}
                    >
                      {kb} KB
                    </button>
                  ))}
                </div>
              )}
              <div className="ws-row">
                <div className="ws-field">
                  <label htmlFor="ctrl-max-kb" className="ws-label">
                    Max size (KB · 1,000 B)
                  </label>
                  <input
                    id="ctrl-max-kb"
                    type="number"
                    min={1}
                    max={20000}
                    value={maxKb}
                    onChange={(e) => setMaxKb(e.target.value)}
                    placeholder="Optional"
                    className="ws-input font-mono tabular-nums"
                  />
                </div>
                {tool.engine === 'fix' && (
                  <div className="ws-field">
                    <label htmlFor="ctrl-qfloor" className="ws-label">
                      Quality floor ({qualityFloor}%)
                    </label>
                    <input
                      id="ctrl-qfloor"
                      type="range"
                      min={10}
                      max={80}
                      value={qualityFloor}
                      onChange={(e) => setQualityFloor(Number(e.target.value))}
                      className="min-h-[40px] w-full accent-primary"
                    />
                  </div>
                )}
              </div>
              <div className="ws-checkbox-row">
                <label className="ws-checkbox">
                  <input
                    type="checkbox"
                    checked={allowDownscale}
                    onChange={(e) => setAllowDownscale(e.target.checked)}
                  />
                  <span>Allow downscale if needed</span>
                </label>
              </div>
            </div>
          )}

          {showFormatPanel && (
            <div
              className={`ws-panel ${
                showDimensionsPanel && showCompressionPanel ? 'md:col-span-2' : ''
              }`}
            >
              <h3 className="ws-panel-title">
                <FileImage size={16} aria-hidden="true" className="text-muted-foreground" />
                Output Format &amp; Quality
              </h3>
              <div className="ws-row">
                <div className="ws-field">
                  <label htmlFor="ctrl-format" className="ws-label">
                    Format
                  </label>
                  <select
                    id="ctrl-format"
                    value={format}
                    onChange={(e) => setFormat(e.target.value as SupportedOutputMime)}
                    className="ws-input"
                  >
                    <option value="image/jpeg">JPEG (.jpg)</option>
                    <option value="image/png">PNG (.png)</option>
                    <option value="image/webp">WebP (.webp)</option>
                  </select>
                </div>

                {format !== 'image/png' && (
                  <div className="ws-field">
                    <label htmlFor="ctrl-quality" className="ws-label">
                      Quality ({quality}%)
                    </label>
                    <input
                      id="ctrl-quality"
                      type="range"
                      min={10}
                      max={100}
                      value={quality}
                      onChange={(e) => setQuality(Number(e.target.value))}
                      className="min-h-[40px] w-full accent-primary"
                    />
                  </div>
                )}

                {format === 'image/jpeg' && (
                  <div className="ws-field">
                    <label htmlFor="ctrl-matte" className="ws-label">
                      Matte background
                    </label>
                    <div className="flex h-10 items-center gap-2.5 rounded-md border border-input bg-background px-2.5">
                      <input
                        id="ctrl-matte"
                        type="color"
                        value={matteColor}
                        onChange={(e) => setMatteColor(e.target.value)}
                        className="h-6 w-8 cursor-pointer rounded border border-border bg-transparent p-0"
                      />
                      <span className="font-mono text-xs text-muted-foreground">
                        {matteColor.toUpperCase()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {tool.engine !== 'inspect' && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
            {isBusy ? (
              <Loader2 size={16} aria-hidden="true" className="animate-spin text-foreground" />
            ) : (
              <ShieldCheck size={16} aria-hidden="true" className="text-emerald-600 dark:text-emerald-400" />
            )}
            <span>
              {isBusy ? (stageLabel[stage] ?? 'Processing…') : 'Runs locally in your browser. Files are never uploaded.'}
            </span>
          </div>

          <div className="flex gap-2">
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
                <Sliders size={15} aria-hidden="true" />
                {tool.engine === 'metadata' ? 'Remove metadata' : 'Process image'}
              </button>
            )}
          </div>
        </div>
      )}

      {(inputPreviewUrl || outputPreviewUrl) && (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {inputPreviewUrl && (
            <figure className="m-0 rounded-lg border border-border bg-muted/20 p-3">
              <figcaption className="mb-2 text-xs font-medium text-muted-foreground">
                <span className="font-semibold text-foreground">Original</span>{' '}
                {inspection
                  ? `· ${inspection.width ?? '?'}×${inspection.height ?? '?'} · ${formatBytes(inspection.bytes)}`
                  : ''}
              </figcaption>
              <img
                src={inputPreviewUrl}
                alt="Original input preview"
                className="alpha-checkerboard max-h-60 w-full rounded-md border border-border object-contain"
              />
            </figure>
          )}
          {outputPreviewUrl && (
            <figure className="m-0 rounded-lg border border-border bg-muted/20 p-3">
              <figcaption className="mb-2 text-xs font-medium text-muted-foreground">
                <span className="font-semibold text-foreground">Result</span>{' '}
                {result?.actual
                  ? `· ${result.actual.width}×${result.actual.height} · ${formatBytes(result.actual.bytes)}`
                  : ''}
                {savingsPct !== null
                  ? ` (${savingsPct >= 0 ? `-${savingsPct}%` : `+${Math.abs(savingsPct)}%`})`
                  : ''}
              </figcaption>
              <img
                src={outputPreviewUrl}
                alt="Processed output preview"
                className="alpha-checkerboard max-h-60 w-full rounded-md border border-border object-contain"
              />
            </figure>
          )}
        </div>
      )}

      {result && result.checks.length > 0 && (
        <div
          className={`mt-5 rounded-lg border p-4 ${
            result.stage === 'success'
              ? 'border-emerald-500/40 bg-emerald-500/5'
              : 'border-amber-500/40 bg-amber-500/5'
          }`}
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              {result.stage === 'success' ? (
                <CheckCircle2 size={18} aria-hidden="true" className="text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertCircle size={18} aria-hidden="true" className="text-amber-600 dark:text-amber-400" />
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
                <Download size={15} aria-hidden="true" />
                Download ({formatBytes(result.output.size)})
              </button>
            )}
          </div>

          {result.suggestions && result.suggestions.length > 0 && (
            <ul className="mb-3 mt-0 list-disc pl-5 text-xs text-muted-foreground">
              {result.suggestions.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          )}

          <div className="overflow-x-auto rounded-md border border-border bg-card">
            <table className="w-full border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Check</th>
                  <th className="px-3 py-2 font-medium">Input</th>
                  <th className="px-3 py-2 font-medium">Required</th>
                  <th className="px-3 py-2 font-medium">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono tabular-nums">
                {result.checks.map((chk) => (
                  <tr key={chk.key}>
                    <td className="px-3 py-2 font-sans font-medium text-foreground">{chk.label}</td>
                    <td className="px-3 py-2 text-muted-foreground">{chk.input}</td>
                    <td className="px-3 py-2 text-muted-foreground">{chk.required}</td>
                    <td className="px-3 py-2 font-medium text-foreground">{chk.actual}</td>
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
