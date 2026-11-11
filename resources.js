import { optimizedAssets } from './optimized-assets.js';
import { getQuality } from './performance.js';
// Keep compressed assets for the session; sequence frames are decoded on demand.
const assets = new Map();
const absolute = url => new URL(url, globalThis.document?.baseURI || import.meta.url).href;
export function optimizedAssetUrl(input) {
  const url=absolute(input);
  for(const [from,to] of Object.entries(optimizedAssets))if(url===absolute(from))return absolute(to);
  const car=new URL('./assets/car-sequence/',import.meta.url).href;
  if(url.startsWith(car)&&getQuality()!=='full')return new URL(`./assets/optimized/car-${getQuality()}/${url.slice(car.length)}`,import.meta.url).href;
  return url;
}
export const resourceUrl = url => assets.get(absolute(url))?.url || absolute(url);
export async function resourceJSON(url) {
  const item = assets.get(absolute(url));
  if (!item) throw new Error(`Resource not prepared: ${url}`);
  return JSON.parse(await item.blob.text());
}
export async function preloadAssets(urls, { signal, onProgress = () => {}, concurrency = 6 } = {}) {
  const queue = [...new Set(urls.filter(Boolean).map(absolute))];
  const progress = queue.map(url => assets.has(url) ? 1 : 0);
  const controller = new AbortController();
  const abort = () => controller.abort(signal.reason);
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) abort();
  const report = () => onProgress(progress.reduce((sum, value) => sum + value, 0) / Math.max(1, queue.length));
  let cursor = 0;
  report();
  try {
    await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
      while (cursor < queue.length) {
        const index = cursor++, url = queue[index];
        controller.signal.throwIfAborted();
        if (assets.has(url)) continue;
        const timeout = AbortSignal.timeout(45000);
        const requestSignal = AbortSignal.any([controller.signal, timeout]);
        const response = await fetch(optimizedAssetUrl(url), { signal: requestSignal, credentials: 'same-origin' });
        if (!response.ok) throw new Error(`Asset ${response.status}: ${url}`);
        const length = Number(response.headers.get('content-length'));
        const chunks = [];
        let received = 0;
        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value); received += value.byteLength;
          if (length > 0) { progress[index] = Math.min(.99, received / length); report(); }
        }
        requestSignal.throwIfAborted();
        const blob = new Blob(chunks, { type: response.headers.get('content-type') || '' });
        assets.set(url, { blob, url: URL.createObjectURL(blob) });
        progress[index] = 1; report();
      }
    }));
  } catch (error) {
    controller.abort();
    throw error;
  } finally {
    signal?.removeEventListener('abort', abort);
  }
}
