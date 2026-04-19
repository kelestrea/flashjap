// screens/fiche.js — écran plein (push depuis recherche)
import { getVocab, getKanji, getStatut, getStatutGlobal, STATUT_COLOR } from '../db.js';
import { goBack, registerScreen } from '../router.js';
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
    // Kanji composant → push
    container.querySelectorAll('.kanji-chip:not(.disabled)').forEach(btn => {
      btn.onclick = async () => {
        const kData = await getKanji(btn.dataset.kanji);
        if (kData) {
          const { navigate } = await import('../router.js');
          navigate('screen-fiche', { key: btn.dataset.kanji, ktype: 'kanji' });
        }
      };
    });
  } else {
    const kanjis = entry.kanjis_composants || [];
    container.innerHTML = `
      <div class="entry-hero">
        <span class="entry-kanji">${entry.mot}</span>
        <button class="icon-btn play-btn" id="f-play" style="color:var(--blue)">${ICONS.play}</button>
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
      ${kanjis.length ? `
      <div class="section">
        <div class="section-label">KANJIS COMPOSANTS</div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${kanjis.map(k => `
            <div class="kanji-chip" data-kanji="${k}">
              <span class="kc-char">${k}</span>
              <span class="kc-sens" id="fkc-${k}">…</span>
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
    `;

    document.getElementById('f-play').onclick = () => speak(entry.mot);

    kanjis.forEach(async k => {
      const kData = await getKanji(k);
      const el = document.getElementById(`fkc-${k}`);
      if (el && kData) el.textContent = (kData.sens || []).slice(0,2).join(', ');
    });

    container.querySelectorAll('.kanji-chip').forEach(btn => {
      btn.onclick = async () => {
        const kData = await getKanji(btn.dataset.kanji);
        if (kData) {
          const { navigate } = await import('../router.js');
          navigate('screen-fiche', { key: btn.dataset.kanji, ktype: 'kanji' });
        }
      };
    });
  }
}

function buildVocabStats(entry) {
  const sg = getStatutGlobal(entry);
  const color = STATUT_COLOR[sg] || STATUT_COLOR.noncommence;
  const labels = { maitrise: 'Maîtrisé', encours: 'En cours', etudie: 'Étudié', noncommence: 'Non commencé' };
  const s1 = entry.score_jpfr === null || entry.score_jpfr === undefined ? null : getStatut(entry.score_jpfr);
  const s2 = entry.score_frjp === null || entry.score_frjp === undefined ? null : getStatut(entry.score_frjp);
  const sd = v => v === null || v === undefined ? 'null' : String(v);
  return `
    <div class="section">
      <div class="section-label">PROGRESSION</div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
        <span style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0;"></span>
        <span style="font-size:14px;font-weight:500;">${labels[sg] || '—'}</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:5px;">
        <div style="display:flex;justify-content:space-between;font-size:13px;">
          <span style="color:var(--gray);">JP → FR</span>
          <span>${sd(entry.score_jpfr)} / 5${s1 ? ' · ' + labels[s1] : ''}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:13px;">
          <span style="color:var(--gray);">FR → JP</span>
          <span>${sd(entry.score_frjp)} / 5${s2 ? ' · ' + labels[s2] : ''}</span>
        </div>
      </div>
    </div>`;
}
