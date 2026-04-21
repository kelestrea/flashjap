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

function extractCategory(listeName) {
  const match = listeName.match(/^(\S+)/);
  return match ? match[1] : listeName;
}

function groupListesByCategory(listes) {
  const groups = {};
  listes.forEach(liste => {
    const cat = extractCategory(liste);
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(liste);
  });
  return groups;
}

async function renderListes() {
  const all     = await getAllListes();
  const current = _entry?.listes || [];
  const extra   = _extraListes.filter(l => !all.includes(l));
  const combined = [...all, ...extra];
  const groups = groupListesByCategory(combined);
  let categories = Object.keys(groups).sort();
  if (groups['automatique']) {
    categories = categories.filter(c => c !== 'automatique');
    categories.push('automatique');
  }

  const container = document.getElementById('edit-listes-list');
  container.innerHTML = '';

  categories.forEach(category => {
    const categoryDiv = document.createElement('div');
    categoryDiv.className = 'edit-category';
    categoryDiv.dataset.category = category;

    const header = document.createElement('div');
    header.className = 'edit-category-header';
    header.innerHTML = `
      <button class="category-toggle" data-category="${category}">
        <span class="category-name">${esc(category)}</span>
        <span class="category-chevron">▼</span>
      </button>
      <div class="category-actions">
        <button class="select-all" data-category="${category}" title="Tout cocher">
          <span>✓</span>
        </button>
        <button class="deselect-all" data-category="${category}" title="Tout décocher">
          <span>✗</span>
        </button>
      </div>
    `;

    const content = document.createElement('div');
    content.className = 'edit-category-content';
    content.style.display = 'block';

    groups[category].forEach(liste => {
      const label = document.createElement('label');
      label.className = 'check-item';
      label.innerHTML = `
        <input type="checkbox" name="edit-liste" value="${esc(liste)}"
          ${current.includes(liste) ? 'checked' : ''}
          style="accent-color:var(--blue);width:16px;height:16px;margin-top:2px;">
        <span>${esc(liste)}</span>
      `;
      content.appendChild(label);
    });

    categoryDiv.appendChild(header);
    categoryDiv.appendChild(content);
    container.appendChild(categoryDiv);

    const chevron = header.querySelector('.category-chevron');
    chevron.style.transform = 'rotate(0deg)';

    header.querySelector('.category-toggle').addEventListener('click', (e) => {
      e.preventDefault();
      const isOpen = content.style.display === 'block';
      content.style.display = isOpen ? 'none' : 'block';
      chevron.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
    });

    header.querySelector('.select-all').addEventListener('click', (e) => {
      e.preventDefault();
      content.querySelectorAll('input[name="edit-liste"]').forEach(cb => cb.checked = true);
    });

    header.querySelector('.deselect-all').addEventListener('click', (e) => {
      e.preventDefault();
      content.querySelectorAll('input[name="edit-liste"]').forEach(cb => cb.checked = false);
    });
  });
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
