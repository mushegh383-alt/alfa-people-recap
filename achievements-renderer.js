import { canvasBudget, getQuality } from './performance.js';
import { resourceUrl } from './resources.js';
import { achievementRibbonMaterial, achievementRibbonAxis } from './achievement-ribbon.js';
import { achievementEdges, achievementRayReveal, achievementsFrame, achievementsSceneScale } from './achievements-layout.js';
import { fitScale } from './layout-fit.js';

// Preserve the source SVG contours, but rasterize only the visible viewport.
// Sixteen independently promoted SVG surfaces are no longer kept on the GPU.
export function rayViewportTransform(edge, reveal, width, height, offsetY = 0) {
  const fit = achievementsSceneScale(width, height, fitScale(width, height, achievementsFrame.width, achievementsFrame.height, 'achievements'));
  return {
    scale: fit * reveal,
    x: (width - achievementsFrame.width * fit) / 2 + fit * (achievementsFrame.originX * (1 - reveal) + achievementsFrame.width * edge.left / 100 * reveal),
    y: offsetY + (height - achievementsFrame.height * fit) / 2 + fit * (achievementsFrame.originY * (1 - reveal) + (achievementsFrame.perspectiveTop + achievementsFrame.perspectiveHeight * edge.top / 100) * reveal),
  };
}

export function createRaysRenderer(canvas, signal, onReady, { luminous = false } = {}) {
  const context = canvas.getContext('2d');
  let artwork;
  let width = 1;
  let height = 1;
  let dpr = 1;
  let previous = -1, tier=getQuality();
  Promise.all(achievementEdges.map(async (_, index) => {
    const response = await fetch(resourceUrl(`./assets/achievement-edge-${String(index).padStart(2, '0')}.svg`), { signal });
    if (!response.ok) throw new Error('Could not load achievement artwork');
    const svg = new DOMParser().parseFromString(await response.text(), 'image/svg+xml');
    return [...svg.querySelectorAll('path')].map(path => {
      const contour = path.getAttribute('d'), fill = path.getAttribute('fill');
      const axis = achievementRibbonAxis((contour.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/ig) || []).map(Number));
      // Градиент задаётся в координатах контура и применяется в текущей
      // трансформации при заливке — его можно создать один раз, а не каждый кадр.
      let gradient = null, material = null;
      if (luminous && context) {
        material = achievementRibbonMaterial(fill);
        gradient = context.createLinearGradient(...axis);
        gradient.addColorStop(0, material.shadow);
        gradient.addColorStop(.22, material.base);
        gradient.addColorStop(.48, material.light);
        gradient.addColorStop(.64, material.base);
        gradient.addColorStop(1, material.shadow);
      }
      return { path: new Path2D(contour), fill, gradient, edge: material?.edge };
    });
  })).then(paths => {
    if (signal.aborted) return;
    artwork = paths;
    canvas.dataset.ready = 'true';
    onReady();
  }).catch(error => { if (!signal.aborted) { canvas.dataset.ready = 'error'; console.error(error); } });
  function resize(w, h) {
    width = Math.max(1, w); height = Math.max(1, h);
    // Холст перерисовывается каждый кадр — без ретины, иначе вдвое больше пикселей.
    dpr = Math.min(1, canvasBudget(width,height).ratio); tier = getQuality();
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    previous = -1;
  }
  function draw(progress, offsetY = 0) {
    if(tier!==getQuality()||canvas.width===1)resize(width,height);
    const key = `${progress}:${offsetY}`;
    if (!context || !artwork || previous === key || signal.aborted) return;
    previous = key;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    context.lineJoin = 'round';
    artwork.forEach((paths, index) => {
      const reveal = achievementRayReveal(progress, index).scale;
      if (reveal < .0001) return;
      const pose = rayViewportTransform(achievementEdges[index], reveal, width, height, offsetY);
      context.save();
      context.transform(pose.scale, 0, 0, pose.scale, pose.x, pose.y);
      paths.forEach(({ path, fill, gradient, edge }) => {
        context.fillStyle = gradient || fill;
        context.fill(path);
        // Тонкая светлая кромка даёт каждой ленте объём без размытия всего холста.
        if (edge) { context.strokeStyle = edge; context.lineWidth = 2.6 / pose.scale; context.stroke(path); }
      });
      context.restore();
    });
    // Текстуру больше не накладываем каждый кадр через маску из всех 116 лент:
    // при альфе .1 её не видно под общим зерном страницы, а кадр она удваивала.
  }
  signal.addEventListener('abort', () => { artwork = null; canvas.width = canvas.height = 1; }, { once: true });
  function clear() {
    if (context) { context.setTransform(1, 0, 0, 1, 0, 0); context.clearRect(0, 0, canvas.width, canvas.height); }
    canvas.width=canvas.height=1;previous = -1;
  }
  return { resize, draw, clear };
}
