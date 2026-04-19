// screens/fiche.js — écran plein (push depuis recherche)
import { getVocab, getKanji } from '../db.js';
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

  const container = document.getElementById('fiche-content');

  if (ktype === 'kanji') {
    container.innerHTML = await buildKanjiContent(entry, true);
    // Remplacer le bouton back généré par le composant
    const kpBack = container.querySelector('#kp-back');
    if (kpBack) kpBack.onclick = () => goBack();
    const kpPlay = container.querySelector('#kp-play');
    if (kpPlay) kpPlay.onclick = () => speak(entry.kanji);
  } else {
    // Vocab — version inline (pas overlay)
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
      <div class="section" style="border-bottom:none;">
        <a class="jisho-link" href="https://jisho.org/word/${encodeURIComponent(entry.mot)}" target="_blank" rel="noopener">
          ${ICONS.jisho}<span>Voir sur Jisho</span>${ICONS.linkOut}
        </a>
      </div>
    `;

    document.getElementById('f-play').onclick = () => speak(entry.mot);

    // Charger sens kanjis
    kanjis.forEach(async k => {
      const kData = await getKanji(k);
      const el = document.getElementById(`fkc-${k}`);
      if (el && kData) el.textContent = (kData.sens || []).slice(0,2).join(', ');
    });

    // Clic kanji → push vers fiche kanji
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
