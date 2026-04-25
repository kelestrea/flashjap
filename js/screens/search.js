// screens/search.js
import { search, getStatutGlobal, STATUT_COLOR, buildSearchIndex, esc } from '../db.js';
import { navigate, goBack, registerScreen } from '../router.js';
import { getHomeType } from './home.js';
import { ICONS } from '../icons.js';

let _type       = 'vocab';
let _excludeAuto = true;
let _debounce   = null;
const PAGE_SIZE = 50;
let _allResults = [];
let _page       = 0;

export function initSearch() {
  registerScreen('screen-search', { enter: enterSearch });
  document.getElementById('search-back').onclick = () => goBack();
  document.getElementById('search-toggle-vocab').onclick = () => setType('vocab');
  document.getElementById('search-toggle-kanji').onclick = () => setType('kanji');
  document.getElementById('search-input').oninput = () => {
    clearTimeout(_debounce);
    _debounce = setTimeout(doSearch, 200);
  };
  document.getElementById('search-auto-toggle').onclick = () => {
    _excludeAuto = !_excludeAuto;
    const btn = document.getElementById('search-auto-toggle');
    btn.textContent = _excludeAuto ? 'A' : 'A̶';
    btn.title = _excludeAuto ? 'Automatique exclus' : 'Automatique inclus';
    btn.style.opacity = _excludeAuto ? '0.4' : '1';
    doSearch();
  };
  document.getElementById('search-more').onclick = () => { _page++; renderPage(_page); };
}

async function enterSearch(state, isBack) {
  await buildSearchIndex();
  if (!isBack) {
    _type = getHomeType();
    document.getElementById('search-toggle-vocab').classList.toggle('active', _type === 'vocab');
    document.getElementById('search-toggle-kanji').classList.toggle('active', _type === 'kanji');
  }
  doSearch();
}

function setType(t) {
  _type = t;
  document.getElementById('search-toggle-vocab').classList.toggle('active', t === 'vocab');
  document.getElementById('search-toggle-kanji').classList.toggle('active', t === 'kanji');
  doSearch();
}

function doSearch() {
  const q = document.getElementById('search-input').value;
  _allResults = search(q, _type, _excludeAuto);
  _page = 0;
  renderPage(0);
}

function renderPage(page) {
  const list      = document.getElementById('search-list');
  const hint      = document.getElementById('search-hint');
  const total     = _allResults.length;
  const startIdx  = page * PAGE_SIZE;
  const endIdx    = (page + 1) * PAGE_SIZE;
  const pageItems = _allResults.slice(startIdx, endIdx);

  hint.textContent = `${total} résultat${total !== 1 ? 's' : ''}`;

  const items = pageItems.map(e => {
    const sg    = getStatutGlobal(e);
    const color = STATUT_COLOR[sg] || STATUT_COLOR.noncommence;
    const mot   = e.mot || e.kanji || '';
    const sens  = (e.traductions || e.sens || [])[0] || '';

    let readings = '';
    if (e.type === 'kanji') {
      const kun = e.lectures_kun && e.lectures_kun.length > 0 ? e.lectures_kun[0] : '';
      const on = e.lectures_on && e.lectures_on.length > 0 ? e.lectures_on[0] : '';
      readings = [kun, on].filter(Boolean).join(' · ');
    } else {
      readings = e.hiragana || '';
    }

    return `
      <div class="list-item" data-key="${esc(mot)}" data-ktype="${esc(e.type || 'vocab')}">
        <span class="kanji">${esc(mot)}</span>
        <div class="info">
          <div class="main">${esc(sens)}</div>
          <div class="sub" style="color:var(--gray);">${esc(readings)}</div>
        </div>
        <span class="dot" style="background:${color}"></span>
      </div>`;
  }).join('');

  if (page === 0) {
    list.innerHTML = items || '<p style="padding:16px 20px;font-size:13px;color:var(--gray)">Aucun résultat</p>';
  } else {
    list.insertAdjacentHTML('beforeend', items);
  }

  document.getElementById('search-more-wrap').style.display = endIdx < total ? 'block' : 'none';

  list.querySelectorAll('.list-item').forEach(item => {
    item.onclick = () => navigate('screen-fiche', { key: item.dataset.key, ktype: item.dataset.ktype });
  });
}
