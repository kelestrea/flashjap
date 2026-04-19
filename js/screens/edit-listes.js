// screens/edit-listes.js
import { getAllListes, getVocab, getKanji, putVocab, putKanji, esc } from '../db.js';
import { navigate, goBack, registerScreen } from '../router.js';

let _entry  = null;
let _ktype  = null;
let _extraListes = [];

export function initEditListes() {
  registerScreen('screen-edit-listes', { enter: enterEdit });
  document.getElementById('edit-listes-back').onclick = () => goBack();
  document.getElementById('edit-listes-save').onclick = () => saveListes();
  document.getElementById('edit-listes-add').onclick  = () => addNewListe();
  document.getElementById('edit-listes-new').addEventListener('keydown', e => {
    if (e.key === 'Enter') addNewListe();
  });
}

async function enterEdit({ key, ktype }) {
  _ktype = ktype;
  _entry = ktype === 'kanji' ? await getKanji(key) : await getVocab(key);
  _extraListes = [];
  await renderListes();
}

async function renderListes() {
  const all     = await getAllListes();
  const current = _entry?.listes || [];
  const extra   = _extraListes.filter(l => !all.includes(l));
  const combined = [...all, ...extra];

  document.getElementById('edit-listes-list').innerHTML = combined.map(l => `
    <label class="check-item">
      <input type="checkbox" name="edit-liste" value="${esc(l)}"
        ${current.includes(l) ? 'checked' : ''}
        style="accent-color:var(--blue);width:16px;height:16px;margin-top:2px;">
      <span>${esc(l)}</span>
    </label>
  `).join('');
}

function addNewListe() {
  const input = document.getElementById('edit-listes-new');
  const val   = input.value.trim();
  if (!val) return;
  _extraListes.push(val);
  input.value = '';
  renderListes();
}

async function saveListes() {
  const checked = [...document.querySelectorAll('[name="edit-liste"]:checked')].map(c => c.value);
  if (!checked.length) { goBack(); return; } // rien coché → pas de sauvegarde

  // Retirer "automatique" si d'autres listes présentes
  const listes = checked.filter(l => l !== 'automatique').length > 0
    ? checked.filter(l => l !== 'automatique')
    : checked;

  const updated = { ..._entry, listes };
  if (_ktype === 'kanji') await putKanji(updated);
  else await putVocab(updated);

  goBack();
}
