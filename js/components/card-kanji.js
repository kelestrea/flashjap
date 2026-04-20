// components/card-kanji.js
import { speak } from '../audio.js';
import { ICONS } from '../icons.js';
import { openOverlay, closeOverlay, showPopup } from '../router.js';
import { buildKanjiContent } from './card-vocab.js';
import { deleteKanji } from '../db.js';

const bg    = document.getElementById('overlay-bg');
const sheet = document.getElementById('overlay-sheet');

export async function renderKanjiCard(entry, returnCb) {
  sheet.innerHTML = await buildKanjiContent(entry, false);

  document.getElementById('kp-play').onclick  = () => speak(entry.kanji);
  document.getElementById('kp-close').onclick = () => {
    closeOverlay();
    if (returnCb) returnCb();
  };

  const delBtn = sheet.querySelector('.kp-delete');
  if (delBtn) delBtn.onclick = () => {
    showPopup(`Supprimer le kanji "${entry.kanji}" ?`, async () => {
      await deleteKanji(entry.kanji);
      closeOverlay();
      if (returnCb) returnCb();
    });
  };

  openOverlay(sheet, bg);
}
