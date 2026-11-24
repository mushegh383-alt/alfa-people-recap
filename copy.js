// Все тексты итогов — по таблице «Рекап 2027.xlsx». Склонения считаются от числа.
// {nextYear} — следующий год (поздравления и пожелания), {year} — год итогов.

export function plural(n, [one, few, many]) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b === 1) return one;
  if (b >= 2 && b <= 4) return few;
  return many;
}
// «264» + {раз, раза, раз} + «вы заходили…» → «раза\nвы заходили…». Число и подпись — одно
// предложение («1248 раз смотрели ваш профиль»), поэтому подпись со строчной буквы.
export const countLabel = (n, forms, tail, breakAfterWord = true) => `${plural(n, forms)}${breakAfterWord ? '\n' : ' '}${tail}`;

const TIMES = ['раз', 'раза', 'раз'];
const HOURS = ['час', 'часа', 'часов'];
const COINS = ['коин', 'коина', 'коинов'];

export const LOADING = [
  'Чистим мандарины',
  'Распутываем гирлянды',
  'Наряжаем ёлку',
  'Вырезаем снежинки',
  'Упаковываем подарки',
  'Подписываем открытки',
  'Включаем новогодний плейлист',
  'Проверяем список желаний',
  'Достаём любимые ёлочные игрушки',
  'Загадываем желание',
];
export const SWIPE_HINT = 'Листайте, чтобы узнать, каким был ваш год';

// Плашки на фоне «Спасибок».
export const THANKS_WORDS = [
  'Спасибо', 'От души', 'Выручил', 'Ты супер', 'Отличная идея', 'За совет', 'Восхищаюсь', 'Круто',
  'Легенда', 'Так держать', 'За поддержку', 'На высоте', 'Вау', 'От всего сердца', 'Ценю тебя',
  'Блестящая работа', 'Респект', 'Ты вдохновляешь', 'Топ', 'За находчивость', 'Команда мечты',
  'Хорошая работа', 'Мы это сделали', 'Ни одной правки', 'Вот это сервис', 'С тобой хоть куда',
  'Настоящий профи', 'Пятюню', 'Класс', 'Люблю наш вайб', 'Здорово придумано', 'Огонь',
  'За оперативность', 'Отличный результат', 'Дело сделано', 'Без тебя бы не справились',
  'Очень полезно', 'Ты круче всех', 'Вот это подход', 'В самое сердечко',
];

export const ZODIAC_WISH = {
  aries: 'Пусть в {nextYear} смелости хватит на любые идеи, а бодаться за них не придётся',
  taurus: 'Пусть в {nextYear} всё крепко стоит на ногах: планы, проекты и уверенность в себе',
  gemini: 'Пусть в {nextYear} будет вдвое больше классных идей и столько же возможностей их воплотить',
  cancer: 'Пусть в {nextYear} будет за что крепко ухватиться: интересные проекты и надёжные люди рядом',
  leo: 'Пусть в {nextYear} поводов гордиться собой будет на целый прайд!',
  virgo: 'Пусть в {nextYear} всё задуманное сбывается с точностью до мелочей',
  libra: 'Пусть в {nextYear} на одной чаше весов будут смелые идеи, а на другой — возможности их воплотить',
  scorpio: 'Пусть в {nextYear} всё хорошее крепко держится за вас и даже не думает ускользать',
  sagittarius: 'Пусть в {nextYear} все идеи попадают точно в цель. И желательно с первого раза!',
  capricorn: 'Пусть в {nextYear} покоряются новые вершины, а на каждой ждёт повод для гордости',
  aquarius: 'Пусть в {nextYear} идеи льются рекой, а лучшие быстро превращаются в реальные проекты',
  pisces: 'Пусть в {nextYear} даже в самых новых задачах вы будете чувствовать себя как рыба в воде',
};

