// screens/home.js
import { getAllVocab, getAllKanji, getStatutGlobal, getStatut, STATUT_COLOR, buildSearchIndex } from '../db.js';
import { navigate, registerScreen } from '../router.js';

let _type = 'vocab';
export function getHomeType() { return _type; }

export function initHome() {
  registerScreen('screen-home', { enter: enterHome });
  document.getElementById('home-quiz-btn').onclick    = () => navigate('screen-quiz-params');
  document.getElementById('home-data-btn').onclick    = () => navigate('screen-data');
  document.getElementById('home-search-btn').onclick  = () => navigate('screen-search');
  document.getElementById('home-toggle-vocab').onclick = () => setType('vocab');
  document.getElementById('home-toggle-kanji').onclick = () => setType('kanji');
}

async function enterHome(state, isBack) {
  await buildSearchIndex();
  await renderStats();
}

function setType(t) {
  _type = t;
  document.getElementById('home-toggle-vocab').classList.toggle('active', t === 'vocab');
  document.getElementById('home-toggle-kanji').classList.toggle('active', t === 'kanji');
  renderStats();
}

function makeDonut(svgId, segments, r = 36, sw = 12, size = 90) {
  const cx   = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  let offset = 57; // start at top
  let html = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--bg2)" stroke-width="${sw}"/>`;
  segments.forEach(seg => {
    const arc = total ? seg.value / total * circ : 0;
    if (arc > 0) {
      html += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${seg.color}" stroke-width="${sw}"
        stroke-dasharray="${arc} ${circ - arc}" stroke-dashoffset="${offset}" stroke-linecap="butt"/>`;
      offset -= arc;
    }
  });
  document.getElementById(svgId).innerHTML = html;
}

function subDonut(containerId, labelId, segments, label) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const done  = segments.find(s => s.key === 'maitrise')?.value || 0;
  const pct   = total ? Math.round(done / total * 100) : 0;
  const circ  = 2 * Math.PI * 22;
  let offset  = 35;
  let html    = `<circle cx="28" cy="28" r="22" fill="none" stroke="var(--bg2)" stroke-width="7"/>`;
  segments.forEach(seg => {
    const arc = total ? seg.value / total * circ : 0;
    if (arc > 0) {
      html += `<circle cx="28" cy="28" r="22" fill="none" stroke="${seg.color}" stroke-width="7"
        stroke-dasharray="${arc} ${circ - arc}" stroke-dashoffset="${offset}" stroke-linecap="butt"/>`;
      offset -= arc;
    }
  });
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `
    <div style="position:relative;width:56px;height:56px;flex-shrink:0;">
      <svg width="56" height="56" viewBox="0 0 56 56">${html}</svg>
      <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
        <span style="font-size:10px;font-weight:500;color:var(--blue);">${pct}%</span>
      </div>
    </div>
    <span style="font-size:10px;color:var(--gray);text-align:center;margin-top:4px;">${label}</span>
  `;
}

function countByStatut(entries, scoreKey) {
  let maitrise = 0, encours = 0, etudie = 0, noncommence = 0;
  entries.forEach(e => {
    const s = e[scoreKey] === null || e[scoreKey] === undefined ? 'noncommence' : getStatut(e[scoreKey]);
    if (s === 'maitrise')     maitrise++;
    else if (s === 'encours') encours++;
    else if (s === 'etudie')  etudie++;
    else                      noncommence++;
  });
  return [
    { key: 'maitrise',    value: maitrise,    color: STATUT_COLOR.maitrise },
    { key: 'encours',     value: encours,     color: STATUT_COLOR.encours },
    { key: 'etudie',      value: etudie,      color: STATUT_COLOR.etudie },
    { key: 'noncommence', value: noncommence, color: STATUT_COLOR.noncommence },
  ];
}

async function renderStats() {
  const entries = _type === 'vocab' ? await getAllVocab() : await getAllKanji();
  let maitrise = 0, encours = 0, etudie = 0, noncommence = 0, areviser = 0;
  const THREE_WEEKS = 21 * 24 * 3600 * 1000;
  const now = Date.now();

  entries.forEach(e => {
    const sg = getStatutGlobal(e);
    if (sg === 'maitrise')     maitrise++;
    else if (sg === 'encours') encours++;
    else if (sg === 'etudie')  etudie++;
    else                       noncommence++;
    const vue = Math.min(e.derniere_vue_jpfr || 0, e.derniere_vue_frjp || 0) || 0;
    if (sg !== 'maitrise' || (now - vue) >= THREE_WEEKS) areviser++;
  });

  const total = entries.length;
  const pct   = total ? Math.round(maitrise / total * 100) : 0;

  makeDonut('home-donut', [
    { value: maitrise,    color: STATUT_COLOR.maitrise },
    { value: encours,     color: STATUT_COLOR.encours },
    { value: etudie,      color: STATUT_COLOR.etudie },
    { value: noncommence, color: STATUT_COLOR.noncommence },
  ]);

  document.getElementById('home-pct').textContent       = pct + '%';
  document.getElementById('home-maitrise').textContent  = maitrise;
  document.getElementById('home-encours').textContent   = encours;
  document.getElementById('home-etudie').textContent    = etudie;
  document.getElementById('home-non').textContent       = noncommence;
  document.getElementById('home-areviser').textContent  = areviser;
  document.getElementById('home-total').textContent     = total;

  // Sous-camemberts
  if (_type === 'vocab') {
    subDonut('home-sub-0', null, countByStatut(entries, 'score_lecture'), 'Lecture');
    subDonut('home-sub-1', null, countByStatut(entries, 'score_jpfr'),    'JP→FR');
    subDonut('home-sub-2', null, countByStatut(entries, 'score_frjp'),    'FR→JP');
    const sub3 = document.getElementById('home-sub-3');
    if (sub3) sub3.innerHTML = ''; // case vide
  } else {
    subDonut('home-sub-0', null, countByStatut(entries, 'score_comprehension_jpfr'), 'Comp. JP→FR');
    subDonut('home-sub-1', null, countByStatut(entries, 'score_comprehension_frjp'), 'Comp. FR→JP');
    subDonut('home-sub-2', null, countByStatut(entries, 'score_lecture_kun'),         'Lecture kun');
    subDonut('home-sub-3', null, countByStatut(entries, 'score_lecture_on'),          'Lecture on');
  }
}
