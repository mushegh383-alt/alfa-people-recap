export function createAchievements(data) {
  const section = document.createElement('section');
  section.className = `achievements${data.coins ? ' has-coins-next' : ''}`;
  section.id = 'achievements';
  section.setAttribute('aria-label', 'Ваши достижения');
  section.innerHTML = `
    <div class="achievements-track"><div class="achievements-stage">
    <canvas class="achievement-rays-canvas" width="1" height="1" aria-hidden="true"></canvas>
    <div class="achievements-composition">
      <p class="achievement-heading" aria-hidden="true">ачивки</p>
      <div class="achievement-focal">
        <div class="achievement-halo" aria-hidden="true"></div>
        <img class="achievement-star" src="./assets/restyle/ach-star.webp" alt="" />
        <h2 class="achievement-caption" id="achievement-caption"></h2>
        <div class="achievement-sparkles" aria-hidden="true">${Array.from({ length: 14 }, (_, i) => `<i style="--a:${i * 360 / 14 + (i % 2) * 9}deg"></i>`).join('')}</div>
      </div>
      <p class="achievement-number" aria-labelledby="achievement-caption"><span class="achievement-digits" aria-hidden="true"></span><span class="sr-only"></span></p>
    </div>
    <div class="achievement-flash" aria-hidden="true"></div>
    </div></div>
  `;
  const caption = section.querySelector('.achievement-caption');
  data.achievements.label.split('\n').forEach((line, index) => {
    if (index) caption.append(document.createTextNode('\n'));
    const clip = document.createElement('span');
    clip.className = 'achievement-caption-line';
    const text = document.createElement('span');
    text.className = 'achievement-caption-reveal';
    text.textContent = line;
    clip.append(text);
    caption.append(clip);
  });
  section.querySelector('.sr-only').textContent = String(data.achievements.count);
  const counter = section.querySelector('.achievement-digits');
  counter.dataset.value = data.achievements.count;
  section.style.setProperty('--achievement-count-size', `${Math.min(700, 1250 / String(data.achievements.count).length)}px`);
  [...String(data.achievements.count)].forEach((digit, index) => {
    const slot = document.createElement('span');
    slot.textContent = String((Number(digit) + index + 4) % 10);
    counter.append(slot);
  });
  return section;
}
