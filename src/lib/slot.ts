const MAX_READS = 2;
let inflight = 0;
const waiting: Array<() => void> = [];

export async function withReadSlot<T>(work: () => Promise<T>): Promise<T> {
  if (inflight >= MAX_READS) {
    await new Promise<void>((resolve) => waiting.push(resolve));
  }
  inflight += 1;
  try {
    return await work();
  } finally {
    inflight -= 1;
    waiting.shift()?.();
  }
}
