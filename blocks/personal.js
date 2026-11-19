import { optimizedAssetUrl } from '../resources.js';
export function createPersonal(data) {
  const section = document.createElement('section');
  section.className = 'personal';
  section.id = 'your-year';
  section.dataset.designHeight = '2112';
  section.setAttribute('aria-labelledby', 'person-name');
  section.innerHTML = `
    <div class="personal-glow" aria-hidden="true"><img src="./assets/restyle/personal-background.png" alt="" /></div>
    <div class="portrait-layer" data-parallax="0.025">
      <div class="portrait entrance" data-reveal><img width="1115.5" height="1014.904" /></div>
    </div>
    <h2 id="person-name" class="person-name entrance" data-reveal></h2>
    <p class="visit-count entrance" data-reveal><span class="counter" aria-hidden="true"></span><span class="sr-only"></span></p>
    <p class="visit-caption entrance" data-reveal></p>
  `;
  const photo = section.querySelector('.portrait img');
  photo.src = optimizedAssetUrl(data.person.photo);
  photo.alt = data.person.photoAlt;
  if (data.person.photoMode === 'plain') section.querySelector('.portrait').classList.add('portrait-plain');
  const name = section.querySelector('.person-name');
  name.textContent = data.person.name;
  name.style.setProperty('--name-size', `${Math.min(250, 1450 / Math.max(data.person.name.length * .65, 1))}px`);
  section.querySelector('.counter').dataset.value = String(data.stats.visits);
  section.querySelector('.sr-only').textContent = String(data.stats.visits);
  section.querySelector('.visit-caption').textContent = data.copy.visits;
  return section;
}
