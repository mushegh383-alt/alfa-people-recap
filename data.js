import { config } from './config.js';

function assetUrl(value, field) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Missing ${field}`);
  const parsed = new URL(value, document.baseURI);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error(`Invalid ${field}`);
  return parsed.href;
}

export const ZODIAC_SIGNS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];

export function normalizeRecap(input) {
  if (!input || !Number.isSafeInteger(input.year) || input.year < 2000 || input.year > 9999) {
    throw new Error('A four-digit recap year is required');
  }
  if (typeof input.person?.name !== 'string' || !input.person.name.trim()) throw new Error('A name is required');
  if (!Number.isSafeInteger(input.stats?.visits) || input.stats.visits < 0) throw new Error('Invalid visits');
  if (input.ai && [input.ai.requests ?? 543, input.ai.hours ?? 129].some(n => !Number.isSafeInteger(n) || n < 0)) throw new Error("Invalid AI metrics");
  if (input.ai?.agent !== undefined && (typeof input.ai.agent !== "string" || !input.ai.agent.trim())) throw new Error("Invalid AI agent");
  const talkContact=input.talkContact;
  if(talkContact&&(!Number.isSafeInteger(talkContact.hours)||talkContact.hours<0))throw new Error('Invalid contact hours');
  for(const key of ['name','heading','label','note'])if(talkContact?.[key]!==undefined&&(typeof talkContact[key]!=='string'||!talkContact[key].trim()))throw new Error(`Invalid contact ${key}`);
  // Новые данные: просмотры профиля и знак зодиака самых частых собеседников.
  const profileViews = input.profileViews;
  if (profileViews && (!Number.isSafeInteger(profileViews.count) || profileViews.count < 0)) throw new Error('Invalid profile views');
  const zodiac = input.zodiac;
  if (zodiac && !ZODIAC_SIGNS.includes(zodiac.sign)) throw new Error('Invalid zodiac sign');
  if (zodiac?.share !== undefined && (!Number.isFinite(zodiac.share) || zodiac.share < 0 || zodiac.share > 100)) throw new Error('Invalid zodiac share');
  if (zodiac?.others !== undefined && (!Array.isArray(zodiac.others) || zodiac.others.some(o => !ZODIAC_SIGNS.includes(o?.sign)))) throw new Error('Invalid zodiac others');
  for (const [block, name] of [[profileViews, 'profileViews'], [zodiac, 'zodiac']]) for (const key of ['heading', 'kicker', 'label', 'note']) if (block?.[key] !== undefined && (typeof block[key] !== 'string' || !block[key].trim())) throw new Error(`Invalid ${name} ${key}`);
  const income = input.income;
  const moments = input.moments;
  if (moments && (!Number.isSafeInteger(moments.count) || moments.count < 0)) throw new Error('Invalid moments count');
  if (moments?.label !== undefined && (typeof moments.label !== 'string' || !moments.label.trim())) throw new Error('Invalid moments label');
  if (moments?.photos !== undefined && (!Array.isArray(moments.photos) || moments.photos.length > 3)) throw new Error('Invalid moments photos');
  if (income && (!Number.isSafeInteger(income.visits) || income.visits < 0)) throw new Error('Invalid income visits');
  if (income && (!Number.isSafeInteger(income.rank) || income.rank < 1)) throw new Error('Invalid income rank');
  const thanks = input.thanks;
  if (thanks && ['sent', 'received'].some(key => !Number.isSafeInteger(thanks[key]) || thanks[key] < 0)) throw new Error('Invalid thanks count');
  const postcards = input.postcards;
  if (postcards && ['sent', 'received'].some(key => !Number.isSafeInteger(postcards[key]) || postcards[key] < 0)) throw new Error('Invalid postcard count');
  const achievements = input.achievements;
  if (achievements && (!Number.isSafeInteger(achievements.count) || achievements.count < 0)) throw new Error('Invalid achievement count');
  if (achievements?.label !== undefined && (typeof achievements.label !== 'string' || !achievements.label.trim())) throw new Error('Invalid achievement label');
  const coins = input.coins;
  if (coins && (!Number.isSafeInteger(coins.earned) || coins.earned < 0)) throw new Error('Invalid coins earned');
  if (coins?.title !== undefined && (typeof coins.title !== 'string' || !coins.title.trim())) throw new Error('Invalid coins title');
  if (coins?.label !== undefined && (typeof coins.label !== 'string' || !coins.label.trim())) throw new Error('Invalid coins label');
  const spending = input.spending;
  if (spending && (!Number.isSafeInteger(spending.amount) || spending.amount < 0)) throw new Error('Invalid spending amount');
  if (spending?.label !== undefined && (typeof spending.label !== 'string' || !spending.label.trim())) throw new Error('Invalid spending label');
  if (spending?.note !== undefined && typeof spending.note !== 'string') throw new Error('Invalid spending note');
  const learning = input.learning;
  if (learning && (typeof learning !== 'object' || Array.isArray(learning) || ['courses', 'hours'].some(key => !Number.isSafeInteger(learning[key]) || learning[key] < 0))) throw new Error('Invalid learning metrics');
  for (const key of ['title', 'coursesLabel', 'hoursLabel']) if (learning?.[key] !== undefined && (typeof learning[key] !== 'string' || !learning[key].trim())) throw new Error(`Invalid learning ${key}`);
  const parksharing = input.parksharing;
  const carSequence = parksharing?.sequence || { base: './assets/car-sequence/', frameCount: 100, fps: 24, width: 1536, height: 864 };
  if (parksharing && (!Number.isSafeInteger(carSequence.frameCount) || carSequence.frameCount < 1 || carSequence.frameCount > 500)) throw new Error('Invalid car sequence frames');
  if (parksharing && (!Number.isFinite(carSequence.fps) || carSequence.fps < 1 || carSequence.fps > 60)) throw new Error('Invalid car sequence fps');
  if (parksharing && ['width', 'height'].some(key => !Number.isSafeInteger(carSequence[key]) || carSequence[key] < 1 || carSequence[key] > 4096)) throw new Error('Invalid car sequence dimensions');
  const office = input.office;
  const finale = input.finale;
  if (parksharing && (!Number.isSafeInteger(parksharing.trips) || parksharing.trips < 0)) throw new Error('Invalid parksharing trips');
  if (office && (!Number.isSafeInteger(office.visits) || office.visits < 0)) throw new Error('Invalid office visits');
  for (const [name, block, keys] of [['parksharing', parksharing, ['title', 'label']], ['office', office, ['label']], ['finale', finale, ['heading', 'talisman', 'label', 'buttonLabel']]]) {
    if (block && (typeof block !== 'object' || Array.isArray(block))) throw new Error(`Invalid ${name}`);
    for (const key of keys) if (block?.[key] !== undefined && (typeof block[key] !== 'string' || !block[key].trim())) throw new Error(`Invalid ${name}.${key}`);
  }
  const art = {};
  for (const key of ['texture', 'frame', 'character']) art[key] = assetUrl(input.art?.[key], `art.${key}`);
  const intro = input.intro;
  if (intro && intro.mode !== 'video' && (!Number.isSafeInteger(intro.frameCount) || intro.frameCount < 1 || intro.frameCount > 500)) throw new Error('Invalid intro frame count');
  if (intro && intro.mode !== 'video' && (!Number.isFinite(intro.fps) || intro.fps < 1 || intro.fps > 60)) throw new Error('Invalid intro fps');
  if (intro && (!Number.isSafeInteger(intro.mediaYear) || intro.mediaYear < 2000 || intro.mediaYear > 9999)) throw new Error('Invalid intro media year');
  if (intro?.title !== undefined && (typeof intro.title !== 'string' || !intro.title.trim())) throw new Error('Invalid intro title');
  return {
    year: input.year,
    profileViews: profileViews ? {
      count: profileViews.count,
      heading: profileViews.heading || 'на вас смотрят',
      label: profileViews.label || 'Раз смотрели\nваш профиль',
      note: (profileViews.note || 'Кажется, вы звезда офиса.\nИли кто-то ищет ваш номер').replaceAll('{nextYear}', String(input.year + 1)),
    } : null,
    zodiac: zodiac ? {
      sign: zodiac.sign,
      share: zodiac.share ?? null,
      // 2-е и 3-е место: [{ sign, share }].
      others: (zodiac.others || []).slice(0, 2).map(o => ({ sign: o.sign, share: Number.isFinite(o.share) ? o.share : null })),
      kicker: zodiac.kicker || 'Чаще всего вы общались со знаком',
      label: zodiac.label || null,
      note: (zodiac.note || 'Звёзды советуют в {nextYear}:\nменьше созвонов, больше спасибок').replaceAll('{nextYear}', String(input.year + 1)),
    } : null,
    ai: {
      requests: input.ai?.requests ?? 543, hours: input.ai?.hours ?? 129,
      // Хрустальный шар (новый стиль) вместо видео планеты.
      still: input.ai?.still ? assetUrl(input.ai.still, 'ai.still') : null,
      stillMobile: input.ai?.stillMobile ? assetUrl(input.ai.stillMobile, 'ai.stillMobile') : null,
      orb: input.ai?.orb ? assetUrl(input.ai.orb, 'ai.orb') : null,
      orbAlt: input.ai?.orbAlt ? assetUrl(input.ai.orbAlt, 'ai.orbAlt') : null,
      stand: input.ai?.stand ? assetUrl(input.ai.stand, 'ai.stand') : null,
      // Топ-3 агентов: [{ name, cover }]. Старое поле `agent` — первое место.
      agents: (Array.isArray(input.ai?.agents) && input.ai.agents.length ? input.ai.agents : [{ name: input.ai?.agent || "иллюстратор" }])
        .slice(0, 3).filter(a => a && typeof a.name === "string" && a.name.trim())
        .map(a => ({ name: a.name.trim(), cover: a.cover ? assetUrl(a.cover, "ai.agents.cover") : null })),
      get agent() { return this.agents[0]?.name || "иллюстратор"; },
    },
    talkContact:{name:talkContact?.name||'Дмитрий',hours:talkContact?.hours??250,photo:talkContact?.photo==null?null:assetUrl(talkContact.photo,'talkContact.photo'),heading:talkContact?.heading||'Ваш топ собеседник в к-толк',label:talkContact?.label||'Часов вы общались',note:talkContact?.note||'Вот столько часов вы потратили листая\nрилсы на работе'},
    parksharing: parksharing ? {
      trips: parksharing.trips,
      title: parksharing.title || 'паркшеринг',
      label: parksharing.label || 'Вы пользовались\nпаркшерингом',
      note: parksharing.note || '',
      sequence: {
        base: assetUrl(carSequence.base, 'parksharing.sequence.base').replace(/\/?$/, '/'),
        frameCount: carSequence.frameCount, fps: carSequence.fps,
        width: carSequence.width, height: carSequence.height,
      },
    } : null,
    office: office ? { visits: office.visits, label: office.label || 'Вы были в офисе' } : null,
    finale: finale ? {
      heading: (finale.heading || 'Ваш талисман {nextYear} года').replaceAll('{nextYear}', String(input.year + 1)),
      talisman: finale.talisman || 'Гном с сердцем',
      talismanImage: assetUrl(finale.talismanImage || './assets/restyle/gnome-stamp.webp', 'finale.talismanImage'),
      label: finale.label || 'играйте в нашу игру\nи откройте 5 уникальных открыток',
      buttonLabel: finale.buttonLabel || 'играть',
      gameUrl: finale.gameUrl == null ? null : assetUrl(finale.gameUrl, 'finale.gameUrl'),
    } : null,
    spending: spending ? {
      amount: spending.amount,
      label: (spending.label || 'Коинов вы потратили\nв {year} году').replaceAll('{year}', String(input.year)),
      note: (spending.note || '').replaceAll('{year}', String(input.year)),
    } : null,
    learning: learning ? {
      courses: learning.courses, hours: learning.hours,
      title: learning.title || 'Обучение',
      coursesLabel: learning.coursesLabel || 'Курсов вы прошли\nв этом году',
      hoursLabel: learning.hoursLabel || 'Часов вы потратили\nна это',
      video: assetUrl(learning.video || './assets/learning/book-scroll.mp4', 'learning.video'),
      poster: assetUrl(learning.poster || './assets/optimized/image-0a1464bf48ca.webp', 'learning.poster'),
      openPoster: assetUrl(learning.openPoster || './assets/learning/open.jpg', 'learning.openPoster'),
    } : null,
    coins: coins ? {
      earned: coins.earned,
      title: coins.title || 'КОИНЫ',
      label: (coins.label || 'вот столько коинов вы получили\nв {year} году').replaceAll('{year}', String(input.year)),
    } : null,
    intro: intro ? intro.mode === 'video' ? {
      mode: 'video',
      title: intro.title || 'ИТОГИ',
      caption: typeof intro.caption === 'string' ? intro.caption : 'В Alfa people',
      captionArtwork: intro.captionArtwork == null ? null : assetUrl(intro.captionArtwork, 'intro.captionArtwork'),
      mediaYear: intro.mediaYear,
      revealVideo: assetUrl(intro.revealVideo, 'intro.revealVideo'),
      // Без loopVideo вступление останавливается на последнем кадре.
      loopVideo: intro.loopVideo ? assetUrl(intro.loopVideo, 'intro.loopVideo') : null,
      // Вертикальные версии для телефонов (необязательны).
      revealVideoMobile: intro.revealVideoMobile ? assetUrl(intro.revealVideoMobile, 'intro.revealVideoMobile') : null,
      loopVideoMobile: intro.loopVideoMobile ? assetUrl(intro.loopVideoMobile, 'intro.loopVideoMobile') : null,
      poster: assetUrl(intro.poster, 'intro.poster'),
      // Статичная обложка вместо роликов (новый стиль, пока без анимации).
      still: intro.still ? assetUrl(intro.still, 'intro.still') : null,
      stillMobile: intro.stillMobile ? assetUrl(intro.stillMobile, 'intro.stillMobile') : null,
    } : {
      mode: 'sequence',
      title: intro.title || 'ИТОГИ ALFA PEOPLE',
      mediaYear: intro.mediaYear,
      frameCount: intro.frameCount,
      fps: intro.fps,
      frameBase: assetUrl(intro.frameBase, 'intro.frameBase').replace(/\/?$/, '/'),
      poster: assetUrl(intro.poster, 'intro.poster'),
    } : null,
    person: {
      name: input.person.name.trim(),
      photo: assetUrl(input.person.photo, 'person.photo'),
      photoAlt: input.person.photoAlt || input.person.name.trim(),
      photoMode: input.person.photoMode === 'plain' ? 'plain' : 'framed',
    },
    stats: { visits: input.stats.visits },
    moments: moments ? {
      count: moments.count,
      label: moments.label || 'Моментов\nвы опубликовали',
      photos: (Array.isArray(moments.photos) ? moments.photos : []).slice(0, 3).map((src, i) => assetUrl(src, `moments.photos.${i}`)),
      // Звезда в новом стиле одной картинкой (вместо двух SVG с перекраской).
      star: moments.star ? assetUrl(moments.star, 'moments.star') : null,
    } : null,
    achievements: achievements ? {
      count: achievements.count,
      label: achievements.label || 'ачивок вы получили\nв этом году',
    } : null,
    postcards: postcards ? {
      sent: postcards.sent,
      received: postcards.received,
      sentLabel: postcards.sentLabel || 'Открыток вы отправили',
      receivedLabel: postcards.receivedLabel || 'Открыток вы получили',
      video: postcards.video == null ? null : assetUrl(postcards.video, 'postcards.video'),
      poster: postcards.poster == null ? null : assetUrl(postcards.poster, 'postcards.poster'),
      // Статичный конверт вместо ролика (новый стиль, пока без анимации).
      still: postcards.still ? assetUrl(postcards.still, 'postcards.still') : null,
      front: assetUrl(postcards.front, 'postcards.front'),
      alternate: assetUrl(postcards.alternate, 'postcards.alternate'),
    } : null,
    thanks: thanks ? {
      title: thanks.title || 'спасибки',
      sent: thanks.sent,
      received: thanks.received,
      sentLabel: thanks.sentLabel || 'вы отправили',
      receivedLabel: thanks.receivedLabel || 'и получили',
      note: (thanks.note || '').replaceAll('{nextYear}', String(input.year + 1)),
    } : null,
    income: income ? {
      title: typeof income.title === 'string' ? income.title : 'Мой доход',
      rank: income.rank,
      rankLabel: (income.rankLabel || 'ваш топ\u2011{rank} сервис').replaceAll('{rank}', String(income.rank)),
      visits: income.visits,
      caption: (income.caption || 'вы заходили').replaceAll('{year}', String(input.year)),
      note: (income.note || '').replaceAll('{nextYear}', String(input.year + 1)),
      video: income.video == null ? null : assetUrl(income.video, 'income.video'),
      poster: income.poster == null ? null : assetUrl(income.poster, 'income.poster'),
    } : null,
    copy: {
      heading: input.copy?.heading || 'итоги',
      visits: (input.copy?.visits || 'раз вы заходили в Alfa People в {year} году').replaceAll('{year}', String(input.year)),
    },
    art,
  };
}

export async function loadRecap(signal) {
  const response = await fetch(config.dataUrl, { signal, credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Recap request failed: ${response.status}`);
  return normalizeRecap(await response.json());
}
