// components/card-vocab.js
import { getKanji, getStatutGlobal, STATUT_COLOR } from '../db.js';
import { speak } from '../audio.js';
import { ICONS } from '../icons.js';
import { openOverlay, closeOverlay } from '../router.js';
import { renderKanjiCard } from './card-kanji.js';

const bg  = document.getElementById('overlay-bg');
const sheet = document.getElementById('overlay-sheet');

// Push panel pour kanji (par-dessus l'overlay vocab)
const pushBg    = document.getElementById('push-bg');
const pushSheet = document.getElementById('push-sheet');

export async function renderVocabCard(entry, returnCb) {
  const kanjis = entry.kanjis_composants || [];

  // Vérifier existence des kanjis
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
          </button>
        `).join('')}
      </div>
    </div>` : ''}
    <div class="section" style="border-bottom:none;">
      <a class="jisho-link" href="https://jisho.org/word/${encodeURIComponent(entry.mot)}" target="_blank" rel="noopener">
        ${ICONS.jisho}
        <span>Voir sur Jisho</span>
        ${ICONS.linkOut}
      </a>
    </div>
  `;

  // Charger les sens des kanjis composants
  kanjiItems.forEach(async ({ k, exists }) => {
    if (!exists) return;
    const kData = await getKanji(k);
    const el = document.getElementById(`kc-sens-${k}`);
    if (el && kData) el.textContent = (kData.sens || []).slice(0, 2).join(', ');
  });

  // Events
  document.getElementById('vc-play').onclick = () => speak(entry.mot);
  document.getElementById('vc-close').onclick = () => {
    closeOverlay();
    if (returnCb) returnCb();
  };

  // Clic sur kanji composant → push
  sheet.querySelectorAll('.kanji-chip:not(.disabled)').forEach(btn => {
    btn.onclick = async () => {
      const k = btn.dataset.kanji;
      const kData = await getKanji(k);
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

export async function buildKanjiContent(entry, isPush = false) {
  const exemples = (entry.exemples || []).slice(0, 3);
  return `
    <div style="display:flex;align-items:center;gap:10px;padding:16px 20px 12px;border-bottom:0.5px solid var(--border);position:sticky;top:0;background:var(--bg);z-index:1;">
      ${isPush ? `<button id="kp-back" class="back-btn" style="color:var(--blue)">${ICONS.back}</button>` : `<button id="kp-close" class="back-btn" style="color:var(--blue)">${ICONS.close}</button>`}
      <p style="font-size:15px;font-weight:500;">Fiche kanji</p>
    </div>
    <div class="entry-hero">
      <span class="entry-kanji-lg">${entry.kanji}</span>
      <button class="icon-btn play-btn" id="kp-play" style="color:var(--blue)">${ICONS.play}</button>
    </div>
    <div class="section">
      <div class="section-label">LECTURES</div>
      ${(entry.lectures_on || []).map((r, i) => `
        <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:5px;">
          <span style="font-size:11px;color:var(--gray);width:28px;">on</span>
          <span style="font-size:15px;">${r}</span>
          <span style="font-size:13px;color:var(--gray);">· ${(entry.romaji_on || [])[i] || ''}</span>
        </div>`).join('')}
      ${(entry.lectures_kun || []).map((r, i) => `
        <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:5px;">
          <span style="font-size:11px;color:var(--gray);width:28px;">kun</span>
          <span style="font-size:15px;">${r}</span>
          <span style="font-size:13px;color:var(--gray);">· ${(entry.romaji_kun || [])[i] || ''}</span>
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
            <span style="font-size:13px;color:var(--gray);">${ex.hiragana} · ${ex.romaji}</span>
          </div>
          <p style="font-size:12px;color:var(--gray);margin-top:2px;">${ex.sens}</p>
        </div>`).join('')}
    </div>` : ''}
    <div class="section" style="border-bottom:none;">
      <a class="jisho-link" href="https://jisho.org/search/${encodeURIComponent(entry.kanji)}%20%23kanji" target="_blank" rel="noopener">
        ${ICONS.jisho}
        <span>Voir sur Jisho</span>
        ${ICONS.linkOut}
      </a>
    </div>
  `;
}
