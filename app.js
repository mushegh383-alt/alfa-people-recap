import { startPerformanceMonitor, selectMediaSources, manageVideoMemory, manageSectionMemory } from './performance.js';
import { createEnvelope, mountEnvelope } from './envelope.js';
import { createNovemberCoins, createNovemberPark } from './november-blocks.js';
import { createSpending } from './blocks/spending.js';
import { mountSpendingMotion } from './spending-motion.js';
import { mountNovemberScenes } from './november-motion.js';
import { prepareCarSequence, mountCarSequence } from './sequence-player.js';
import { showLoading, prepareContent, openRecap, showLoadError, onRetry, waitForPreparation } from './preloader.js';
import { loadRecap, normalizeRecap } from './data.js';
import { createHero } from './blocks/hero.js';
import { mountHeroMotion, prepareHeroMotion } from './hero-motion.js';
import { createPersonal } from './blocks/personal.js';
import { mountMotion } from './motion.js';
import { config } from './config.js';
import { createIncome } from './blocks/income.js';
import { mountIncomeGlass, prepareIncomeGlass } from './income-glass-motion.js';
import { createThanks } from './blocks/thanks.js';
import { mountThanksMotion } from './thanks-motion.js';
import { createPostcards } from './blocks/postcards.js';
import { mountPostcardsMotion } from './postcards-motion.js';
import { createAchievements } from './blocks/achievements.js';
import { mountAchievementsMotion } from './achievements-motion.js';
import { createEndingChapter, prepareEndingSeven, prepareFinaleBackdrop, mountEndingMotion } from './ending-seven.js';
import { toEndingAnchor } from './ending-chapter-layout.js';
import { createOfficeAnimation } from './office-animation.js';
import { mountEndingMotion as mountOriginalOfficeMotion } from './ending-motion.js';
import { createOpeningStory, mountOpeningStory } from './opening-story.js';
import { createPlanetStory, preparePlanet } from './planet-story.js';
import { createMoments, prepareMoments } from './moments.js';
import { createTalkContact, prepareTalkContact } from './talk-contact.js';
import { createBookChapter, mountBookChapter } from './learning.js';
import { createZodiac, createProfileViews, mountSkyScenes } from './sky-scenes.js';
import { mountTalismanCard } from './talisman-card.js';

const shell = document.querySelector('#recap-shell');
shell.classList.add('november');
shell.classList.add('revision-six');
let motionController;
let introHeight = 3196;
let initialAnchor = location.hash;
history.scrollRestoration = 'manual';
const canvas = document.createElement('div');
canvas.className = 'recap-canvas';
canvas.style.setProperty('--entrance-duration', `${config.animation.entranceDuration}ms`);
const intro = document.createElement('div');
intro.className = 'recap-intro';
intro.append(canvas);
const slides = document.createElement('div');
slides.className = 'recap-slides';
shell.append(intro, slides);

function resize() {
  const scale = intro.clientWidth / 1920;
  canvas.style.transform = `scale(${scale})`;
  intro.style.height = `${introHeight * scale}px`;
  canvas.style.height = `${introHeight}px`;
}
new ResizeObserver(resize).observe(intro);
resize();

