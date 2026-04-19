// screens/search.js
import { search, getStatutGlobal, STATUT_COLOR, buildSearchIndex } from '../db.js';
import { navigate, goBack, registerScreen } from '../router.js';
import { renderVocabCard } from '../components/card-vocab.js';
import { renderKanjiCard }  from '../components/card-kanji.js';
import { ICONS } from '../icons.js';

let _type = 'vocab';
let _debounce = null;

export function initSearch() {
  registerScreen('screen-search', { enter: enterSearch });
  document.getElementById('search-back').onclick = () => goBack();
  document.getElementById('search-toggle-vocab').onclick = () => setType('vocab');
  document.getElementById('search-toggle-kanji').onclick = () => setType('kanji');
  document.getElementById('search-input').oninput = () => {
    clearTimeout(_debounce);
    _debounce = setTimeout(doSearch, 200);
  };
}

async function enterSearch(state, isBack) {
  await buildSearchIndex();
  // Ne réinitialiser le type qu'à la première entrée, pas au retour
  if (!isBack) setType('vocab');
  else doSearch();
}

function setType(t) {
  _type = t;
  document.getElementById('search-toggle-vocab').classList.toggle('active', t === 'vocab');
  document.getElementById('search-toggle-kanji').classList.toggle('active', t === 'kanji');
  doSearch();
}

function doSearch() {
  const q = document.getElementById('search-input').value;
  const results = search(q, _type);
  renderResults(results, q);
}

function renderResults(results, q) {
  const list = document.getElementById('search-list');
  const hint = document.getElementById('search-hint');
  hint.textContent = q
    ? `${results.length} résultat${results.length !== 1 ? 's' : ''}`
    : `${results.length} entrée${results.length !== 1 ? 's' : ''} · kanji, sens, romaji, hiragana`;

  if (!results.length) {
    list.innerHTML = '<p style="padding:16px 20px;font-size:13px;color:var(--gray)">Aucun résultat</p>';
    return;
  }

  list.innerHTML = results.slice(0, 100).map(e => {
    const sg    = getStatutGlobal(e);
    const color = STATUT_COLOR[sg] || STATUT_COLOR.noncommence;
    const mot   = e.mot || e.kanji || '';
    const sens  = (e.traductions || e.sens || [])[0] || '';
    const hira  = [e.hiragana, e.romaji].filter(Boolean).join(' · ');
    return `
      <div class="list-item" data-key="${mot}" data-ktype="${e.type || 'vocab'}">
        <span class="kanji">${mot}</span>
        <div class="info">
          <div class="main">${sens}</div>
          <div class="sub">${hira}</div>
        </div>
        <span class="dot" style="background:${color}"></span>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.list-item').forEach(item => {
    item.onclick = () => {
      const key = item.dataset.key;
      const ktype = item.dataset.ktype;
      // Push transition depuis la recherche
      navigate('screen-fiche', { key, ktype });
    };
  });
}
