// Прогресс игрока в localStorage: попытки на сегодня, банк марок, незавершённый раунд.
// Попытка списывается в момент старта, поэтому перезагрузка страницы не даёт лишних.
import { ATTEMPTS_PER_DAY, STORAGE_KEY, POSTCARDS } from './config.js';

export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const isCount = n => Number.isSafeInteger(n) && n >= 0;

function normalize(raw, now = new Date()) {
  const day = dayKey(now), today = raw?.day === day;
  return {
    day,
    used: today && Number.isInteger(raw?.used) ? Math.max(0, Math.min(ATTEMPTS_PER_DAY, raw.used)) : 0,
    bank: isCount(raw?.bank) ? raw.bank : 0,
    best: isCount(raw?.best) ? raw.best : 0,
    rounds: isCount(raw?.rounds) ? raw.rounds : 0,
    active: raw?.active?.id ? raw.active : null,
    completed: Array.isArray(raw?.completed) ? raw.completed.filter(x => typeof x === 'string').slice(-100) : [],
  };
}

export function load(store = localStorage, now = new Date()) {
  const text = store.getItem(STORAGE_KEY);
  let raw;
  try { raw = text ? JSON.parse(text) : {}; }
  catch { throw new Error('Не удалось прочитать прогресс. Попробуй перезагрузить страницу.'); }
  return normalize(raw, now);
}

const save = (state, store = localStorage) => (store.setItem(STORAGE_KEY, JSON.stringify(state)), state);
const locked = fn => globalThis.navigator?.locks ? navigator.locks.request(STORAGE_KEY, fn) : Promise.resolve().then(fn);

export const attemptsLeft = state => Math.max(0, ATTEMPTS_PER_DAY - state.used);

export function beginAttempt() {
  return locked(() => {
    const state = load();
    if (state.used >= ATTEMPTS_PER_DAY) return { state, id: null };
    const id = crypto.randomUUID();
    return { state: save({ ...state, used: state.used + 1, active: { id, game: null } }), id };
  });
}

export function saveActive(id, game) {
  return locked(() => {
    const state = load();
    return state.active?.id !== id ? state : save({ ...state, active: { id, game } });
  });
}

export function finishAttempt(id, score) {
  return locked(() => {
    const state = load();
    if (state.completed.includes(id)) return state;
    if (state.active?.id !== id) throw new Error('Попытка уже завершена в другой вкладке. Обнови страницу.');
    if (!isCount(score)) throw new Error('Invalid round score');
    return save({ ...state, bank: state.bank + score, best: Math.max(state.best, score), rounds: state.rounds + 1, active: null, completed: [...state.completed, id].slice(-100) });
  });
}

export const unlocked = bank => POSTCARDS.filter(c => bank >= c.threshold);
export const nextCard = bank => POSTCARDS.find(c => bank < c.threshold);