async function render(input) {
  motionController?.abort();
  motionController = new AbortController();
  const signal = motionController.signal;
  showLoading();
  canvas.classList.remove('is-ready');
  shell.classList.remove('is-ready');
  try {
    const data = input === undefined ? await loadRecap(AbortSignal.any([signal, AbortSignal.timeout(30000)])) : normalizeRecap(input);
    canvas.replaceChildren(createHero(data), createPersonal(data));
    slides.replaceChildren();
    shell.querySelector('.opening-story')?.remove();
    const useStory = Boolean(data.income && data.thanks);
    intro.hidden = useStory;
    let story = null;
    if (useStory) {
      story = createOpeningStory(canvas.querySelector('.hero'), canvas.querySelector('.personal'), createIncome(data), createThanks(data), { postcards: data.postcards?.video ? createEnvelope(data) : null, moments: data.moments ? createMoments(data) : null, planet: createPlanetStory(data), contact:createTalkContact(data) });
      shell.prepend(story);
    } else if (data.income) slides.append(createIncome(data));
    introHeight = 3196;
    if (data.thanks && !useStory) slides.append(createThanks(data));
    if (data.postcards && (!useStory || !data.postcards.video)) slides.append(data.postcards.video ? createEnvelope(data) : createPostcards(data));
    // После к-толка: знак зодиака собеседников и просмотры профиля.
    if (data.zodiac) slides.append(createZodiac(data));
    if (data.profileViews) slides.append(createProfileViews(data));
    if (data.achievements) slides.append(createAchievements(data));
    if (data.coins) slides.append(createNovemberCoins(data));
    if (data.learning) slides.append(createBookChapter(data));
    else if (data.spending) slides.append(createSpending(data));
    if (data.coins && data.spending) {
      slides.querySelector('.coins').classList.add('has-spending-next');
    }
    if (data.parksharing) slides.append(createNovemberPark(data));
    slides.append(...createEndingChapter(data));
    selectMediaSources(shell);
    resize();
    await prepareMoments(shell, data, signal);
    await preparePlanet(shell, signal);
    await prepareTalkContact(shell,data,signal);
    await prepareEndingSeven(shell, signal);
    await prepareContent(shell, data, signal);
    await prepareFinaleBackdrop(shell, signal);
    prepareIncomeGlass(shell, signal);
    const office = shell.querySelector('#office');
    await waitForPreparation(Promise.all([
      prepareHeroMotion(shell, data, signal),
      prepareCarSequence(shell, data, signal),
      office?.querySelector('.office-art') ? createOfficeAnimation(office, signal).load() : Promise.resolve(),
    ]), signal);
    if (signal.aborted) return;
    document.querySelector('.load-error').hidden = true;
    openRecap();
    showScrollHint(signal);
    startPerformanceMonitor(signal);
    manageVideoMemory(shell, signal);
    manageSectionMemory(shell, signal);
    canvas.classList.add('is-ready');
    shell.classList.add('is-ready');
    if (!useStory) mountMotion(canvas, signal, shell);
    mountHeroMotion(shell, data, signal);
    const storyMotion = useStory ? mountOpeningStory(story, signal) : null;
    if (!useStory) {
      mountIncomeGlass(shell, signal);
      mountThanksMotion(shell, signal);
    }
    if (data.postcards?.video) { if (!useStory) mountEnvelope(shell, signal); }
    else mountPostcardsMotion(shell, signal);
    mountSkyScenes(shell, signal);
    mountAchievementsMotion(shell, signal);
    mountNovemberScenes(shell, signal);
    mountSpendingMotion(shell, signal);
    mountBookChapter(shell, signal);
    mountCarSequence(shell, data, signal);
    mountEndingMotion(shell, signal);
    mountTalismanCard(shell, data, signal);
    mountOriginalOfficeMotion(shell, signal);
    if (['#learning','#top-contact','#zodiac','#profile-views','#alfa-ai', '#ai-agent', '#talk-time', '#income', '#your-year', '#thanks', '#postcards', '#moments', '#achievements', '#coins', '#spending', '#parksharing', '#office', '#finale'].includes(initialAnchor)) {
      const target = document.querySelector(initialAnchor);
      if (target) requestAnimationFrame(() => {
        if (signal.aborted) return;
        if (storyMotion?.toAnchor(initialAnchor)) { initialAnchor = ''; return; }
        if (toEndingAnchor(shell, initialAnchor)) { initialAnchor = ''; return; }
        const anchor = initialAnchor === '#spending' ? target.closest('.book-chapter') || target : target;
        window.scrollTo({ top: anchor.getBoundingClientRect().top + window.scrollY, behavior: 'instant' });
        initialAnchor = '';
      });
    }
    document.dispatchEvent(new CustomEvent('recap:ready', { detail: { year: data.year } }));
  } catch (error) {
    if (signal.aborted) return;
    motionController.abort();
    showLoadError(error);
  }
}

// Подсказка на первом экране: люди не понимали, что дальше. Исчезает при первом скролле.
function showScrollHint(signal) {
  document.querySelector('.scroll-hint')?.remove();
  if (scrollY > 40) return;
  const touch = matchMedia('(pointer: coarse)').matches;
  const hint = document.createElement('div');
  hint.className = 'scroll-hint'; hint.setAttribute('role', 'note');
  // Тихая подсказка в стиле загрузки: строка текста и линия, по которой бежит красная точка.
  hint.innerHTML = `<span class="scroll-hint-text">листайте — дальше ваши итоги</span><span class="scroll-hint-line" aria-hidden="true"><i></i></span>`;
  hint.classList.toggle('is-touch', touch);
  document.body.append(hint);
  const timer = setTimeout(() => hint.classList.add('is-visible'), 1600);
  const hide = () => { if (scrollY > 40) { hint.classList.remove('is-visible'); hint.classList.add('is-gone'); setTimeout(() => hint.remove(), 600); removeEventListener('scroll', hide); } };
  addEventListener('scroll', hide, { passive: true, signal });
  signal.addEventListener('abort', () => { clearTimeout(timer); hint.remove(); }, { once: true });
}

// Backend integrations use the same loading gate when replacing the data.
window.recap = Object.freeze({ update: input => render(input) });
onRetry(() => render());
await render();
