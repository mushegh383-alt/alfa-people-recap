// Чистая симуляция раунда: без DOM, детерминирована при заданном random.
// Её же гоняет балансный бот (src/balance.js).
import { ROUND as R, DIFFICULTY as D, MECHANICS, STAMPS } from './config.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export function phaseAt(t) {
  const p = clamp(t / R.duration, 0, 1);
  const g = 1 - Math.pow(1 - p, 1.45);
  const level = 1 + MECHANICS.filter(m => t >= m.at).length;
  return {
    level,
    speed: D.speed[0] + D.speed[1] * g,
    interval: D.interval[0] - D.interval[1] * g,
    hazardChance: t < 3 ? 0 : D.hazard[0] + D.hazard[1] * g,
    sway: D.sway[0] + D.sway[1] * g,
    label: level === 1 ? 'Ловите марки' : MECHANICS[level - 2].title,
  };
}

export function windAt(t) {
  if (t < 8) return { direction: 0, strength: 0, warning: false };
  const cycle = Math.floor((t - 8) / 15), local = (t - 8) % 15, dir = cycle % 2 ? -1 : 1;
  if (local < 1.2) return { direction: dir, strength: 0, warning: true };
  if (local >= 4.7) return { direction: 0, strength: 0, warning: false };
  return { direction: dir, strength: Math.sin((local - 1.2) / 3.5 * Math.PI), warning: false };
}

export function createRound(random = Math.random) {
  return {
    random, elapsed: 0, spawnIn: .15, nextId: 1, nextWaveAt: 19.2, nextExpressAt: 31,
    playerX: R.width / 2, targetX: R.width / 2,
    score: 0, caught: 0, missed: 0, hits: 0, streak: 0, bestStreak: 0,
    collection: STAMPS.map(() => 0), items: [], puddles: [], effects: [],
    feedback: '', feedbackUntil: 0, hitUntil: 0, catchUntil: 0, waves: 0, expressCaught: 0, finished: false,
  };
}

export function restoreRound(saved) {
  if (!saved || !Number.isFinite(saved.elapsed) || saved.elapsed < 0 || saved.elapsed > R.duration
    || !Array.isArray(saved.items) || !Array.isArray(saved.collection)) return null;
  return { ...createRound(), ...saved, random: Math.random, effects: [], finished: saved.elapsed >= R.duration };
}

export function serializeRound(s) {
  const { random, effects, ...rest } = s;
  return rest;
}

function spawn(s, phase, opts = {}) {
  const hazard = opts.hazard ?? s.random() < phase.hazardChance;
  const express = !!opts.express;
  let x = opts.x ?? 62 + s.random() * (R.width - 124);
  const speed = phase.speed * (opts.wave ? 1 : .92 + s.random() * .16) * (express ? 1.45 : 1);
  const eta = (R.catchY + 90) / speed;
  if (!opts.wave) {
    // Не ставим марку и кляксу так, чтобы их было невозможно развести.
    const clash = s.items.find(o => o.hazard !== hazard && Math.abs((R.catchY - o.y) / o.speed - eta) < .65 && Math.abs(o.x - x) < 128);
    if (clash) x = clash.x < R.width / 2 ? R.width - 64 : 64;
  }
  const item = {
    id: s.nextId++, hazard, express, wave: !!opts.wave,
    variant: Math.floor(s.random() * STAMPS.length),
    x, baseX: x, y: -90, previousY: -90, speed, width: 72, height: hazard ? 72 : 96,
    angle: (s.random() - .5) * .6, spin: (s.random() - .5) * .5, phase: s.random() * Math.PI * 2,
    // Марки покачиваются, как падающие листья; кляксы и волна летят ровно.
    sway: hazard || opts.wave ? 0 : phase.sway * (.6 + s.random() * .8),
    swayFreq: 1.5 + s.random() * 1.3,
  };
  s.items.push(item);
  return item;
}

// Столкновение круга предмета с эллипсами тела: эллипс расширяется на радиус предмета.
export function touchesBody(playerX, it) {
  const r = it.hazard ? R.blotRadius : R.stampRadius;
  return R.body.some(e => {
    const dx = (it.x - (playerX + e.x)) / (e.rx + r), dy = (it.y - (R.playerY + e.y)) / (e.ry + r);
    return dx * dx + dy * dy <= 1;
  });
}

function hurt(s, text) {
  s.score = Math.max(0, s.score - R.penalty);
  s.hits++; s.streak = 0;
  s.hitUntil = s.elapsed + .55;
  s.feedback = text; s.feedbackUntil = s.elapsed + 1.6;
}

