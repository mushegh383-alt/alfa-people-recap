import { mountSceneNavigation } from './scene-navigation.js?local=31';
import { mountChapterOverlaps } from './chapter-overlap.js?local=27';
import { startPerformanceMonitor, selectMediaSources, manageVideoMemory, manageSectionMemory } from './performance.js';
import { createEnvelope, mountEnvelope } from './envelope.js?local=28';
import { createNovemberCoins, createNovemberPark } from './november-blocks.js';
import { createSpending } from './blocks/spending.js';
import { mountSpendingMotion } from './spending-motion.js?local=29';
import { mountNovemberScenes } from './november-motion.js?local=29';
import { prepareCarSequence, mountCarSequence } from './sequence-player.js';
import { showLoading, prepareContent, openRecap, showLoadError, onRetry, waitForPreparation } from './preloader.js?local=28';
import { loadRecap, normalizeRecap } from './data.js?local=25';
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
import { createAchievements } from './blocks/achievements.js?local=14';
import { mountAchievementsMotion } from './achievements-motion.js?local=31';
import { createEndingChapter, prepareEndingSeven, prepareFinaleBackdrop, mountEndingMotion } from './ending-seven.js?local=31';
import { toEndingAnchor } from './ending-chapter-layout.js?local=31';
import { createOfficeAnimation } from './office-animation.js';
import { mountEndingMotion as mountOriginalOfficeMotion } from './ending-motion.js';
import { createOpeningStory, mountOpeningStory } from './opening-story.js?local=31';
import { createPlanetStory, preparePlanet } from './planet-story.js?local=30';
import { createMoments, prepareMoments } from './moments.js?local=16';
import { createTalkContact, prepareTalkContact } from './talk-contact.js?local=21';
import { createBookChapter, mountBookChapter } from './learning.js?local=31';
import { createZodiac, createProfileViews, mountSkyScenes } from './sky-scenes.js?local=29';
import { mountTalismanCard } from './talisman-card.js?local=21';
import { isEmptyRecap, createEmptyState, mountEmptyState } from './empty-state.js';

const shell = document.querySelector('#recap-shell');
shell.classList.toggle('is-android', /Android/i.test(navigator.userAgent));
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
    // Нет ни одного блока данных — вместо сцен страница «итогов нет» (проверка: ?empty).
    shell.querySelector('.recap-empty')?.remove();
    shell.classList.remove('is-empty');
    if (isEmptyRecap(data) || new URLSearchParams(location.search).has('empty')) {
      intro.hidden = true; slides.replaceChildren(); canvas.replaceChildren();
      shell.querySelector('.opening-story')?.remove();
      shell.append(createEmptyState(data));
      document.querySelector('.load-error').hidden = true;
      openRecap();
      shell.classList.add('is-ready', 'is-empty');
      mountEmptyState(shell, signal);
      document.dispatchEvent(new CustomEvent('recap:ready', { detail: { year: data.year, empty: true } }));
      return;
    }
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
    const notes = [
      ['.achievement-caption', data.achievements?.note],
      ['.learning-composition', data.learning?.note],
      ['.tower-label, .office-caption', data.office?.note],
    ];
    for (const [selector, text] of notes) {
      const parent = shell.querySelector(selector);
      if (!parent || !text) continue;
      const note = document.createElement('span');
      note.className = 'scene-reading-note';
      note.textContent = text;
      parent.append(note);
    }
    mountChapterOverlaps(slides, signal);
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
    mountSceneNavigation(shell, signal);
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
        const spendingStop = initialAnchor === '#spending' && anchor.matches('.book-chapter') && !matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 1.17 * anchor.querySelector('.book-chapter-stage').clientHeight : 0;
        window.scrollTo({ top: anchor.getBoundingClientRect().top + window.scrollY + spendingStop, behavior: 'instant' });
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
// Backend integrations use the same loading gate when replacing the data.
window.recap = Object.freeze({ update: input => render(input) });
onRetry(() => render());
await render();
