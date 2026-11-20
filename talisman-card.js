export function mountTalismanCard(root, data, signal) {
  const section = root.querySelector('#finale'); if (!section || !data.finale) return;
  const stamp = section.querySelector('.finale-seven-stamp');
  // Ссылка под «играть» и нажатие на саму марку.
  const link = document.createElement('button'); link.type = 'button'; link.className = 'finale-card-link'; link.textContent = 'Открыть открытку';
  section.querySelector('.finale-seven-action-slot')?.append(link);
  if (stamp) { stamp.setAttribute('role', 'button'); stamp.tabIndex = 0; stamp.setAttribute('aria-label', 'Открыть новогоднюю открытку'); stamp.classList.add('is-clickable'); }

  let overlay = null, blobUrl = null, blob = null;
  async function open() {
    if (overlay) return;
    overlay = document.createElement('div'); overlay.className = 'talisman-modal'; overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true'); overlay.setAttribute('aria-label', 'Новогодняя открытка');
    overlay.innerHTML = `<div class="talisman-modal-card"><div class="talisman-modal-preview" aria-busy="true"></div><div class="talisman-modal-actions"><button type="button" class="talisman-download" disabled>Скачать открытку</button><button type="button" class="talisman-close">Закрыть</button></div></div>`;
    document.body.append(overlay); document.documentElement.classList.add('has-modal');
    requestAnimationFrame(() => overlay?.classList.add('is-open'));
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    overlay.querySelector('.talisman-close').addEventListener('click', close);
    overlay.querySelector('.talisman-close').focus();
    const modal = overlay;
    try {
      const response = await fetch(new URL('./assets/restyle/gnome-postcard.png', import.meta.url), {signal});
      if (!response.ok) throw new Error('Postcard HTTP ' + response.status);
      const imageBlob = await response.blob();
      if (overlay !== modal) return;
      blob = imageBlob;
      blobUrl = URL.createObjectURL(blob);
      const img = new Image();
      img.src = blobUrl;
      img.alt = 'Гном с красным сердцем у двери заснеженного дома';
      await img.decode();
      if (overlay !== modal) return;
      const preview = overlay.querySelector('.talisman-modal-preview'); preview.append(img); preview.removeAttribute('aria-busy');
      const download = overlay.querySelector('.talisman-download'); download.disabled = false;
      download.addEventListener('click', save);
    } catch (error) { if (overlay !== modal) return; modal.querySelector('.talisman-modal-preview').removeAttribute('aria-busy'); console.error(error); overlay?.querySelector('.talisman-modal-preview')?.append(Object.assign(document.createElement('p'), { textContent: 'Не получилось собрать открытку. Попробуйте ещё раз.' })); }
  }
  async function save() {
    if (!blob) return;
    const name = `alfa-people-postcard-${data.year}.png`;
    const file = new File([blob], name, { type: 'image/png' });
    // Телефон: «Поделиться» → «Сохранить изображение»; ПК: обычное скачивание.
    if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Новогодняя открытка' }); return; } catch (e) { if (e?.name === 'AbortError') return; }
    }
    const a = document.createElement('a'); a.href = blobUrl; a.download = name; document.body.append(a); a.click(); a.remove();
  }
  function close() {
    if (!overlay) return;
    const o = overlay; overlay = null; o.classList.remove('is-open');
    const previousUrl = blobUrl; blobUrl = null; blob = null;
    setTimeout(() => { o.remove(); if (previousUrl) URL.revokeObjectURL(previousUrl); }, 300);
    document.documentElement.classList.remove('has-modal');
    link.focus({ preventScroll: true });
  }
  link.addEventListener('click', open, { signal });
  stamp?.addEventListener('click', open, { signal });
  stamp?.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }, { signal });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); }, { signal });
  signal.addEventListener('abort', () => { close(); link.remove(); }, { once: true });
}
