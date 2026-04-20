// screens/fiche.js — écran plein (push depuis recherche)
import { getVocab, getKanji, getStatut, getStatutGlobal, STATUT_COLOR, esc, deleteVocab, deleteKanji } from '../db.js';
import { goBack, navigate, registerScreen, showPopup } from '../router.js';
import { speak } from '../audio.js';
import { buildKanjiContent } from '../components/card-vocab.js';
import { ICONS } from '../icons.js';

export function initFiche() {
  registerScreen('screen-fiche', { enter: enterFiche });
  document.getElementById('fiche-back').onclick = () => goBack();
}

async function enterFiche({ key, ktype }) {
  const entry = ktype === 'kanji' ? await getKanji(key) : await getVocab(key);
  if (!entry) { goBack(); return; }

  document.getElementById('fiche-title').textContent = ktype === 'kanji' ? 'Fiche kanji' : 'Fiche vocabulaire';
  const container = document.getElementById('fiche-content');

  if (ktype === 'kanji') {
    container.innerHTML = await buildKanjiContent(entry, false, true);
    const kpPlay = container.querySelector('#kp-play');
    if (kpPlay) kpPlay.onclick = () => speak(entry.kanji);

    // Bouton édition listes kanji
    container.addEventListener('click', e => {
      const btn = e.target.closest('.edit-listes-btn');
      if (btn) navigate('screen-edit-listes', { key: btn.dataset.key, ktype: btn.dataset.ktype });
    });

    container.querySelectorAll('.kanji-chip:not(.disabled)').forEach(btn => {
      btn.onclick = async () => {
        const kData = await getKanji(btn.dataset.kanji);
        if (kData) navigate('screen-fiche', { key: btn.dataset.kanji, ktype: 'kanji' });
      };
    });

    const delBtn = container.querySelector('.kp-delete');
    if (delBtn) delBtn.onclick = () => {
      showPopup(`Supprimer le kanji "${entry.kanji}" ?`, async () => {
        await deleteKanji(entry.kanji);
        goBack();
      });
    };
  } else {
    const kanjis = entry.kanjis_composants || [];
    container.innerHTML = `
      <div class="entry-hero">
        <span class="entry-kanji">${esc(entry.mot)}</span>
        <button class="icon-btn play-btn" id="f-play" style="color:var(--blue)">${ICONS.play}</button>
      </div>
      <div class="section">
        <div class="section-label">LECTURE</div>
        <p style="font-size:15px;margin-bottom:2px;">${esc(entry.hiragana || '—')}</p>
        <p style="font-size:13px;color:var(--gray);">${esc(entry.romaji || '—')}</p>
      </div>
      <div class="section">
        <div class="section-label">TRADUCTIONS</div>
        ${(entry.traductions || []).map(t => `<p style="font-size:14px;margin-bottom:3px;">${esc(t)}</p>`).join('')}
      </div>
      ${kanjis.length ? `
      <div class="section">
        <div class="section-label">KANJIS COMPOSANTS</div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${kanjis.map(k => `
            <div class="kanji-chip" data-kanji="${esc(k)}">
              <span class="kc-char">${esc(k)}</span>
              <span class="kc-sens" id="fkc-${esc(k)}">…</span>
              ${ICONS.chevron}
            </div>`).join('')}
        </div>
      </div>` : ''}
      <div class="section">
        <a class="jisho-link" href="https://jisho.org/word/${encodeURIComponent(entry.mot)}" target="_blank" rel="noopener">
          ${ICONS.jisho}<span>Voir sur Jisho</span>${ICONS.linkOut}
        </a>
      </div>
      ${buildVocabStats(entry)}
      <div style="padding:16px 20px 32px;">
        <button class="btn btn-danger" id="f-delete" style="width:100%;">Supprimer</button>
      </div>
    `;

    document.getElementById('f-play').onclick = () => speak(entry.mot);
    document.getElementById('f-delete').onclick = () => {
      showPopup(`Supprimer "${entry.mot}" ?`, async () => {
        await deleteVocab(entry.mot);
        goBack();
      });
    };

    // Bouton édition listes vocab
    container.addEventListener('click', e => {
      const btn = e.target.closest('.edit-listes-btn');
      if (btn) navigate('screen-edit-listes', { key: btn.dataset.key, ktype: btn.dataset.ktype });
    });

    kanjis.forEach(async k => {
      const kData = await getKanji(k);
      const el = document.getElementById(`fkc-${k}`);
      if (el && kData) el.textContent = (kData.sens || []).slice(0, 2).join(', ');
    });

    container.querySelectorAll('.kanji-chip').forEach(btn => {
      btn.onclick = async () => {
        const kData = await getKanji(btn.dataset.kanji);
        if (kData) navigate('screen-fiche', { key: btn.dataset.kanji, ktype: 'kanji' });
      };
    });
  }
}

function statutDot(score) {
  if (score === null || score === undefined)
    return `<span style="width:8px;height:8px;border-radius:50%;background:${STATUT_COLOR.noncommence};display:inline-block;"></span>`;
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
  const key   = esc(entry.mot || entry.kanji);
  const ktype = esc(entry.type || 'vocab');
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
    <div class="section" style="padding-bottom:0;border-bottom:none;">
      <div class="section-label">LISTES</div>
      <p style="font-size:13px;color:var(--gray);margin:0 0 12px 0;">${listesStr || '—'}</p>
      <button class="btn btn-ghost edit-listes-btn" data-key="${key}" data-ktype="${ktype}" style="font-size:13px;padding:11px;">éditer</button>
    </div>`;
}