export function profileNote(n) {
  if (n <= 200) return 'К вам явно тянутся коллеги';
  if (n <= 400) return 'На ваш профиль любят заглядывать';
  if (n <= 600) return 'Профиль, мимо которого не пройти';
  if (n <= 800) return 'Похоже, у вас есть фан-клуб';
  return 'Кажется, вы звезда офиса!';
}
// В таблице «11–15» и «15 и больше» пересекаются: 15 — ещё третья ступень.
export function achievementNote(n) {
  if (n <= 5) return 'Такие награды просто так не достаются. Отличная работа!';
  if (n <= 10) return 'Кажется, для ваших достижений скоро понадобится отдельная полка!';
  if (n <= 15) return 'Столько поводов собой гордиться — и все заслуженные!';
  return 'Вот это коллекция! Альфа вами гордится';
}

// Финальный экран: помощник на следующий год — по самой яркой метрике пользователя
// (её присылает бэкенд в finale.metric). В таблице тексты двух «Монеткиных» перепутаны
// местами: «не лежали без дела» — про потраченные, «копилка пополнилась» — про полученные.
export const HELPERS = {
  visits: { name: 'Пиплик', text: 'В этом году вы частенько заглядывали в Alfa People. Будем рады видеть вас снова! Пусть в {nextYear} все дороги ведут к чему-то хорошему, а неожиданные повороты приятно удивляют.' },
  thanks: { name: 'Спасибкин', text: 'Столько спасибок за один год — это уже маленькое волшебство! Пусть в {nextYear} всё добро, которым вы делитесь с другими, возвращается к вам вдвойне.' },
  postcards: { name: 'Открыткин', text: 'В этом году вы отправили немало тёплых посланий. Пусть в {nextYear} жизнь почаще присылает вам маленькие поводы для большой радости.' },
  moments: { name: 'Моментик', text: 'В этом году вы собрали целую коллекцию ярких моментов! Пусть в {nextYear} ваша жизнь будет полна историй, которые хочется не только сохранить, но и разделить с другими.' },
  profileViews: { name: 'Звёздочкин', text: 'В этом году вы были настоящей звездой Alfa People! Пусть в {nextYear} ваши таланты замечают, идеи поддерживают, а успехам радуются вместе с вами.' },
  achievements: { name: 'Ачивкин', text: 'В этом году вы особенно знали толк в достижениях! Пусть в {nextYear} вам покоряются новые вершины, а поводов гордиться собой становится только больше.' },
  learning: { name: 'Знайка', text: 'Кажется, за этот год вы успели многое узнать! Пусть в {nextYear} даже самые запутанные вопросы находят простые ответы.' },
  office: { name: 'Дружочек', text: 'Похоже, в этом году вы часто заглядывали в офис! Пусть в {nextYear} удаётся даже то, что раньше казалось сложным, а каждый новый результат напоминает, как много вы можете.' },
  coins: { name: 'Монеткин', text: 'В этом году ваша копилка коинов заметно пополнилась! Пусть в {nextYear} всё хорошее только приумножается, а мечты сбываются одна за другой.' },
  spending: { name: 'Монеткин', text: 'Похоже, в этом году ваши коины не лежали без дела. Пусть в {nextYear} приятные сюрпризы случаются ещё чаще, а самые заветные желания сбываются.' },
};

