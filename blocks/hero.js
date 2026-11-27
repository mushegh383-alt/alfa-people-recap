import { createFilmHero } from '../hero-film.js';

export function createHero(data) {
  if (data.intro?.mode === 'video' && data.year === data.intro.mediaYear) return createFilmHero(data);
  const section = document.createElement('section');
  section.className = 'hero';
  section.id = 'intro';
  section.setAttribute('aria-label', `${data.intro?.title || 'Итоги Alfa People'} ${data.year}`);
  section.innerHTML = `
    <div class="hero-stamp" aria-hidden="true"><img src="./assets/hero-stamp.svg" width="1844" height="1367" alt="" /></div>
    <h1 class="hero-title entrance" data-reveal></h1>
    <div class="hero-character hero-decor" data-parallax="-0.045" aria-hidden="true"><div class="entrance" data-reveal><div class="hero-character-rest hero-idle"><img src="./assets/hero-character.webp" alt="" /></div></div></div>
    <div class="hero-ornament hero-decor" data-parallax="0.035" aria-hidden="true"><div class="entrance" data-reveal><div class="hero-ornament-rest hero-idle"><div><img src="./assets/hero-ornament.webp" alt="" /></div></div></div></div>
    <div class="hero-video-slot" data-name="Video" data-node-id="2866:677" aria-hidden="true">
      <img class="hero-sequence-poster" width="1700" height="956" alt="" />
      <canvas class="hero-sequence" width="1700" height="956"></canvas>
      <div class="hero-live-year"></div>
    </div>
    <div class="hero-video-shade" aria-hidden="true"><img src="./assets/hero-video-shade.svg" alt="" /></div>
    <div class="hero-flake hero-flake-one hero-decor" data-parallax="-0.03" aria-hidden="true"><div class="entrance" data-reveal><div class="hero-flake-rest hero-idle"><img src="./assets/hero-snowflake.webp" alt="" /></div></div></div>
    <div class="hero-flake hero-flake-two hero-decor" data-parallax="0.04" aria-hidden="true"><div class="entrance" data-reveal><div class="hero-flake-rest hero-idle"><img src="./assets/hero-snowflake.webp" alt="" /></div></div></div>
    <div class="hero-flake hero-flake-three hero-decor" data-parallax="-0.025" aria-hidden="true"><div class="entrance" data-reveal><div class="hero-flake-rest hero-idle"><img src="./assets/hero-snowflake.webp" alt="" /></div></div></div>
    <div class="hero-logo hero-decor" data-parallax="-0.02" aria-hidden="true"><div class="entrance" data-reveal><div class="hero-logo-rest hero-idle"><img src="./assets/hero-smile.webp" alt="" /></div></div></div>
  `;
  section.querySelector('.hero-title').textContent = data.intro?.title || 'ИТОГИ ALFA PEOPLE';
  const poster = section.querySelector('.hero-sequence-poster');
  if (data.intro && data.year === data.intro.mediaYear) {
    poster.src = data.intro.poster;
  } else {
    poster.remove();
    section.classList.add('hero-with-live-year');
    section.querySelector('.hero-live-year').textContent = data.year;
  }
  return section;
}
