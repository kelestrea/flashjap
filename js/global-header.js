// global-header.js - Global header bar with toggles + focus button + home button
import { navigate } from './router.js';
import { getSelectedType, setSelectedType } from './type-state.js';
import { isFocusEnabled, setFocusEnabled, isFocusFilterEmpty } from './focus-state.js';

export function initGlobalHeader() {
  const screens = document.querySelectorAll('.screen');
  screens.forEach(screen => {
    const topbar = screen.querySelector('.topbar');
    if (!topbar) return;

    const isHome = screen.id === 'screen-home';
    const isQuiz = screen.id === 'screen-quiz';
    const isFiche = screen.id === 'screen-fiche';
    const isListSelection = screen.id === 'screen-list-selection';

    // Add home button to topbar on all screens except list-selection (inert on screen-home)
    if (!isListSelection) {
      const homeBtn = document.createElement('button');
      homeBtn.className = 'topbar-home-btn' + (isHome ? ' inert' : '');
      homeBtn.textContent = 'Accueil';
      if (!isHome) homeBtn.addEventListener('click', () => navigate('screen-home'));
      topbar.appendChild(homeBtn);
    }

    // Add full-width toggle bar below topbar (not on screen-quiz nor screen-fiche)
    if (!isQuiz && !isFiche) {
      const bar = createToggleBar();
      topbar.insertAdjacentElement('afterend', bar);
      attachToggleEvents(bar);
      const topbarHeight = topbar.offsetHeight;
      bar.style.setProperty('--global-header-top', topbarHeight + 'px');
    }
  });

  window.addEventListener('type-changed', updateAllToggles);
  window.addEventListener('focus-changed', updateAllFocusToggles);
  updateAllFocusToggles();
}

function createToggleBar() {
  const bar = document.createElement('div');
  bar.className = 'global-header';
  bar.innerHTML = `
    <div class="toggle">
      <button class="toggle-btn active" data-type="vocab">Vocab</button>
      <button class="toggle-btn" data-type="kanji">Kanjis</button>
    </div>
    <button class="focus-btn" data-focus-toggle>Focus</button>
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

  const focusBtn = bar.querySelector('[data-focus-toggle]');
  focusBtn.addEventListener('click', () => {
    if (isFocusFilterEmpty()) return;
    setFocusEnabled(!isFocusEnabled());
    updateAllFocusToggles();
    window.dispatchEvent(new Event('focus-changed'));
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

function updateAllFocusToggles() {
  const enabled = isFocusEnabled();
  const empty   = isFocusFilterEmpty();
  document.querySelectorAll('[data-focus-toggle]').forEach(btn => {
    btn.classList.toggle('focus-btn--active', enabled && !empty);
    btn.disabled = empty;
  });
}
