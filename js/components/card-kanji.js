// components/card-kanji.js
import { speak } from '../audio.js';
import { ICONS } from '../icons.js';
import { openOverlay, closeOverlay } from '../router.js';
import { buildKanjiContent } from './card-vocab.js';

const bg    = document.getElementById('overlay-bg');
const sheet = document.getElementById('overlay-sheet');

export async function renderKanjiCard(entry, returnCb) {
  sheet.innerHTML = await buildKanjiContent(entry, false);

  document.getElementById('kp-play').onclick  = () => speak(entry.kanji);
  document.getElementById('kp-close').onclick = () => {
    closeOverlay();
    if (returnCb) returnCb();
  };

  openOverlay(sheet, bg);
}
