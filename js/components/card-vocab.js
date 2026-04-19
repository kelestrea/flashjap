// components/card-vocab.js
import { getKanji, getStatut, getStatutGlobal, STATUT_COLOR } from '../db.js';
import { speak } from '../audio.js';
import { ICONS } from '../icons.js';
import { openOverlay, closeOverlay } from '../router.js';

const bg      = document.getElementById('overlay-bg');
const sheet   = document.getElementById('overlay-sheet');
const pushBg  = document.getElementById('push-bg');
const pushSheet = document.getElementById('push-sheet');

function statutLabel(s) {
  return { maitrise: 'Maîtrisé', encours: 'En cours', etudie: 'Étudié', noncommence: 'Non commencé' }[s] || '—';
}

function scoreDisplay(score) {
  return score === null || score === undefined ? 'null' : String(score);
}

function buildVocabStats(entry) {
  const sg = getStatutGlobal(entry);
  const color = STATUT_COLOR[sg] || STATUT_COLOR.noncommence;
  const s1 = entry.score_jpfr === null || entry.score_jpfr === undefined ? null : getStatut(entry.score_jpfr);
  const s2 = entry.score_frjp === null || entry.score_frjp === undefined ? null : getStatut(entry.score_frjp);
  return `
    <div class="section">
      <div class="section-label">PROGRESSION</div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
        <span style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0;"></span>
        <span style="font-size:14px;font-weight:500;">${statutLabel(sg)}</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:5px;">
        <div style="display:flex;justify-content:space-between;font-size:13px;">
          <span style="color:var(--gray);">JP → FR</span>
          <span>${scoreDisplay(entry.score_jpfr)} / 5 ${s1 ? '· ' + statutLabel(s1) : ''}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:13px;">
          <span style="color:var(--gray);">FR → JP</span>
          <span>${scoreDisplay(entry.score_frjp)} / 5 ${s2 ? '· ' + statutLabel(s2) : ''}</span>
        </div>
      </div>
    </div>`;
}

function buildKanjiStats(entry) {
  const sg = getStatutGlobal(entry);
  const color = STATUT_COLOR[sg] || STATUT_COLOR.noncommence;
  const fields = [
    { key: 'score_comprehension_jpfr', label: 'Compréhension JP → FR' },
    { key: 'score_comprehension_frjp', label: 'Compréhension FR → JP' },
    { key: 'score_lecture_kun',        label: 'Lecture kun' },
    { key: 'score_lecture_on',         label: 'Lecture on' },
  ];
  return `
    <div class="section">
      <div class="section-label">PROGRESSION</div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
        <span style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0;"></span>
        <span style="font-size:14px;font-weight:500;">${statutLabel(sg)}</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:5px;">
        ${fields.map(f => {
          const score = entry[f.key];
          const s = score === null || score === undefined ? null : getStatut(score);
          return `<div style="display:flex;justify-content:space-between;font-size:13px;">
            <span style="color:var(--gray);">${f.label}</span>
            <span>${scoreDisplay(score)} / 5 ${s ? '· ' + statutLabel(s) : ''}</span>
          </div>`;
        }).join('')}
      </div>
    </div>`;
}

