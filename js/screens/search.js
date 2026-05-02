// screens/search.js
import { search, getFreqLabel, getStatutGlobal, STATUT_COLOR, buildSearchIndex, esc } from '../db.js';
import { navigate, goBack, registerScreen } from '../router.js';
import { getSelectedType } from '../type-state.js';
import { ICONS } from '../icons.js';

let _excludeAuto = true;
let _debounce    = null;
let _reviewMode  = false;
const PAGE_SIZE  = 50;
let _allResults  = [];
let _page        = 0;

export function initSearch() {
  registerScreen('screen-search', { enter: enterSearch });
  document.getElementById('search-back').onclick = () => goBack();
  document.getElementById('search-input').oninput = () => {
    clearTimeout(_debounce);
    _debounce = setTimeout(doSearch, 200);
  };
  document.getElementById('search-auto-toggle').onclick = () => {
    _excludeAuto = !_excludeAuto;
    const btn = document.getElementById('search-auto-toggle');
    btn.classList.toggle('active', _excludeAuto);
    btn.title = _excludeAuto ? 'Automatique exclus' : 'Automatique inclus';
    doSearch();
  };
  document.getElementById('search-more').onclick = () => { _page++; renderPage(_page); };
  window.addEventListener('type-changed', () => {
    if (_reviewMode) return;
    if (document.getElementById('screen-search').classList.contains('active')) doSearch();
  });
}

async function enterSearch(state) {
  const reviewItems = state && state.importReviewItems;
  const input = document.getElementById('search-input');
  const autoToggle = document.getElementById('search-auto-toggle');

  if (reviewItems) {
    _reviewMode = true;
    input.setAttribute('readonly', '');
    input.value = '';
    input.style.opacity = '0.4';
    autoToggle.style.display = 'none';
    _allResults = reviewItems;
    _page = 0;
    renderPage(0);
  } else {
    _reviewMode = false;
    input.removeAttribute('readonly');
    input.style.opacity = '';
    autoToggle.style.display = '';
    autoToggle.classList.toggle('active', _excludeAuto);
    await buildSearchIndex();
    doSearch();
  }
}

const JLPT_ORDER = ['noncommence', 'etudie', 'encours', 'maitrise'];
const FREQ_LABELS = ['essentiel', 'très courant', 'courant', 'rare', 'inusité'];

function getJlptLevel(entry) {
  for (const l of (entry.listes || [])) {
    const m = l.match(/^JLPT N(\d)$/);
    if (m) return parseInt(m[1], 10);
  }
  return 0;
}

function doSearch() {
  const raw = document.getElementById('search-input').value;
  const type = getSelectedType();

  if (raw.trimStart().startsWith('#')) {
    const label = raw.slice(raw.indexOf('#') + 1).trim().toLowerCase().normalize('NFC');
    if (FREQ_LABELS.includes(label)) {
      const all = search('', type, _excludeAuto);
      _allResults = all.filter(e => getFreqLabel(e.frequence, e.type) === label);
    } else {
      _allResults = [];
    }
  } else {
    _allResults = search(raw, type, _excludeAuto);
  }
  _allResults.sort((a, b) => {
    const jlptDiff = getJlptLevel(b) - getJlptLevel(a);
    if (jlptDiff !== 0) return jlptDiff;
    const freqA = a.frequence ?? Infinity;
    const freqB = b.frequence ?? Infinity;
    if (freqA !== freqB) return freqA - freqB;
    return JLPT_ORDER.indexOf(getStatutGlobal(b)) - JLPT_ORDER.indexOf(getStatutGlobal(a));
  });
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
