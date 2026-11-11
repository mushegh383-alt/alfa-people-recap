// Финальная открытка с талисманом: открывается по нажатию на марку (или ссылку
// под «играть»), рисуется на canvas в формате 1080×1350 и скачивается PNG.
// На телефоне — через системное «Поделиться» (там есть «Сохранить изображение»).
const W = 1080, H = 1350;

function loadImage(src) {
  return new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = src; });
}
// Картинки марки берём из самой сцены (у далёких глав src может быть временно подменён).
const realSrc = img => img?.dataset.memSrc || img?.currentSrc || img?.src;

function wrap(ctx, text, maxWidth) {
  const words = text.split(/\s+/), lines = []; let line = '';
  for (const w of words) { const t = line ? `${line} ${w}` : w; if (ctx.measureText(t).width > maxWidth && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line); return lines;
}

async function drawCard(section, data) {
  await document.fonts?.ready;
  const [frame, mascot] = await Promise.all([loadImage(realSrc(section.querySelector('.finale-seven-frame'))), loadImage(realSrc(section.querySelector('.finale-seven-mascot')))]);
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const c = canvas.getContext('2d');
  // Фон: фирменный красный с мягким светом в центре и кремовая рамка.
  const bg = c.createRadialGradient(W / 2, H * .46, 0, W / 2, H * .46, H * .75);
  bg.addColorStop(0, '#ff6a4c'); bg.addColorStop(.55, '#ef3124'); bg.addColorStop(1, '#a3140f');
  c.fillStyle = bg; c.fillRect(0, 0, W, H);
  c.strokeStyle = '#f8e4c2'; c.lineWidth = 10; c.setLineDash([]);
  c.beginPath(); c.roundRect ? c.roundRect(36, 36, W - 72, H - 72, 44) : c.rect(36, 36, W - 72, H - 72); c.stroke();
  // Лучи за маркой.
  c.save(); c.translate(W / 2, H * .5); c.fillStyle = 'rgba(255,214,232,.16)';
  for (let i = 0; i < 16; i++) { c.rotate(Math.PI / 8); c.beginPath(); c.moveTo(-26, 0); c.lineTo(26, 0); c.lineTo(0, -H); c.closePath(); c.fill(); }
  c.restore();
  c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  // Заголовок.
  const person = (data.person?.name || '').trim();
  c.fillStyle = '#f8e4c2'; c.font = '700 40px Styrene, sans-serif';
  c.fillText(person ? `${person[0].toUpperCase()}${person.slice(1)}, это для вас` : 'Это для вас', W / 2, 140);
  c.fillStyle = '#ffffff'; c.font = '112px Agse, Georgia, serif';
  const year = data.year + 1;
  c.fillText('Ваш талисман', W / 2, 262); c.fillText(`${year} года`, W / 2, 372);
  // Марка: рамка с зубчиками и талисман, слегка повёрнута, с тенью.
  const sw = 470, sh = sw * 374 / 282;
  c.save(); c.translate(W / 2, 715); c.rotate(-.05);
  c.fillStyle = 'rgba(40,0,6,.35)'; c.fillRect(-sw / 2 + 18, -sh / 2 + 24, sw, sh);
  c.drawImage(frame, -sw / 2, -sh / 2, sw, sh);
  const k = sw / 282; c.drawImage(mascot, -sw / 2 + 31.8 * k, -sh / 2 + 30.6 * k, 219.6 * k, 310.3 * k);
  c.restore();
  // Имя талисмана и подпись.
  c.fillStyle = '#ffffff'; c.font = '700 76px Nauryz, sans-serif';
  c.fillText(data.finale.talisman, W / 2, 1168);
  c.fillStyle = '#f8e4c2'; c.font = '700 32px Styrene, sans-serif';
  c.fillText(`итоги ${data.year} · Alfa People`, W / 2, H - 92);
  return canvas;
}

export function mountTalismanCard(root, data, signal) {
  const section = root.querySelector('#finale'); if (!section || !data.finale) return;
  const stamp = section.querySelector('.finale-seven-stamp');
  // Ссылка под «играть» и нажатие на саму марку.
  const link = document.createElement('button'); link.type = 'button'; link.className = 'finale-card-link'; link.textContent = 'Открыть открытку';
  section.querySelector('.finale-seven-action-slot')?.append(link);
  if (stamp) { stamp.setAttribute('role', 'button'); stamp.tabIndex = 0; stamp.setAttribute('aria-label', 'Открыть открытку с талисманом'); stamp.classList.add('is-clickable'); }

  let overlay = null, blobUrl = null, blob = null;
  async function open() {
    if (overlay) return;
    overlay = document.createElement('div'); overlay.className = 'talisman-modal'; overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true'); overlay.setAttribute('aria-label', 'Открытка с талисманом');
    overlay.innerHTML = `<div class="talisman-modal-card"><div class="talisman-modal-preview" aria-busy="true"></div><div class="talisman-modal-actions"><button type="button" class="talisman-download" disabled>Скачать открытку</button><button type="button" class="talisman-close">Закрыть</button></div></div>`;
    document.body.append(overlay); document.documentElement.classList.add('has-modal');
    requestAnimationFrame(() => overlay?.classList.add('is-open'));
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    overlay.querySelector('.talisman-close').addEventListener('click', close);
    overlay.querySelector('.talisman-close').focus();
    try {
      const canvas = await drawCard(section, data);
      blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
      if (!overlay) return;
      blobUrl = URL.createObjectURL(blob);
      const img = document.createElement('img'); img.src = blobUrl; img.alt = `Открытка: ваш талисман ${data.year + 1} года — ${data.finale.talisman}`;
      const preview = overlay.querySelector('.talisman-modal-preview'); preview.append(img); preview.removeAttribute('aria-busy');
      const download = overlay.querySelector('.talisman-download'); download.disabled = false;
      download.addEventListener('click', save);
    } catch (error) { console.error(error); overlay?.querySelector('.talisman-modal-preview')?.append(Object.assign(document.createElement('p'), { textContent: 'Не получилось собрать открытку. Попробуйте ещё раз.' })); }
  }
  async function save() {
    if (!blob) return;
    const name = `talisman-${data.year + 1}.png`;
    const file = new File([blob], name, { type: 'image/png' });
    // Телефон: «Поделиться» → «Сохранить изображение»; ПК: обычное скачивание.
    if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Мой талисман' }); return; } catch (e) { if (e?.name === 'AbortError') return; }
    }
    const a = document.createElement('a'); a.href = blobUrl; a.download = name; document.body.append(a); a.click(); a.remove();
  }
  function close() {
    if (!overlay) return;
    const o = overlay; overlay = null; o.classList.remove('is-open');
    setTimeout(() => { o.remove(); if (blobUrl) URL.revokeObjectURL(blobUrl); blobUrl = null; blob = null; }, 300);
    document.documentElement.classList.remove('has-modal');
    link.focus({ preventScroll: true });
  }
  link.addEventListener('click', open, { signal });
  stamp?.addEventListener('click', open, { signal });
  stamp?.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }, { signal });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); }, { signal });
  signal.addEventListener('abort', () => { close(); link.remove(); }, { once: true });
}
