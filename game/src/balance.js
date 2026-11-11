// Балансный бот: играет раунды движком игры и считает, сколько марок набирают
// игроки разного уровня. В игре не используется, только для подбора цифр.
// Запуск в консоли браузера на странице игры:
//   const b = await import('./src/balance.js'); b.report()
import { ROUND as R, POSTCARDS, ATTEMPTS_PER_DAY } from './config.js';
import { createRound, step } from './engine.js';

export const SKILLS = {
  casual: { reaction: .42, noise: 30, label: 'Новичок' },
  average: { reaction: .32, noise: 21, label: 'Средний' },
  good: { reaction: .24, noise: 13, label: 'Сильный' },
};

function rng(seed) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
}
function gauss(r) { return Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r()); }

export function playRound(skill, seed = 1) {
  const random = rng(seed), noiseRng = rng(seed ^ 0x9e3779b9);
  const s = createRound(random);
  const dt = 1 / 120;
  let thinkIn = 0, target = null, noise = 0;
  const xAt = (it, t) => Math.max(48, Math.min(R.width - 48, it.baseX + Math.sin(it.phase + t * it.swayFreq) * it.sway));
  const eta = it => (R.catchY - (it.y + it.height / 2)) / it.speed;
  while (!s.finished) {
    thinkIn -= dt;
    if (thinkIn <= 0) {
      thinkIn = skill.reaction * (.7 + noiseRng() * .6);
      noise = gauss(noiseRng) * skill.noise;
      const hazards = s.items.filter(i => i.hazard && eta(i) > -.1);
      const candidates = s.items
        .filter(i => !i.hazard && eta(i) > skill.reaction * .5)
        .filter(i => !hazards.some(h => Math.abs(eta(h) - eta(i)) < .4 && Math.abs(h.x - i.x) < 125))
        .filter(i => !s.puddles.some(p => !p.triggered && Math.abs(p.x - i.x) < 60))
        .sort((a, b) => (eta(a) - (a.express ? .4 : 0)) - (eta(b) - (b.express ? .4 : 0)));
      target = candidates[0] || null;
    }
    if (target && !s.items.includes(target)) target = null;
    // Клякса вот-вот заденет тело — уворачиваемся, даже если гнались за маркой.
    const danger = s.items.find(i => i.hazard && eta(i) < (target ? .35 : .6) && eta(i) > -.4 && Math.abs(i.x - s.playerX) < 120);
    if (danger) s.targetX = danger.x < R.width / 2 ? danger.x + 190 : danger.x - 190;
    else if (target) s.targetX = xAt(target, s.elapsed - skill.reaction) + noise;
    step(s, dt);
  }
  return { score: s.score, caught: s.caught, missed: s.missed, hits: s.hits };
}

export function simulate(skill, rounds = 400) {
  const scores = [];
  for (let i = 0; i < rounds; i++) scores.push(playRound(skill, 1000 + i * 7919).score);
  scores.sort((a, b) => a - b);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  return { mean: Math.round(mean * 10) / 10, p10: scores[Math.floor(rounds * .1)], median: scores[Math.floor(rounds / 2)], p90: scores[Math.floor(rounds * .9)] };
}

export function report(rounds = 400) {
  const out = {};
  for (const [key, skill] of Object.entries(SKILLS)) {
    const st = simulate(skill, rounds);
    const final = POSTCARDS.at(-1).threshold;
    out[key] = { ...st, roundsToAll: Math.ceil(final / st.mean), daysToAll: Math.round(final / st.mean / ATTEMPTS_PER_DAY * 10) / 10 };
  }
  return out;
}
