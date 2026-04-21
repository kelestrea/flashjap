import { getListes } from '../db.js';
import { navigate, goBack, registerScreen, currentState } from '../router.js';
import * as listsState from '../lists-state.js';

let _tempListes = [];
let _allListes = [];
let _type = 'vocab';

function extractCategory(listeName) {
  const match = listeName.match(/^(\S+)/);
  return match ? match[1] : listeName;
}

function categorizeListes(listes) {
  const categories = {};
  listes.forEach(liste => {
    const cat = extractCategory(liste);
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(liste);
  });

  return Object.keys(categories)
    .sort()
    .reduce((acc, cat) => {
      acc[cat] = categories[cat].sort();
      return acc;
    }, {});
}

function renderCategories() {
  const container = document.getElementById('ls-categories');
  container.innerHTML = '';

  const selectedListes = listsState.getSelectedListes();
  const categorized = categorizeListes(_allListes);

  let categories = Object.keys(categorized).sort();
  if (categorized['automatique']) {
    categories = categories.filter(c => c !== 'automatique');
    categories.push('automatique');
  }

  categories.forEach((category) => {
    const listes = categorized[category];
    const categoryDiv = document.createElement('div');
    categoryDiv.className = 'list-category';
    categoryDiv.dataset.category = category;

    const header = document.createElement('div');
    header.className = 'list-category-header';
    header.innerHTML = `
      <button class="category-toggle" data-category="${category}">
        <span class="category-name">${esc(category)}</span>
        <span class="category-chevron">▶</span>
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
    content.className = 'list-category-content';
    content.style.display = 'block';

    listes.forEach(liste => {
      const label = document.createElement('label');
      label.className = 'check-item';
      const isChecked = selectedListes.includes(liste);
      label.innerHTML = `
        <input type="checkbox" name="ls-liste" value="${esc(liste)}" ${isChecked ? 'checked' : ''}>
        <span>${esc(liste)}</span>
      `;
      content.appendChild(label);
    });

    categoryDiv.appendChild(header);
    categoryDiv.appendChild(content);
    container.appendChild(categoryDiv);

    const chevron = header.querySelector('.category-chevron');
    chevron.style.transform = 'rotate(90deg)';

    header.querySelector('.category-toggle').addEventListener('click', (e) => {
      e.preventDefault();
      toggleCategory(category);
    });

    header.querySelector('.select-all').addEventListener('click', (e) => {
      e.preventDefault();
      setAllChecked(category, true);
    });

    header.querySelector('.deselect-all').addEventListener('click', (e) => {
      e.preventDefault();
      setAllChecked(category, false);
    });
  });
}

function toggleCategory(category) {
  const categoryDiv = document.querySelector(`[data-category="${category}"]`);
  const content = categoryDiv.querySelector('.list-category-content');
  const chevron = categoryDiv.querySelector('.category-chevron');
  const isOpen = content.style.display === 'block';

  content.style.display = isOpen ? 'none' : 'block';
  chevron.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(90deg)';
}

function setAllChecked(category, checked) {
  const categoryDiv = document.querySelector(`[data-category="${category}"]`);
  const checkboxes = categoryDiv.querySelectorAll('input[name="ls-liste"]');
  checkboxes.forEach(cb => cb.checked = checked);
}

function getSelectedLists() {
  return [...document.querySelectorAll('input[name="ls-liste"]:checked')].map(cb => cb.value);
}

function validateSelection(selected) {
  if (!selected || selected.length === 0) {
    alert('Au moins une liste doit être sélectionnée');
    return false;
  }
  return true;
}

async function enterListSelection(state) {
  _type = state?.type || 'vocab';
  _tempListes = [...listsState.getSelectedListes()];

  _allListes = await getListes(_type);
  listsState.initializeSelectedListes(_allListes);

  renderCategories();

  document.getElementById('screen-list-selection').style.display = 'flex';
}

function leaveListSelection() {
  document.getElementById('screen-list-selection').style.display = 'none';
}

export function init() {
  const backBtn = document.getElementById('ls-back');
  const validateBtn = document.getElementById('ls-validate');

  if (backBtn) {
    backBtn.addEventListener('click', () => goBack());
  }

  if (validateBtn) {
    validateBtn.addEventListener('click', () => {
      const selected = getSelectedLists();
      if (validateSelection(selected)) {
        listsState.setSelectedListes(selected);
        goBack();
      }
    });
  }

  registerScreen('screen-list-selection', {
    enter: enterListSelection,
    leave: leaveListSelection
  });
}

function esc(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
