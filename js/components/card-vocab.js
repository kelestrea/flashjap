// components/card-vocab.js
import { getKanji, getStatut, getStatutGlobal, STATUT_COLOR, esc, getAllListes, putVocab, putKanji } from '../db.js';
import { speak } from '../audio.js';
import { ICONS } from '../icons.js';
import { openOverlay, closeOverlay } from '../router.js';

const bg    = document.getElementById('overlay-bg');
const sheet = document.getElementById('overlay-sheet');

function statutDot(score) {
  if (score === null || score === undefined) return `<span style="width:8px;height:8px;border-radius:50%;background:${STATUT_COLOR.noncommence};display:inline-block;"></span>`;
  const s = getStatut(score);
  return `<span style="width:8px;height:8px;border-radius:50%;background:${STATUT_COLOR[s]||STATUT_COLOR.noncommence};display:inline-block;"></span>`;
}

function scoreVal(score) {
  return (score === null || score === undefined) ? '-' : String(score);
}

function buildVocabStats(entry) {
  const sg    = getStatutGlobal(entry);
  const color = STATUT_COLOR[sg] || STATUT_COLOR.noncommence;
  const labels = { maitrise:'Maîtrisé', encours:'En cours', etudie:'Étudié', noncommence:'Non commencé' };
  const listesStr = esc((entry.listes || []).join(' · '));
  const key = entry.mot || entry.kanji;
  const ktype = entry.type || 'vocab';
  return `
    <div class="section">
      <div class="section-label">PROGRESSION</div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
        <span style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0;"></span>
        <span style="font-size:14px;font-weight:500;">${labels[sg]||'—'}</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:5px;">
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;">
          <span style="color:var(--gray);">Lecture</span>
          <span style="display:flex;align-items:center;gap:6px;">${scoreVal(entry.score_lecture)} / 5 ${statutDot(entry.score_lecture)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;">
          <span style="color:var(--gray);">JP → FR</span>
          <span style="display:flex;align-items:center;gap:6px;">${scoreVal(entry.score_jpfr)} / 5 ${statutDot(entry.score_jpfr)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;">
          <span style="color:var(--gray);">FR → JP</span>
          <span style="display:flex;align-items:center;gap:6px;">${scoreVal(entry.score_frjp)} / 5 ${statutDot(entry.score_frjp)}</span>
        </div>
      </div>
    </div>
    <div class="section" style="border-bottom:none;">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div class="section-label" style="margin:0;">LISTES</div>
        <button class="edit-listes-btn" data-key="${esc(key)}" data-ktype="${esc(ktype)}"
          style="background:none;border:none;cursor:pointer;color:var(--green);font-size:13px;padding:0;">✏️</button>
      </div>
      <p style="font-size:13px;color:var(--gray);margin:6px 0 0;">${listesStr || '—'}</p>
    </div>`;
}

