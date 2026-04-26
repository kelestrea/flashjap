// global-header.js - Global header bar with toggles + home button
import { navigate } from './router.js';
import { getSelectedType, setSelectedType } from './type-state.js';

export function initGlobalHeader() {
  // Create header bar
  const headerBar = createHeaderBar();

  // Add to all screens (except overlays)
  const screens = document.querySelectorAll('.screen');
  screens.forEach(screen => {
    const topbar = screen.querySelector('.topbar');
    if (topbar) {
      const bar = headerBar.cloneNode(true);
      topbar.insertAdjacentElement('afterend', bar);
      attachHeaderEvents(bar);

      // Set CSS variable for sticky positioning
      const topbarHeight = topbar.offsetHeight;
      bar.style.setProperty('--global-header-top', topbarHeight + 'px');
    }
  });

  // Update toggles on type change
  window.addEventListener('type-changed', updateAllToggles);
}

function createHeaderBar() {
  const bar = document.createElement('div');
  bar.className = 'global-header';
  bar.innerHTML = `
    <div class="toggle">
      <button class="toggle-btn active" data-type="vocab">Vocab</button>
      <button class="toggle-btn" data-type="kanji">Kanjis</button>
    </div>
    <button class="home-btn">Accueil</button>
  `;
  return bar;
}

function attachHeaderEvents(bar) {
  // Toggle buttons
  const toggleBtns = bar.querySelectorAll('[data-type]');
  toggleBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const type = e.target.dataset.type;
      setSelectedType(type);
      updateAllToggles();
      window.dispatchEvent(new Event('type-changed'));
    });
  });

  // Home button
  const homeBtn = bar.querySelector('.home-btn');
  homeBtn.addEventListener('click', () => {
    navigate('screen-home');
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
