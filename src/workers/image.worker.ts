import type { JobRequest, JobResult, JobStage } from '@/engines/contracts';
import { runImageJob } from '@/engines/processor';

type WorkerInbound =
  | { type: 'run'; request: JobRequest }
  | { type: 'cancel'; jobId: string };

type WorkerOutbound =
  | { type: 'stage'; jobId: string; stage: JobStage }
  | { type: 'result'; result: JobResult };

const activeControllers = new Map<string, AbortController>();

self.addEventListener('message', async (event: MessageEvent<WorkerInbound>) => {
  const msg = event.data;

  if (msg.type === 'cancel') {
    const controller = activeControllers.get(msg.jobId);
    if (controller) {
      controller.abort();
    }
    return;
  }

  if (msg.type === 'run') {
    const { request } = msg;
    const controller = new AbortController();
    activeControllers.set(request.jobId, controller);

    try {
      const result = await runImageJob(request, controller.signal, (stage) => {
        const out: WorkerOutbound = { type: 'stage', jobId: request.jobId, stage };
        self.postMessage(out);
      });
      const out: WorkerOutbound = { type: 'result', result };
      self.postMessage(out);
    } finally {
      activeControllers.delete(request.jobId);
    }
  }
});
