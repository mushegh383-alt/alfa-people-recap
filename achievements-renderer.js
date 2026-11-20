import { canvasBudget, getQuality } from './performance.js';
import { resourceUrl } from './resources.js';
import { achievementRibbonMaterial, achievementRibbonAxis } from './achievement-ribbon.js';
import { achievementEdges, achievementRayReveal, achievementsFrame, achievementsSceneScale } from './achievements-layout.js?local=21';
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
  let previous = -1, tier=getQuality(), sparkList = [], sparkKey = '';
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
  // label — надпись «ачивки», которую на телефоне рисуем прямо на холсте (холст там лежит
  // поверх сцены, см. achievements-motion.js): { text, font, x, y, size, alpha, cx, cy, scale, spin }.
  function draw(progress, offsetY = 0, label = null) {
    if(tier!==getQuality()||canvas.width===1)resize(width,height);
    const key = `${progress}:${offsetY}:${sparkKey}:${label ? [label.x, label.y, label.size, label.alpha, label.scale, label.spin].map(v => v.toFixed(2)).join(',') : ''}`;
    if (!context || !artwork || previous === key || signal.aborted) return;
    previous = key;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    context.lineJoin = 'round';
    artwork.forEach((paths, index) => {
      const reveal = achievementRayReveal(progress, index).scale;
      if (reveal < .0001) return;
      // Uncover each ribbon along its final contour, from the star outwards.
      const pose = rayViewportTransform(achievementEdges[index], 1, width, height, offsetY);
      context.save();
      if (reveal < 1) {
        const cx = width/2 + (achievementsFrame.originX-achievementsFrame.width/2)*pose.scale;
        const cy = height/2 + (achievementsFrame.originY-achievementsFrame.height/2)*pose.scale + offsetY;
        const radius = Math.hypot(Math.max(cx,width-cx), Math.max(cy,height-cy));
        context.beginPath();
        context.arc(cx, cy, radius*reveal, 0, 2*Math.PI);
        context.clip();
      }
      context.transform(pose.scale, 0, 0, pose.scale, pose.x, pose.y);
      paths.forEach(({ path, fill, gradient, edge }) => {
        context.fillStyle = gradient || fill;
        context.fill(path);
        // Тонкая светлая кромка даёт каждой ленте объём без размытия всего холста.
        if (edge) { context.strokeStyle = edge; context.lineWidth = 2.6 / pose.scale; context.stroke(path); }
      });
      context.restore();
    });
    if (label && label.alpha > .005) {
      // Холст сам повёрнут и масштабирован CSS-ом (пролёт в конце) — компенсируем, чтобы
      // надпись стояла ровно там, где была бы обычная.
      context.save();
      context.translate(label.cx, label.cy); context.rotate(-label.spin * Math.PI / 180); context.scale(1 / label.scale, 1 / label.scale); context.translate(-label.cx, -label.cy);
      const a = Math.min(1, label.alpha);   // прозрачность цветом: globalAlpha WebKit для текста с тенью не учитывал
      context.font = `700 ${label.size.toFixed(2)}px ${label.font}`;
      if ('letterSpacing' in context) context.letterSpacing = `${(-.03 * label.size).toFixed(2)}px`;
      context.textAlign = 'center'; context.textBaseline = 'middle';
      context.shadowColor = `rgba(250,122,179,${(.33 * a).toFixed(3)})`; context.shadowBlur = 40 * label.size / 330;
      context.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`; context.fillText(label.text, label.x, label.y);
      context.restore();
    }
    for (const sp of sparkList) {
      if (sp.alpha < .01) continue;
      context.save(); context.translate(sp.x, sp.y); context.rotate(sp.rot * Math.PI / 180);
      const h = sp.side / 2, k = sp.side * .11;
      context.beginPath(); context.moveTo(0, -h); context.lineTo(k, -k); context.lineTo(h, 0); context.lineTo(k, k); context.lineTo(0, h); context.lineTo(-k, k); context.lineTo(-h, 0); context.lineTo(-k, -k); context.closePath();
      context.fillStyle = `rgba(${sp.color},${sp.alpha.toFixed(3)})`; context.fill(); context.restore();
    }
    // Текстуру больше не накладываем каждый кадр через маску из всех 116 лент:
    // при альфе .1 её не видно под общим зерном страницы, а кадр она удваивала.
  }
  signal.addEventListener('abort', () => { artwork = null; canvas.width = canvas.height = 1; }, { once: true });
  function clear() {
    if (context) { context.setTransform(1, 0, 0, 1, 0, 0); context.clearRect(0, 0, canvas.width, canvas.height); }
    canvas.width=canvas.height=1;previous = -1;
  }
  function sparks(list) { sparkList = list; sparkKey = list.map(sp => `${sp.x.toFixed(1)},${sp.y.toFixed(1)},${sp.side.toFixed(1)},${sp.alpha.toFixed(2)}`).join(';'); }
  return { resize, draw, clear, sparks };
}