function buildKanjiStats(entry) {
  const sg    = getStatutGlobal(entry);
  const color = STATUT_COLOR[sg] || STATUT_COLOR.noncommence;
  const labels = { maitrise:'Maîtrisé', encours:'En cours', etudie:'Étudié', noncommence:'Non commencé' };
  const listesStr = esc((entry.listes || []).join(' · '));
  const key   = esc(entry.kanji);
  const fields = [
    { key: 'score_comprehension_jpfr', label: 'Compréhension JP→FR' },
    { key: 'score_comprehension_frjp', label: 'Compréhension FR→JP' },
    { key: 'score_lecture_kun',        label: 'Lecture kun' },
    { key: 'score_lecture_on',         label: 'Lecture on' },
  ];
  return `
    <div class="section">
      <div class="section-label">PROGRESSION</div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
        <span style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0;"></span>
        <span style="font-size:14px;font-weight:500;">${labels[sg]||'—'}</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:5px;">
        ${fields.map(f => `
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;">
            <span style="color:var(--gray);">${f.label}</span>
            <span style="display:flex;align-items:center;gap:6px;">${scoreVal(entry[f.key])} / 5 ${statutDot(entry[f.key])}</span>
          </div>`).join('')}
      </div>
    </div>
    <div class="section" style="padding-bottom:0;border-bottom:none;">
      <div class="section-label">LISTES</div>
      <p style="font-size:13px;color:var(--gray);margin:0 0 12px 0;">${listesStr || '—'}</p>
      <button class="btn btn-ghost edit-listes-btn" data-key="${key}" data-ktype="kanji" style="font-size:13px;padding:11px;">éditer</button>
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
      <p style="font-size:15px;margin-bottom:2px;">${entry.hiragana||'—'}</p>
      <p style="font-size:13px;color:var(--gray);">${entry.romaji||'—'}</p>
    </div>
    <div class="section">
      <div class="section-label">TRADUCTIONS</div>
      ${(entry.traductions||[]).map(t=>`<p style="font-size:14px;margin-bottom:3px;">${t}</p>`).join('')}
    </div>
    ${kanjiItems.length ? `
    <div class="section">
      <div class="section-label">KANJIS COMPOSANTS</div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${kanjiItems.map(({k,exists})=>`
          <button class="kanji-chip${exists?'':' disabled'}" data-kanji="${k}" ${exists?'':'disabled'}>
            <span class="kc-char">${k}</span>
            <span class="kc-sens" id="kc-sens-${k}">…</span>
            ${exists?ICONS.chevron:'<span style="font-size:11px;color:var(--gray)">Non disponible</span>'}
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

  kanjiItems.forEach(async ({k,exists}) => {
    if (!exists) return;
    const kData = await getKanji(k);
    const el = document.getElementById(`kc-sens-${k}`);
    if (el && kData) el.textContent = (kData.sens||[]).slice(0,2).join(', ');
  });

  document.getElementById('vc-play').onclick  = () => speak(entry.mot);
  document.getElementById('vc-close').onclick = () => { closeOverlay(); if (returnCb) returnCb(); };

  sheet.querySelectorAll('.kanji-chip:not(.disabled)').forEach(btn => {
    btn.onclick = async () => {
      const kData = await getKanji(btn.dataset.kanji);
      if (kData) {
        closeOverlay();
        import('../router.js').then(({ navigate }) => {
          navigate('screen-fiche', { key: btn.dataset.kanji, ktype: 'kanji' });
        });
      }
    };
  });

  openOverlay(sheet, bg);

  // Délégation pour le bouton édition listes
  sheet.addEventListener('click', e => {
    const btn = e.target.closest('.edit-listes-btn');
    if (!btn) return;
    closeOverlay();
    import('../router.js').then(({ navigate }) => {
      navigate('screen-edit-listes', { key: btn.dataset.key, ktype: btn.dataset.ktype });
    });
  }, { once: true });
}

export async function buildKanjiContent(entry, isPush = false, isScreen = false) {
  const exemples = (entry.exemples||[]).slice(0,3);
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
      ${(entry.lectures_kun||[]).map((r,i)=>`
        <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:5px;">
          <span style="font-size:11px;color:var(--gray);width:28px;">kun</span>
          <span style="font-size:15px;">${r}</span>
          <span style="font-size:13px;color:var(--gray);">· ${(entry.romaji_kun||[])[i]||''}</span>
        </div>`).join('')}
      ${(entry.lectures_on||[]).map((r,i)=>`
        <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:5px;">
          <span style="font-size:11px;color:var(--gray);width:28px;">on</span>
          <span style="font-size:15px;">${r}</span>
          <span style="font-size:13px;color:var(--gray);">· ${(entry.romaji_on||[])[i]||''}</span>
        </div>`).join('')}
    </div>
    <div class="section">
      <div class="section-label">SENS</div>
      ${(entry.sens||[]).map(s=>`<p style="font-size:14px;margin-bottom:3px;">${s}</p>`).join('')}
    </div>
    ${exemples.length ? `
    <div class="section">
      <div class="section-label">EXEMPLES</div>
      ${exemples.map(ex=>`
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
