// Local second draft. The first preliminary is preserved in ../versions/.
export function createIncome(data) {
  const section = document.createElement('section');
  section.className = 'income-glass';
  section.id = 'income';
  section.setAttribute('aria-labelledby', 'income-heading');
  section.innerHTML = `
    <div class="income-glass-viewport">
      <div class="income-glass-arrival" aria-hidden="true"></div>
      <canvas class="income-glass-canvas" aria-hidden="true"></canvas>
      <div class="income-glass-stage">
        <div class="income-glass-fallback-world" aria-hidden="true">
          <div class="income-glass-fallback">
            <span class="income-glass-fallback-number"></span>
            <span class="income-glass-fallback-caption"></span>
          </div>
        </div>
        <div class="income-glass-world" aria-hidden="true">
          <div class="income-glass-cap">
            <div class="income-glass-cap-source">
              <img src="./assets/income-glass/cap-base.png" width="1668" height="1031.271" alt="" />
              <img src="./assets/optimized/image-7d77852f9d2d.webp" width="1668" height="1031.271" alt="" />
            </div>
          </div>
        </div>
        <p class="income-glass-rank"></p>
        <h2 id="income-heading" class="income-glass-title"></h2>
      </div>
      <p class="sr-only income-glass-summary"></p>
    </div>`;
  const { income } = data;
  section.querySelector('.income-glass-title').textContent = income.title;
  section.querySelector('.income-glass-rank').textContent = income.rankLabel;
  section.querySelector('.income-glass-summary').textContent = `${income.visits} — ${income.caption}`;
  section.querySelector('.income-glass-fallback-caption').textContent = income.caption;
  section.dataset.value = String(income.visits);
  section.dataset.caption = income.caption;
  return section;
}
