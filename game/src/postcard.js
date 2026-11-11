// Горизонтальная открытка 1620×1080 (3:2): слева иллюстрация в перфорированной
// рамке-марке, справа штемпель и поздравление шрифтом лендинга.
import { piplik } from './renderer.js';

export const CARD_W = 1620, CARD_H = 1080;

async function fonts() {
  await Promise.all(['700 150px Nauryz', '60px Agse', '700 30px Styrene'].map(f => document.fonts.load(f).catch(() => {})));
}

function perforated(w, h, color, r = 15, step = 44) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = color; ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'destination-out';
  const holes = (len, place) => { const n = Math.round(len / step), gap = len / n; for (let i = 0; i <= n; i++) place(i * gap); };
  ctx.beginPath();
  holes(w, x => { ctx.moveTo(x + r, 0); ctx.arc(x, 0, r, 0, Math.PI * 2); ctx.moveTo(x + r, h); ctx.arc(x, h, r, 0, Math.PI * 2); });
  holes(h, y => { ctx.moveTo(r, y); ctx.arc(0, y, r, 0, Math.PI * 2); ctx.moveTo(w + r, y); ctx.arc(w, y, r, 0, Math.PI * 2); });
  ctx.fill();
  return c;
}

function cover(ctx, img, x, y, w, h) {
  const k = Math.max(w / img.naturalWidth, h / img.naturalHeight), sw = w / k, sh = h / k;
  ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
}

function postmark(ctx, x, y, color) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(.22);
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(0, 0, 112, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, 92, 0, Math.PI * 2); ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '78px Agse, serif'; ctx.fillText('2027', 0, 6);
  ctx.font = '700 17px Styrene, Inter, sans-serif';
  const label = 'С НОВЫМ ГОДОМ · ALFA PEOPLE · ';
  [...label].forEach((ch, i) => { ctx.save(); ctx.rotate(-Math.PI / 2 + i / label.length * Math.PI * 2); ctx.translate(0, -101); ctx.fillText(ch, 0, 0); ctx.restore(); });
  for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(130, i * 22); ctx.bezierCurveTo(190, i * 22 - 14, 240, i * 22 + 14, 300, i * 22); ctx.stroke(); }
  ctx.restore();
}

export async function drawPostcard(card, images) {
  await fonts();
  const c = document.createElement('canvas'); c.width = CARD_W; c.height = CARD_H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = card.bg; ctx.fillRect(0, 0, CARD_W, CARD_H);

  // Шапка
  ctx.fillStyle = card.ink; ctx.strokeStyle = card.ink;
  ctx.font = '700 26px Styrene, Inter, sans-serif'; ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left'; ctx.fillText('НОВОГОДНЯЯ ОТКРЫТКА', 72, 104);
  ctx.textAlign = 'right'; ctx.fillText('№ ' + String(['goat', 'ornament', 'sweet', 'tree', 'piplik'].indexOf(card.id) + 1).padStart(2, '0') + ' / 05', CARD_W - 72, 104);
  ctx.globalAlpha = .35; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(72, 134); ctx.lineTo(CARD_W - 72, 134); ctx.stroke(); ctx.globalAlpha = 1;

  // Иллюстрация — левая половина
  const ix = 430, iy = 600;
  if (card.image) {
    const fw = 560, fh = 700, frameColor = card.bg === '#f8e4c2' ? '#020101' : '#f8e4c2';
    ctx.save(); ctx.translate(ix, iy); ctx.rotate(-.05);
    ctx.shadowColor = '#0006'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18;
    ctx.drawImage(perforated(fw, fh, frameColor), -fw / 2, -fh / 2);
    ctx.shadowColor = 'transparent';
    cover(ctx, images[card.image], -fw / 2 + 34, -fh / 2 + 34, fw - 68, fh - 68);
    ctx.restore();
  } else {
    const glow = ctx.createRadialGradient(ix, iy, 40, ix, iy, 420);
    glow.addColorStop(0, card.accent + 'aa'); glow.addColorStop(1, card.accent + '00');
    ctx.fillStyle = glow; ctx.fillRect(0, 140, 900, 940);
    ctx.save(); ctx.translate(ix, iy + 10); ctx.rotate(-.07);
    ctx.drawImage(piplik(images), -290, -335, 580, 668);
    ctx.restore();
  }
  postmark(ctx, 1300, 300, card.accent);

  // Поздравление — правая половина
  const tx = 820, maxW = CARD_W - 72 - tx;
  ctx.fillStyle = card.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  const size = card.lines.length > 2 ? 128 : 160, block = card.lines.length * size * .98;
  const first = 690 - block / 2 + size * .8;
  ctx.font = `700 ${size}px Nauryz, sans-serif`;
  card.lines.forEach((line, i) => {
    const w = ctx.measureText(line).width, k = Math.min(1, maxW / w);
    ctx.save(); ctx.translate(tx, first + i * size * .98); ctx.scale(k, k); ctx.fillText(line, 0, 0); ctx.restore();
  });

  // Подвал
  ctx.font = '700 22px Styrene, Inter, sans-serif';
  ctx.globalAlpha = .35; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tx, CARD_H - 120); ctx.lineTo(CARD_W - 72, CARD_H - 120); ctx.stroke();
  ctx.globalAlpha = .7;
  ctx.fillText(card.name.toUpperCase(), tx, CARD_H - 76);
  ctx.textAlign = 'right'; ctx.fillText('ALFA PEOPLE · ИТОГИ 2026', CARD_W - 72, CARD_H - 76);
  ctx.globalAlpha = 1;
  return c;
}

export function toBlob(canvas, type = 'image/png', quality) {
  return new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('Не удалось сохранить открытку')), type, quality));
}

export async function thumbnail(canvas, width = 480) {
  const t = document.createElement('canvas'); t.width = width; t.height = Math.round(width * CARD_H / CARD_W);
  t.getContext('2d').drawImage(canvas, 0, 0, t.width, t.height);
  return URL.createObjectURL(await toBlob(t, 'image/webp', .9));
}
