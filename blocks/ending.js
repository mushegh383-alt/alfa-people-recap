function scene(id, label, content) {
  const section = document.createElement('section');
  section.className = `ending-scene ${id}`;
  section.id = id;
  section.setAttribute('aria-label', label);
  section.innerHTML = `<div class="ending-stage"><div class="ending-composition ${id}-composition">${content}</div></div>`;
  return section;
}
function counter(section, selector, value, maxSize, availableWidth) {
  const node = section.querySelector(selector);
  node.dataset.value = String(value);
  node.style.fontSize = `${Math.min(maxSize, availableWidth / Math.max(1, String(value).length))}px`;
  [...String(value)].forEach(text => {
    const digit = document.createElement('span'); digit.textContent = text; node.append(digit);
  });
}
export function createParksharing(data) {
  const section = scene('parksharing', 'Паркшеринг', `
    <img class="park-panel" src="./assets/park-panel.svg" alt="" aria-hidden="true" />
    <h2 class="park-title"><span>п</span><span>а</span><span>рк</span><span>ш</span><span>е</span><span>р</span><span>ин</span><span>г</span></h2>
    <p class="park-caption"><span></span></p>
    <p class="park-number" aria-hidden="true"><span class="park-digits"></span><span class="park-unit">раз</span></p>
    <p class="sr-only park-result" aria-describedby="park-caption"></p>
    <div class="park-ornament" aria-hidden="true"><div><img src="./assets/hero-ornament.webp" alt="" /></div></div>
    <div class="park-car" aria-hidden="true"><img src="./assets/park-car.webp" alt="" /></div>
  `);
  section.querySelector('.park-title').setAttribute('aria-label', data.parksharing.title);
  if (data.parksharing.title !== 'паркшеринг') section.querySelector('.park-title').textContent = data.parksharing.title;
  const caption = section.querySelector('.park-caption'); caption.id = 'park-caption';
  caption.firstElementChild.textContent = data.parksharing.label;
  section.querySelector('.park-result').textContent = `${data.parksharing.trips} раз`;
  counter(section, '.park-digits', data.parksharing.trips, 570.091, 1140.182);
  return section;
}
export function createOffice(data) {
  const section = scene('office', 'Посещения офиса', `
    <div class="office-art" aria-hidden="true">
      <img class="office-art-scene" src="./assets/office-figma/scene.webp" alt="" />
      <div class="office-art-drawer"><div class="office-art-drawer-mask"><img src="./assets/office-figma/drawer.webp" alt="" /></div></div>
      <div class="office-art-top"><img src="./assets/office-figma/scene.webp" alt="" /></div>
    </div>
    <p class="office-number" aria-hidden="true"></p>
    <div class="office-front-track" aria-hidden="true"><div class="office-art-drawer-mask"><div class="office-front-mask"><img src="./assets/office-figma/drawer.webp" alt="" /></div></div></div>
    <h2 class="office-caption" id="office-caption"><span></span></h2>
    <p class="sr-only office-result" aria-describedby="office-caption"></p>
  `);
  section.querySelector('.office-caption span').textContent = data.office.label;
  section.querySelector('.office-result').textContent = String(data.office.visits);
  counter(section, '.office-number', data.office.visits, 694.126, 2082.378);
  return section;
}
export function createFinale(data) {
  const section = scene('finale', 'Ваш талисман следующего года', `
    <img class="final-tree" src="./assets/final-tree.webp" alt="" aria-hidden="true" />
    <div class="final-ornament-upper" aria-hidden="true"><div><img src="./assets/hero-ornament.webp" alt="" /></div></div>
    <div class="final-envelope" aria-hidden="true"><div><img src="./assets/final-envelope.webp" alt="" /></div></div>
    <div class="final-talisman"><img class="final-stamp" src="./assets/final-stamp.svg" alt="" /><img class="final-goat" src="./assets/final-goat.webp" alt="" /></div>
    <h2 class="final-note"><span></span><span></span></h2>
    <div class="final-gift" aria-hidden="true"><div class="final-gift-turn"><img src="./assets/final-gift.webp" alt="" /><div class="final-gift-lid"><img src="./assets/final-gift-under.webp" alt="" /><img src="./assets/final-gift.webp" alt="" /></div></div></div>
    <div class="final-ornament-lower" aria-hidden="true"><img src="./assets/hero-ornament.webp" alt="" /></div>
    <p class="final-caption"><span></span></p>
    <div class="final-action-slot"></div>
  `);
  section.querySelector('.final-goat').alt = data.finale.talisman;
  section.querySelector('.final-goat').src = data.finale.talismanImage;
  const note = section.querySelectorAll('.final-note span');
  note[0].textContent = data.finale.heading; note[1].textContent = data.finale.talisman;
  section.querySelector('.final-caption span').textContent = data.finale.label;
  const action = document.createElement(data.finale.gameUrl ? 'a' : 'button');
  action.className = 'final-action'; action.textContent = data.finale.buttonLabel;
  if (data.finale.gameUrl) action.href = data.finale.gameUrl;
  else { action.type = 'button'; action.setAttribute('aria-disabled', 'true'); }
  section.querySelector('.final-action-slot').append(action);
  return section;
}
