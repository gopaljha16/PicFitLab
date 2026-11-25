import {
  DESKTOP_BUDGET,
  MOBILE_BUDGET,
  type JobRequest,
  type JobResult,
  type JobStage,
} from '@/engines/contracts';
import { runImageJob } from '@/engines/processor';

export function detectDeviceBudget() {
  if (typeof navigator === 'undefined') return DESKTOP_BUDGET;
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  return isMobile ? MOBILE_BUDGET : DESKTOP_BUDGET;
}

export class ImageJobManager {
  private worker: Worker | null = null;
  private activeJobId: string | null = null;
  private activeController: AbortController | null = null;

  private ensureWorker(): Worker | null {
    if (typeof Worker === 'undefined') return null;
    if (!this.worker) {
      try {
        this.worker = new Worker(new URL('../workers/image.worker.ts', import.meta.url), {
          type: 'module',
        });
      } catch {
        return null;
      }
    }
    return this.worker;
  }

  warmup(): void {
    this.ensureWorker();
  }

  cancelActive(): void {
    if (!this.activeJobId) return;
    if (this.worker) {
      this.worker.postMessage({ type: 'cancel', jobId: this.activeJobId });
    }
    if (this.activeController) {
      this.activeController.abort();
    }
    this.activeJobId = null;
  }

  async run(request: JobRequest, onStage?: (stage: JobStage) => void): Promise<JobResult> {
    this.cancelActive();
    this.activeJobId = request.jobId;
    const budget = request.budget ?? detectDeviceBudget();
    const enrichedRequest: JobRequest = { ...request, budget };

    const worker = this.ensureWorker();
    if (worker) {
      return new Promise<JobResult>((resolve) => {
        const onMessage = (event: MessageEvent) => {
          const data = event.data as
            | { type: 'stage'; jobId: string; stage: JobStage }
            | { type: 'result'; result: JobResult };

          if (data.type === 'stage' && data.jobId === request.jobId) {
            onStage?.(data.stage);
            return;
          }

          if (data.type === 'result' && data.result.jobId === request.jobId) {
            cleanup();
            if (this.activeJobId === request.jobId) {
              this.activeJobId = null;
            }
            resolve(data.result);
          }
        };

        const onError = async () => {
          cleanup();
          this.disposeWorker();
          // Fallback to main-thread execution with bounded budget
          const controller = new AbortController();
          this.activeController = controller;
          const fallbackResult = await runImageJob(enrichedRequest, controller.signal, onStage);
          if (this.activeJobId === request.jobId) {
            this.activeJobId = null;
          }
          resolve(fallbackResult);
        };

        const cleanup = () => {
          worker.removeEventListener('message', onMessage);
          worker.removeEventListener('error', onError);
        };

        worker.addEventListener('message', onMessage);
        worker.addEventListener('error', onError);
        worker.postMessage({ type: 'run', request: enrichedRequest });
      });
    }

    // Main-thread fallback
    const controller = new AbortController();
    this.activeController = controller;
    try {
      return await runImageJob(enrichedRequest, controller.signal, onStage);
    } finally {
      if (this.activeJobId === request.jobId) {
        this.activeJobId = null;
      }
      this.activeController = null;
    }
  }

  disposeWorker(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
