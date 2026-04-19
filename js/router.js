// router.js — Navigation SPA avec pile d'état
const stack = [];
const screens = {};
let overlayStack = [];

export function registerScreen(id, { enter, leave } = {}) {
  screens[id] = { enter, leave };
}

export function navigate(id, state = {}, transition = 'push') {
  const prev = stack[stack.length - 1];

  // Désactiver l'écran précédent
  if (prev) {
    const el = document.getElementById(prev.id);
    if (el) {
      el.classList.remove('active');
      if (transition === 'push') el.classList.add('prev');
    }
    if (screens[prev.id]?.leave) screens[prev.id].leave();
  }

  stack.push({ id, state });

  const el = document.getElementById(id);
  if (el) {
    el.classList.remove('prev');
    requestAnimationFrame(() => el.classList.add('active'));
  }
  if (screens[id]?.enter) screens[id].enter(state);
}

export function goBack() {
  // Fermer overlay en priorité
  if (overlayStack.length) {
    closeOverlay();
    return;
  }
  if (stack.length <= 1) return;

  const current = stack.pop();
  const prev    = stack[stack.length - 1];

  const elCurrent = document.getElementById(current.id);
  const elPrev    = document.getElementById(prev.id);

  if (elCurrent) {
    elCurrent.classList.remove('active');
    // Retirer après animation
    setTimeout(() => elCurrent.classList.remove('prev'), 300);
  }
  if (elPrev) {
    elPrev.classList.remove('prev');
    requestAnimationFrame(() => elPrev.classList.add('active'));
  }
  if (screens[current.id]?.leave) screens[current.id].leave();
  if (screens[prev.id]?.enter)    screens[prev.id].enter(prev.state, true);
}

export function currentState() {
  return stack[stack.length - 1]?.state || {};
}

export function replaceState(newState) {
  if (stack.length) stack[stack.length - 1].state = { ...stack[stack.length - 1].state, ...newState };
}

// ── OVERLAYS ────────────────────────────────────────────────────────────
export function openOverlay(sheetEl, bgEl) {
  overlayStack.push({ sheetEl, bgEl });
  bgEl.classList.add('visible');
  requestAnimationFrame(() => sheetEl.classList.add('visible'));

  // Fermer au clic sur le fond
  bgEl.onclick = () => closeOverlay();
}

export function closeOverlay() {
  if (!overlayStack.length) return;
  const { sheetEl, bgEl } = overlayStack.pop();
  sheetEl.classList.remove('visible');
  bgEl.classList.remove('visible');
  bgEl.onclick = null;
}

// ── POPUP CONFIRMATION ───────────────────────────────────────────────────
export function showPopup(msg, onConfirm) {
  const popup  = document.getElementById('popup');
  const pmsg   = document.getElementById('popup-msg');
  const pok    = document.getElementById('popup-ok');
  const pcancel= document.getElementById('popup-cancel');
  pmsg.textContent = msg;
  popup.classList.add('visible');
  pok.onclick = () => { popup.classList.remove('visible'); onConfirm(); };
  pcancel.onclick = () => popup.classList.remove('visible');
}

// ── BACK BUTTON HARDWARE / SWIPE iOS ────────────────────────────────────
window.addEventListener('popstate', () => goBack());