export async function renderVocabCard(entry, returnCb) {
  const kanjis = entry.kanjis_composants || [];
  const kanjiItems = await Promise.all(kanjis.map(async k => {
    const exists = await getKanji(k);
    return { k, exists: !!exists };
  }));

  sheet.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px 12px;border-bottom:0.5px solid var(--border);position:sticky;top:0;background:var(--bg);z-index:1;">
      <p style="font-size:15px;font-weight:500;">Fiche vocabulaire</p>
      <button id="vc-close" class="back-btn" style="color:var(--blue)">${ICONS.close}</button>
    </div>
    <div class="entry-hero">
      <span class="entry-kanji">${entry.mot}</span>
      <button class="icon-btn play-btn" id="vc-play" style="color:var(--blue)">${ICONS.play}</button>
    </div>
    <div class="section">
      <div class="section-label">LECTURE</div>
      <p style="font-size:15px;margin-bottom:2px;">${entry.hiragana || '—'}</p>
      <p style="font-size:13px;color:var(--gray);">${entry.romaji || '—'}</p>
    </div>
    <div class="section">
      <div class="section-label">TRADUCTIONS</div>
      ${(entry.traductions || []).map(t => `<p style="font-size:14px;margin-bottom:3px;">${t}</p>`).join('')}
    </div>
    ${kanjiItems.length ? `
    <div class="section">
      <div class="section-label">KANJIS COMPOSANTS</div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${kanjiItems.map(({ k, exists }) => `
          <button class="kanji-chip${exists ? '' : ' disabled'}" data-kanji="${k}" ${exists ? '' : 'disabled'}>
            <span class="kc-char">${k}</span>
            <span class="kc-sens" id="kc-sens-${k}">…</span>
            ${exists ? ICONS.chevron : '<span style="font-size:11px;color:var(--gray)">Non disponible</span>'}
          </button>`).join('')}
      </div>
    </div>` : ''}
    <div class="section">
      <a class="jisho-link" href="https://jisho.org/word/${encodeURIComponent(entry.mot)}" target="_blank" rel="noopener">
        ${ICONS.jisho}<span>Voir sur Jisho</span>${ICONS.linkOut}
      </a>
    </div>
    ${buildVocabStats(entry)}
  `;

  kanjiItems.forEach(async ({ k, exists }) => {
    if (!exists) return;
    const kData = await getKanji(k);
    const el = document.getElementById(`kc-sens-${k}`);
    if (el && kData) el.textContent = (kData.sens || []).slice(0, 2).join(', ');
  });

  document.getElementById('vc-play').onclick = () => speak(entry.mot);
  document.getElementById('vc-close').onclick = () => { closeOverlay(); if (returnCb) returnCb(); };

  sheet.querySelectorAll('.kanji-chip:not(.disabled)').forEach(btn => {
    btn.onclick = async () => {
      const kData = await getKanji(btn.dataset.kanji);
      if (kData) showKanjiPush(kData);
    };
  });

  openOverlay(sheet, bg);
}

async function showKanjiPush(entry) {
  pushSheet.innerHTML = await buildKanjiContent(entry, true);
  pushBg.classList.add('visible');
  requestAnimationFrame(() => pushSheet.classList.add('visible'));
  pushSheet.querySelector('#kp-play').onclick = () => speak(entry.kanji);
  pushSheet.querySelector('#kp-back').onclick = () => {
    pushSheet.classList.remove('visible');
    pushBg.classList.remove('visible');
  };
}

export async function buildKanjiContent(entry, isPush = false, isScreen = false) {
  const exemples = (entry.exemples || []).slice(0, 3);
  return `
    ${isScreen ? '' : `
    <div style="display:flex;align-items:center;gap:10px;padding:16px 20px 12px;border-bottom:0.5px solid var(--border);position:sticky;top:0;background:var(--bg);z-index:1;">
      ${isPush
        ? `<button id="kp-back" class="back-btn" style="color:var(--blue)">${ICONS.back}</button>`
        : `<button id="kp-close" class="back-btn" style="color:var(--blue)">${ICONS.close}</button>`}
      <p style="font-size:15px;font-weight:500;">Fiche kanji</p>
    </div>`}
    <div class="entry-hero">
      <span class="entry-kanji-lg">${entry.kanji}</span>
      <button class="icon-btn play-btn" id="kp-play" style="color:var(--blue)">${ICONS.play}</button>
    </div>
    <div class="section">
      <div class="section-label">LECTURES</div>
      ${(entry.lectures_kun || []).map((r, i) => `
        <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:5px;">
          <span style="font-size:11px;color:var(--gray);width:28px;">kun</span>
          <span style="font-size:15px;">${r}</span>
          <span style="font-size:13px;color:var(--gray);">· ${(entry.romaji_kun || [])[i] || ''} · ${(entry.sens || []).slice(0,2).join(', ')}</span>
        </div>`).join('')}
      ${(entry.lectures_on || []).map((r, i) => `
        <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:5px;">
          <span style="font-size:11px;color:var(--gray);width:28px;">on</span>
          <span style="font-size:15px;">${r}</span>
          <span style="font-size:13px;color:var(--gray);">· ${(entry.romaji_on || [])[i] || ''} · ${(entry.sens || []).slice(0,2).join(', ')}</span>
        </div>`).join('')}
    </div>
    <div class="section">
      <div class="section-label">SENS</div>
      ${(entry.sens || []).map(s => `<p style="font-size:14px;margin-bottom:3px;">${s}</p>`).join('')}
    </div>
    ${exemples.length ? `
    <div class="section">
      <div class="section-label">EXEMPLES</div>
      ${exemples.map(ex => `
        <div style="margin-bottom:10px;">
          <div style="display:flex;align-items:baseline;gap:8px;">
            <span style="font-size:16px;">${ex.mot}</span>
            <span style="font-size:13px;color:var(--gray);">${ex.hiragana} · ${ex.romaji} · ${ex.sens}</span>
          </div>
        </div>`).join('')}
    </div>` : ''}
    <div class="section">
      <a class="jisho-link" href="https://jisho.org/search/${encodeURIComponent(entry.kanji)}%20%23kanji" target="_blank" rel="noopener">
        ${ICONS.jisho}<span>Voir sur Jisho</span>${ICONS.linkOut}
      </a>
    </div>
    ${buildKanjiStats(entry)}
  `;
}