function collect(s, item) {
  if (item.hazard) hurt(s, 'Клякса');
  else {
    const value = item.express ? 3 : 1;
    s.score += value; s.caught++; s.streak++;
    s.bestStreak = Math.max(s.bestStreak, s.streak);
    s.collection[item.variant]++;
    s.catchUntil = s.elapsed + .25;
    // Всплывающие надписи — только из таблицы текстов: «Клякса», «Почтовая волна», «Супермарка».
    if (item.express) { s.expressCaught++; s.feedback = 'Супермарка'; s.feedbackUntil = s.elapsed + 1.6; }
  }
  s.effects.push({ id: item.id, x: item.x, y: Math.min(item.y, R.catchY) - 30, age: 0, hazard: item.hazard, text: item.hazard ? '−5' : item.express ? '+3' : '+1' });
}

function addPuddle(s, x) {
  const near = s.puddles.find(p => Math.abs(p.x - x) < 110);
  if (near) { near.expires = s.elapsed + 2.4; return; }
  s.puddles.push({ id: s.nextId++, x, born: s.elapsed, armed: s.elapsed + .4, expires: s.elapsed + 2.4, triggered: false });
  if (s.puddles.length > 2) s.puddles.shift();
}

export function step(s, dt, keyDir = 0) {
  if (s.finished) return;
  const h = Math.min(Math.max(0, dt), R.duration - s.elapsed);
  if (keyDir) s.targetX += keyDir * 600 * h;
  s.targetX = clamp(s.targetX, R.playerWidth * .43, R.width - R.playerWidth * .43);
  s.playerX += (s.targetX - s.playerX) * (1 - Math.exp(-h * 25));
  s.elapsed += h;
  const phase = phaseAt(s.elapsed), wind = windAt(s.elapsed);
  s.spawnIn -= h;
  if (s.elapsed < R.duration - 2) {
    if (s.elapsed >= s.nextWaveAt) {
      const gap = s.waves++ % 3;
      [90, 270, 450].forEach((x, i) => spawn(s, phase, { x, hazard: i === gap, wave: true }));
      s.nextWaveAt += D.waveEvery; s.spawnIn = 1.05;
      s.feedback = 'Почтовая волна'; s.feedbackUntil = s.elapsed + 1.2;
    }
    if (s.elapsed >= s.nextExpressAt) { spawn(s, phase, { express: true, hazard: false }); s.nextExpressAt += D.expressEvery; }
    while (s.spawnIn <= 0) { spawn(s, phase); s.spawnIn += phase.interval * (.9 + s.random() * .2); }
  }
  s.items = s.items.filter(it => {
    it.previousY = it.y;
    it.y += it.speed * h;
    it.angle += it.spin * h;
    it.baseX = clamp((it.baseX ?? it.x) + wind.direction * wind.strength * 46 * h, 48, R.width - 48);
    it.x = clamp(it.baseX + Math.sin(it.phase + s.elapsed * (it.swayFreq || 0)) * (it.sway || 0), 48, R.width - 48);
    if (touchesBody(s.playerX, it)) { collect(s, it); return false; }
    if (it.hazard && s.elapsed >= 42 && it.y >= 900) { addPuddle(s, it.x); return false; }
    if (it.y > R.height + 100) { if (!it.hazard) { s.missed++; s.streak = 0; } return false; }
    return true;
  });
  s.puddles = s.puddles.filter(p => p.expires > s.elapsed);
  for (const p of s.puddles) {
    if (!p.triggered && s.elapsed >= p.armed && Math.abs(s.playerX - p.x) < 52) {
      p.triggered = true;
      hurt(s, 'Клякса');
      s.effects.push({ id: p.id, x: p.x, y: 880, age: 0, hazard: true, text: '−5' });
    }
  }
  s.effects = s.effects.filter(e => (e.age += h) < .8);
  s.finished = s.elapsed >= R.duration;
}

export function snapshot(s) {
  const phase = phaseAt(s.elapsed);
  return {
    score: s.score,
    remaining: Math.max(0, Math.ceil(R.duration - s.elapsed)),
    level: phase.level, label: phase.label,
    caught: s.caught, missed: s.missed, hits: s.hits, streak: s.streak, bestStreak: s.bestStreak,
    feedback: s.elapsed < s.feedbackUntil ? s.feedback : '',
    wind: windAt(s.elapsed),
    notice: MECHANICS.find(m => s.elapsed >= m.at && s.elapsed < m.at + 2.7) || null,
    finished: s.finished,
  };
}

export function stampWord(n) {
  const a = n % 100, b = n % 10;
  if (a >= 11 && a <= 14) return 'марок';
  if (b === 1) return 'марка';
  if (b >= 2 && b <= 4) return 'марки';
  return 'марок';
}
