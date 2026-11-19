export function createThanks(data) {
  const section = document.createElement('section');
  section.className = 'thanks';
  section.id = 'thanks';
  section.setAttribute('aria-label', 'Отправленные и полученные спасибки');
  section.innerHTML = `
    <div class="thanks-scene"><div class="thanks-composition">
    <div class="thanks-art" aria-hidden="true">
      <div class="thanks-burst-motion"><div class="thanks-burst-idle"><img class="thanks-burst" src="./assets/restyle/thanks-burst.png" width="2412" height="1597" alt="" /></div></div>
      <div class="thanks-heart-motion"><div class="thanks-heart-entrance"><div class="thanks-heart-mask"><img src="./assets/restyle/thanks-heart.png" width="2075.211" height="1556.408" alt="" /></div></div></div>
    </div>
    <h2 class="thanks-title"></h2>
    <div class="thanks-stats">
      <div class="thanks-stat thanks-sent">
        <h3 class="thanks-caption" id="thanks-sent-caption"></h3>
        <p class="thanks-number" aria-labelledby="thanks-sent-caption"><span class="thanks-digits" aria-hidden="true"></span><span class="sr-only"></span></p>
      </div>
      <div class="thanks-stat thanks-received">
        <h3 class="thanks-caption" id="thanks-received-caption"></h3>
        <p class="thanks-number" aria-labelledby="thanks-received-caption"><span class="thanks-digits" aria-hidden="true"></span><span class="sr-only"></span></p>
      </div>
    </div>
    <p class="thanks-note entrance" data-reveal></p>
    </div></div>
  `;
  const rays = section.querySelector('.thanks-burst-motion');
  rays.setAttribute('aria-hidden', 'true');
  section.querySelector('.thanks-composition').prepend(rays);
  for (const name of ['sent', 'received']) {
    const stat = section.querySelector(`.thanks-${name}`);
    const value = data.thanks[name];
    stat.querySelector('.thanks-caption').textContent = data.thanks[`${name}Label`];
    stat.querySelector('.sr-only').textContent = String(value);
    const counter = stat.querySelector('.thanks-digits');
    counter.dataset.value = String(value);
    counter.style.setProperty('--thanks-number-size', `${Math.min(550, 1700 / String(value).length)}px`);
    [...String(value)].forEach((digit, index) => {
      const slot = document.createElement('span');
      slot.className = 'thanks-digit';
      slot.textContent = String((Number(digit) + index + 4) % 10);
      counter.append(slot);
    });
  }
  section.querySelector('.thanks-title').textContent = data.thanks.title;
  section.querySelector('.thanks-note').textContent = data.thanks.note;
  return section;
}
