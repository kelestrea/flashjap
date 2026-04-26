// global-header.js - Global header bar with toggles + home button
import { navigate } from './router.js';
import { getSelectedType, setSelectedType } from './type-state.js';

export function initGlobalHeader() {
  const screens = document.querySelectorAll('.screen');
  screens.forEach(screen => {
    const topbar = screen.querySelector('.topbar');
    if (!topbar) return;

    const isHome = screen.id === 'screen-home';

    // Add home button to topbar (inert on screen-home)
    const homeBtn = document.createElement('button');
    homeBtn.className = 'topbar-home-btn' + (isHome ? ' inert' : '');
    homeBtn.textContent = 'Accueil';
    if (!isHome) homeBtn.addEventListener('click', () => navigate('screen-home'));
    topbar.appendChild(homeBtn);

    // Add full-width toggle bar below topbar
    const bar = createToggleBar();
    topbar.insertAdjacentElement('afterend', bar);
    attachToggleEvents(bar);

    const topbarHeight = topbar.offsetHeight;
    bar.style.setProperty('--global-header-top', topbarHeight + 'px');
  });

  window.addEventListener('type-changed', updateAllToggles);
}

function createToggleBar() {
  const bar = document.createElement('div');
  bar.className = 'global-header';
  bar.innerHTML = `
    <div class="toggle">
      <button class="toggle-btn active" data-type="vocab">Vocab</button>
      <button class="toggle-btn" data-type="kanji">Kanjis</button>
    </div>
  `;
  return bar;
}

function attachToggleEvents(bar) {
  bar.querySelectorAll('[data-type]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      setSelectedType(e.target.dataset.type);
      updateAllToggles();
      window.dispatchEvent(new Event('type-changed'));
    });
  });
}

function updateAllToggles() {
  const type = getSelectedType();
  const toggleBars = document.querySelectorAll('.global-header');
  toggleBars.forEach(bar => {
    const vocabBtn = bar.querySelector('[data-type="vocab"]');
    const kanjiBtn = bar.querySelector('[data-type="kanji"]');
    vocabBtn.classList.toggle('active', type === 'vocab');
    kanjiBtn.classList.toggle('active', type === 'kanji');
  });
}