// Подставляет тексты таблицы в нормализованные данные. Имена (сервис, собеседник,
// ассистенты, знак зодиака) и числа остаются из данных.
export function applyCopy(d) {
  const next = String(d.year + 1), fill = s => s.replaceAll('{nextYear}', next).replaceAll('{year}', String(d.year));
  if (d.intro) { d.intro.title = 'ИТОГИ'; d.intro.caption = 'в Alfa People'; }
  d.copy.visits = countLabel(d.stats.visits, TIMES, 'вы заглядывали\nв Alfa People', false);
  if (d.thanks) Object.assign(d.thanks, { title: 'спасибки', sentLabel: 'отправили', receivedLabel: 'получили', note: '' });
  if (d.postcards) Object.assign(d.postcards, {
    title: 'открытки',
    sentLabel: countLabel(d.postcards.sent, ['открытку', 'открытки', 'открыток'], 'вы отправили'),
    receivedLabel: countLabel(d.postcards.received, ['открытку', 'открытки', 'открыток'], 'вы получили'),
  });
  if (d.moments) Object.assign(d.moments, { title: 'МОМЕНТЫ', label: countLabel(d.moments.count, ['момент', 'момента', 'моментов'], 'вы опубликовали') });
  if (d.income) Object.assign(d.income, {
    title: 'Мой доход',
    rankLabel: `Ваш топ-${d.income.rank} сервис`,
    caption: countLabel(d.income.visits, TIMES, 'вы заходили\nв сервис', false),
    note: '',
  });
  if (d.ai) {
    d.ai.requestsLabel = countLabel(d.ai.requests, TIMES, 'вы обращались\nк искусственному интеллекту в Alfa AI', false);
    d.ai.agents.forEach(a => { a.name = a.name.replace(/(^|[\s-])(\S)/g, (m, s, ch) => s + ch.toUpperCase()); });
    d.ai.agentsLabel = d.ai.agents.length > 1 ? 'AI-ассистенты, которыми вы пользовались чаще всего' : 'AI-ассистент, которым вы пользовались чаще всего';
    d.ai.hoursLabel = countLabel(d.ai.hours, HOURS, 'вы провели\nза компьютером', false);
    d.ai.hoursNote = 'За этими часами — ваши идеи, решения и старания. Спасибо за ваш вклад!';
  }
  if (d.talkContact) Object.assign(d.talkContact, {
    heading: 'Ваш топ-1 собеседник в Толке',
    label: countLabel(d.talkContact.hours, HOURS, 'вы были на связи', false),
    note: 'Похоже, вам всегда есть что обсудить!',
  });
  if (d.zodiac) Object.assign(d.zodiac, { kicker: 'Знак зодиака, с которым\nвы общались чаще всего', note: fill(ZODIAC_WISH[d.zodiac.sign] || '') });
  if (d.profileViews) Object.assign(d.profileViews, {
    heading: 'все взгляды\nна вас',
    label: countLabel(d.profileViews.count, TIMES, 'смотрели\nваш профиль', false),
    note: profileNote(d.profileViews.count),
  });
  if (d.achievements) Object.assign(d.achievements, {
    label: countLabel(d.achievements.count, ['ачивку', 'ачивки', 'ачивок'], 'вы получили'),
    note: achievementNote(d.achievements.count),
  });
  if (d.coins) Object.assign(d.coins, { title: 'коины', label: countLabel(d.coins.earned, COINS, 'вы получили') });
  if (d.spending) Object.assign(d.spending, { title: 'покупки', label: countLabel(d.spending.amount, COINS, 'вы потратили', false), note: '' });
  if (d.learning) Object.assign(d.learning, {
    title: 'обучение',
    coursesLabel: countLabel(d.learning.courses, ['курс', 'курса', 'курсов'], 'вы прошли'),
    hoursLabel: countLabel(d.learning.hours, HOURS, 'вы потратили на это'),
    note: 'Самые лучшие инвестиции — это в знания!',
  });
  if (d.parksharing) Object.assign(d.parksharing, { label: countLabel(d.parksharing.trips, TIMES, 'вы бронировали Паркшеринг'), note: '' });
  if (d.office) Object.assign(d.office, {
    label: countLabel(d.office.visits, TIMES, 'вы были в офисе', false),
    note: 'Здорово, что вы провели столько времени с командой!',
  });
  if (d.finale) {
    const helper = HELPERS[d.finale.metric] || HELPERS.visits;
    Object.assign(d.finale, { heading: fill('Ваш сказочный\nпомощник на {nextYear} год'), talisman: helper.name, wish: fill(helper.text) });
  }
  return keepTogether(d);
}

// «Alfa People» и предлог перед ним не разрываются переносом строки.
function keepTogether(v) {
  if (typeof v === 'string') return v.replace(/(^|\s)([вкс]) Alfa/g, '$1$2\u00a0Alfa').replace(/Alfa (People|AI)/g, 'Alfa\u00a0$1');
  if (v && typeof v === 'object' && !Object.isFrozen(v)) {
    for (const k of Object.keys(v)) {
      const next = keepTogether(v[k]);
      if (next !== v[k]) { try { v[k] = next; } catch { /* поле только для чтения — оставляем */ } }
    }
  }
  return v;
}
