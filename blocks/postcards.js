import { postcardLayout, postcardPose } from '../postcards-layout.js';
import { createPostcardSpark } from '../postcards-spark.js';

export function createPostcards(data) {
  const section = document.createElement('section');
  section.className = `postcards${data.achievements ? ' has-achievements-next' : ''}`;
  section.id = 'postcards';
  section.setAttribute('aria-label', 'Ваши открытки');
  section.innerHTML = `
    <div class="postcards-pin">
      <div class="postcards-composition">
      <div class="postcards-paper postcards-paper-first" aria-hidden="true"><img src="./assets/thanks-texture.png" width="3259" height="2173" alt="" /></div>
      <div class="postcards-paper postcards-paper-second" aria-hidden="true"><img src="./assets/thanks-texture.png" width="3259" height="2173" alt="" /></div>
      <div class="postcards-stage postcards-stage-top" aria-hidden="true"><div class="postcards-artboard"></div></div>
      <div class="postcards-stats">
        <div class="postcards-stat postcards-sent"><p class="postcards-number"><span class="postcards-digits" aria-hidden="true"></span><span class="sr-only"></span></p><h2 class="postcards-caption"></h2></div>
        <div class="postcards-stat postcards-received"><p class="postcards-number"><span class="postcards-digits" aria-hidden="true"></span><span class="sr-only"></span></p><h2 class="postcards-caption"></h2></div>
      </div>
      <div class="postcards-stage postcards-stage-bottom" aria-hidden="true">
        <div class="postcards-artboard">
          <img class="postcards-decoration" src="./assets/postcard-star.png" width="616" height="330.5" alt="" />
        </div>
      </div>
      </div>
    </div>
  `;
  for (const name of ['sent', 'received']) {
    const stat = section.querySelector(`.postcards-${name}`);
    const value = data.postcards[name];
    stat.querySelector('.postcards-caption').textContent = data.postcards[`${name}Label`];
    stat.querySelector('.sr-only').textContent = String(value);
    const counter = stat.querySelector('.postcards-digits');
    counter.dataset.value = String(value);
    counter.style.setProperty('--count-factor', Math.min(1, 2.5 / String(value).length));
    [...String(value)].forEach((digit, index) => {
      const span = document.createElement('span');
      span.textContent = String((Number(digit) + index + 4) % 10);
      counter.append(span);
    });
  }
  section.querySelector('.postcards-composition').append(createPostcardSpark());
  for (const artboard of section.querySelectorAll('.postcards-artboard')) {
  postcardLayout.forEach((card, index) => {
    const face = document.createElement('div');
    face.className = 'postcard-face';
    face.dataset.card = index;
    face.style.width = `${card.width}px`;
    face.style.height = `${card.height}px`;
    const addImage = (source, width, height, left = 0, top = 0) => {
      const layer = document.createElement('div');
      layer.className = 'postcard-image-layer';
      const img = document.createElement('img');
      img.src = source;
      img.alt = '';
      Object.assign(img.style, { width: `${width}%`, height: `${height}%`, left: `${left}%`, top: `${top}%` });
      layer.append(img);
      face.append(layer);
    };
    if (card.alternate) {
      addImage(data.postcards.front, 100, 171.06);
      addImage(data.postcards.alternate, 128.8, 220.32, .1, -34.9);
    }
    if (card.background) {
      const fill = document.createElement('div');
      fill.className = 'postcard-fill';
      fill.style.background = card.background;
      face.append(fill);
    }
    addImage(data.postcards.front, card.imageW, card.imageH);
    const pose = postcardPose(0, index, card);
    face.style.transform = `translate(${pose.x - card.width / 2}px, ${pose.y - card.height / 2}px) rotate(${pose.rotation}deg) scale(${pose.scale})`;
    artboard.append(face);
  });
  }
  return section;
}
