import { ease } from './november-layout.js';

// Extend the containing block of each sticky stage across its shared viewport.
// The chapter keeps its original height, anchors and local animation timeline.
export function mountChapterOverlaps(slides, signal) {
  const fades = [];
  const stages = '.story-pin, .sky-stage, .achievements-stage, .november-stage, .spending-stage, .book-chapter-stage, .ending-chapter-pin';
  const edges = [
    ['#zodiac','#profile-views'], ['#profile-views','#achievements'],
    ['#achievements','#coins'], ['#coins','.book-chapter.has-spending, #spending'], ['.book-chapter','.ending-chapter, #office']
  ];
  function extend(section, side) {
    let track = section.querySelector(':scope > .chapter-track, :scope > .achievements-track');
    if (!track) {
      const stage = section.querySelector(':scope > :is('+stages+')');
      track = document.createElement('div');
      stage.before(track);
      track.append(stage);
    }
    track.classList.add('chapter-track');
    section.classList.add('overlap-'+side);
    return track.firstElementChild;
  }
  const story = slides.parentElement.querySelector(':scope > .opening-story');
  const zodiac = slides.firstElementChild;
  if (story && zodiac?.id === 'zodiac') {
    extend(story, 'exit');
    const stage = extend(zodiac, 'entry');
    fades.push({section:zodiac, stage, track:stage.parentElement});
  }
  for (const [from,to] of edges) {
    const outgoing = slides.querySelector(':scope > '+from);
    const incoming = outgoing?.nextElementSibling;
    if (!incoming?.matches(to)) continue;
    extend(outgoing,'exit');
    const stage = extend(incoming,'entry');
    if (incoming.matches('#coins,.book-chapter.has-spending,#spending,.ending-chapter,#office')) fades.push({section:incoming,stage});
  }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  function update() {
    for (const {section,stage,track} of fades) {
      const top = section.getBoundingClientRect().top;
      const progress = 1-top/Math.max(1,stage.clientHeight);
      const entersFromBook = section.matches('.ending-chapter, #office');
      const opacity = entersFromBook ? ease(.64,1.02,progress) : ease(.03,.96,progress);
      (track || stage).style.opacity = reduced.matches ? '' : opacity;
      if (entersFromBook) stage.style.setProperty('--office-entry-y', reduced.matches ? '0%' : `${(1-opacity)*14}%`);
    }
  }
  window.addEventListener('scroll',update,{passive:true,signal});
  window.addEventListener('resize',update,{signal});
  reduced.addEventListener('change',update,{signal});
  update();
}
