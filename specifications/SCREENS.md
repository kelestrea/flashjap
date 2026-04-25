# FlashJap — Architecture des écrans

Ce document détaille tous les écrans de l'application, leur arborescence, et les patterns de navigation. Il complète [SPEC.md](./SPEC.md) qui couvre les modules, le modèle de données et les règles métier.

---

## Vue d'ensemble des écrans

| ID HTML | Fichier JS | Rôle |
|---------|-----------|------|
| `screen-home` | `screens/home.js` | Tableau de bord — point d'entrée principal |
| `screen-quiz-params` | `screens/quiz-params.js` | Configuration du quiz avant lancement |
| `screen-quiz` | `screens/quiz.js` | Boucle de quiz (affichage carte + validation) |
| `screen-results` | `screens/results.js` | Bilan post-session |
| `screen-search` | `screens/search.js` | Recherche full-text paginée |
| `screen-fiche` | `screens/fiche.js` | Détail complet d'une entrée (vocab ou kanji) |
| `screen-data` | `screens/data.js` | Gestion base de données + config TTS |
| `screen-list-selection` | `screens/list-selection.js` | Sélection des listes pour le quiz |
| `screen-import` | `screens/import.js` | Import de données JSON |
| `screen-restore` | `screens/restore.js` | Restauration d'une sauvegarde |
| `screen-edit-listes` | `screens/edit-listes.js` | Édition des listes d'un mot/kanji |

**Éléments UI superposés (non-écrans) :**

| ID HTML | Type | Rôle |
|---------|------|------|
| `overlay-bg` | Fond semi-transparent | Fermeture overlay au clic |
| `overlay-sheet` | Bottom sheet | Fiche vocab ou kanji depuis quiz/résultats |
| `push-sheet` | Bottom sheet (z-index supérieur) | Transition kanji depuis fiche vocab en overlay |
| `popup` | Modal centré | Confirmation destructive (suppression, restauration) |

---

## Arborescence de navigation

```
screen-home  [point d'entrée, pile vidée]
│
├─ #home-quiz-btn ──────────────────→ screen-quiz-params
│                                         │
│          #qp-manage-listes ────────────→ screen-list-selection
│                                         │     │
│          ←─────── #ls-validate (goBack) ┘     │
│                   ←── fermeture sans valider ──┘ (annule)
│                                         │
│          #qp-start ────────────────────→ screen-quiz
│                                              │
│                    fin de session ──────────→ screen-results
│                                              │    │
│                    #results-restart ─────────┘    │→ screen-quiz (cartes_initial)
│                    #results-retry ────────────────→ screen-quiz (errors seulement)
│                    #results-home ─────────────────→ screen-home
│                    clic entrée erreur ────────────→ [overlay: card-vocab/card-kanji]
│                                              │
│                    clic entrée ──────────────→ [overlay: card-vocab/card-kanji]
│                    │                              clic kanji composant
│                    │                              └─→ [push-sheet: card-kanji]
│                    │                              #edit-listes-btn
│                    │                              └─→ screen-edit-listes
│                    │                                    └─ goBack → [overlay]
│                    │
│                    ← (avec popup confirmation) ──→ screen-quiz-params
│
├─ #home-search-btn ────────────────→ screen-search
│                                         │
│          clic item ────────────────────→ screen-fiche
│                                              │
│                    #fiche-edit-listes ───────→ screen-edit-listes
│                                              │     └─ goBack → screen-fiche
│                    ← goBack ────────────────→ screen-search
│
└─ #home-data-btn ──────────────────→ screen-data
                                          │
         #data-import ───────────────────→ screen-import
                                          │     └─ #import-done → screen-home
         #data-restore ──────────────────→ screen-restore
                                                └─ (après restauration) → screen-home
```

---

## Inventaire détaillé des écrans

### `screen-home` — Accueil

**Fichier :** `js/screens/home.js`

Point d'entrée de l'application. Naviguez vers `screen-home` vide la pile complète.

**Contenu :**
- Toggle vocab / kanji (mémorisé dans state)
- Donut chart global (maîtrisé / en cours / étudié / non commencé)
- Grille 2×2 de sous-camemberts par type de quiz
- Chiffres clés : total de fiches, à réviser aujourd'hui

**State reçu :** `{ type: 'vocab' | 'kanji' }` (optionnel, défaut `'vocab'`)

---

### `screen-quiz-params` — Paramètres quiz

**Fichier :** `js/screens/quiz-params.js`

**Contenu :**
- Catégorie : vocab / kanji
- Listes sélectionnées (depuis `lists-state.js`, persisté localStorage)
- Critère : tous / moins maîtrisés / vus il y a longtemps / jamais étudié
- Type : lecture / compréhension
- Sens : JP→FR / FR→JP
- Autoplay (visible uniquement si `type=compréhension` ET `sens=jpfr`)
- Slider nombre de cartes (persisté localStorage)

**State reçu :** `{ type: 'vocab' | 'kanji' }`

**State passé à quiz :** `{ cards, cards_initial, type, sens, cat, critere, listes, autoplay }`

---

### `screen-list-selection` — Sélection des listes

**Fichier :** `js/screens/list-selection.js`

Accessible uniquement depuis `screen-quiz-params`. Retour sans valider annule les changements.

**Contenu :**
- Catégories dépliables (premier mot du nom de liste = catégorie)
- Checkbox par liste, "Tout cocher / Tout décocher" par catégorie
- Bouton "Valider" (haut droite) → sauvegarde via `lists-state.setSelectedListes()` + `goBack()`

---

### `screen-quiz` — Quiz

**Fichier :** `js/screens/quiz.js`

**Contenu :**
- Carte courante (mot/kanji selon type)
- Champ de saisie réponse + bouton Valider
- Boutons "Je ne sais pas" / "Je sais" (avant validation)
- Feedback correction (après validation)
- Bouton Suivant
- Compteur de progression
- Bouton ← avec popup de confirmation

**State reçu :** `{ cards, cards_initial, type, sens, cat, critere, listes, autoplay }`

**State passé à results :** `{ cards, cards_initial, errors, params: { type, sens, cat, critere, listes, autoplay } }`

---

### `screen-results` — Résultats

**Fichier :** `js/screens/results.js`

**Contenu :**
- Donut chart session (correct / incorrect)
- Liste des entrées mal répondues (cliquables → overlay fiche)
- Boutons dynamiques :
  - Si erreurs > 0 : `[Recommencer][Rejouer les erreurs]` + `[Accueil]`
  - Si erreurs = 0 : `[Accueil][Recommencer]`

**State reçu :** `{ cards, cards_initial, errors, params }`

---

### `screen-search` — Recherche

**Fichier :** `js/screens/search.js`

**Contenu :**
- Toggle vocab / kanji
- Champ de recherche (debounce 200ms)
- Toggle inclure/exclure liste "automatique"
- Résultats paginés (50 par page)

**State reçu :** `{ type: 'vocab' | 'kanji' }` (optionnel)

**State passé à fiche :** `{ key: mot | kanji, ktype: 'vocab' | 'kanji' }`

---

### `screen-fiche` — Fiche détail

**Fichier :** `js/screens/fiche.js`

Affiche le détail complet d'une entrée. Accessible depuis `screen-search` (push classique) et depuis overlays quiz/résultats (overlay).

**Contenu vocab :** lectures, traductions, kanjis composants, scores par sens, lien Jisho, boutons éditer listes / supprimer

**Contenu kanji :** lectures on/kun, exemples, scores, lien Jisho, boutons éditer listes / supprimer

**State reçu :** `{ key: string, ktype: 'vocab' | 'kanji' }`

---

### `screen-data` — Données

**Fichier :** `js/screens/data.js`

**Contenu :**
- Boutons Import / Export / Restaurer
- Configuration TTS : saisie clé Google Cloud, sélection voix

---

### `screen-import` — Import

**Fichier :** `js/screens/import.js`

**Contenu :**
- Zone upload fichier JSON
- Prompt Claude (constante `PROMPT_FULL`) pour aider à structurer les données
- Résumé post-import : importés / doublons / échecs

Retour : navigue vers `screen-home` (pile vidée).

---

### `screen-restore` — Restaurer

**Fichier :** `js/screens/restore.js`

**Contenu :**
- Upload fichier de sauvegarde JSON
- Option : conserver ou réinitialiser les scores

Retour : navigue vers `screen-home` (pile vidée).

---

### `screen-edit-listes` — Édition des listes

**Fichier :** `js/screens/edit-listes.js`

Accessible depuis `screen-fiche` et depuis les overlays (via fiche vocab/kanji).

**Contenu :**
- Checkboxes sur listes existantes
- Champ ajout d'une nouvelle liste

Retour : `goBack()` vers l'écran précédent (fiche ou overlay).

**State reçu :** `{ key: string, ktype: 'vocab' | 'kanji' }`

---

## Matrice des transitions

| De | Vers | Déclencheur | State transmis |
|----|------|------------|----------------|
| `screen-home` | `screen-quiz-params` | `#home-quiz-btn` | `{ type }` |
| `screen-home` | `screen-search` | `#home-search-btn` | `{ type }` |
| `screen-home` | `screen-data` | `#home-data-btn` | — |
| `screen-quiz-params` | `screen-list-selection` | `#qp-manage-listes` | — |
| `screen-list-selection` | `screen-quiz-params` | `#ls-validate` (goBack) | — |
| `screen-quiz-params` | `screen-quiz` | `#qp-start` | `{ cards, cards_initial, type, sens, cat, critere, listes, autoplay }` |
| `screen-quiz` | `screen-quiz-params` | ← + confirmation | — (goBack) |
| `screen-quiz` | `screen-results` | fin session + Suivant | `{ cards, cards_initial, errors, params }` |
| `screen-results` | `screen-quiz` | `#results-restart` | `{ cards: shuffle(cards_initial), cards_initial, ... }` |
| `screen-results` | `screen-quiz` | `#results-retry` | `{ cards: errors, cards_initial, ... }` |
| `screen-results` | `screen-home` | `#results-home` | — (pile vidée) |
| `screen-search` | `screen-fiche` | clic sur un résultat | `{ key, ktype }` |
| `screen-fiche` | `screen-edit-listes` | `#fiche-edit-listes` | `{ key, ktype }` |
| `screen-edit-listes` | *(précédent)* | Sauvegarder | — (goBack) |
| `screen-data` | `screen-import` | `#data-import` | — |
| `screen-import` | `screen-home` | `#import-done` | — (pile vidée) |
| `screen-data` | `screen-restore` | `#data-restore` | — |
| `screen-restore` | `screen-home` | après restauration | — (pile vidée) |
| Quiz ou Résultats | `[overlay-sheet]` | clic sur une entrée | — (openOverlay) |
| `[overlay-sheet]` vocab | `[push-sheet]` kanji | clic kanji composant | — (push interne) |
| `[overlay-sheet]` | `screen-edit-listes` | `#edit-listes-btn` | `{ key, ktype }` |

---

## Patterns de navigation

### Stack-based navigation

**Fichier :** `js/router.js`

L'application est une SPA avec une pile d'états (`stack[]`). Chaque `navigate()` empile un écran ; `goBack()` dépile.

```javascript
navigate(id, state = {})   // Empile l'écran, appelle leave() puis enter(state)
goBack()                   // Dépile, appelle leave() puis enter(prevState, isBack=true)
currentState()             // Lit le state de l'écran courant
replaceState(patch)        // Fusionne un patch dans le state courant (spread)
```

**Cas particulier :** `navigate('screen-home')` vide la pile complètement (`stack.length = 0`), garantissant un état propre.

**`isBack` flag :** Le hook `enter(state, isBack)` reçoit `true` quand on revient en arrière. Exemple dans `screens/search.js` : ne réinitialise pas le champ de recherche si `isBack === true`.

---

### Overlays (bottom sheets)

**Fichiers :** `js/router.js`, `js/components/card-vocab.js`, `js/components/card-kanji.js`

Les overlays n'utilisent pas la pile principale — ils ont leur propre pile `overlayStack[]`.

```javascript
openOverlay(sheetEl, bgEl)   // Empile, rend visible
closeOverlay()                // Dépile, masque
```

`goBack()` ferme d'abord les overlays avant de dépiler les écrans.

**Deux niveaux d'overlay :**
1. `overlay-sheet` — fiche vocab ou kanji principale (depuis quiz ou résultats)
2. `push-sheet` (z-index supérieur) — fiche kanji accessible depuis un composant kanji dans `overlay-sheet`

La transition vocab → kanji dans l'overlay est gérée par `card-vocab.js` : le HTML vocab est sauvegardé dans `_overlayStack[]`, le `push-sheet` est animé par-dessus, puis le retour restaure le HTML vocab.

---

### Hooks d'écrans

**Fichier :** `js/router.js` (`registerScreen`)

Chaque écran s'enregistre au boot avec des callbacks :

```javascript
registerScreen('screen-quiz', {
  enter(state, isBack) { /* appelé à chaque affichage de l'écran */ },
  leave()              { /* appelé quand l'écran se cache */        }
})
```

| Écran | Ce que fait `enter()` |
|-------|----------------------|
| `screen-home` | Rebuild stats et charts selon `state.type` |
| `screen-quiz-params` | Charge les listes disponibles, applique le type, rafraîchit le slider |
| `screen-quiz` | Initialise `_state`, affiche la première carte |
| `screen-results` | Rendu donut, liste erreurs, génère boutons dynamiques |
| `screen-search` | Reconstruit l'index si besoin, relance la recherche courante |
| `screen-fiche` | Fetch l'entrée en DB, render le contenu |
| `screen-list-selection` | Charge les listes, applique l'état coché depuis `lists-state.js` |
| `screen-edit-listes` | Charge les listes, pré-coche celles de l'entrée |

---

### Popup de confirmation

**Fichier :** `js/router.js`

```javascript
showPopup(message, onConfirm, onCancel)
```

Utilisé pour les actions destructives : quitter le quiz en cours, supprimer une fiche, restaurer la base.

---

### Passage de state entre écrans

Le state est un objet libre passé à `navigate(id, state)` et récupéré dans `enter(state)`. Clés utilisées par écran :

| Récepteur | Clés attendues dans `state` |
|-----------|-----------------------------|
| `screen-quiz-params` | `type` |
| `screen-quiz` | `cards`, `cards_initial`, `type`, `sens`, `cat`, `critere`, `listes`, `autoplay` |
| `screen-results` | `cards`, `cards_initial`, `errors`, `params` |
| `screen-search` | `type` |
| `screen-fiche` | `key`, `ktype` |
| `screen-edit-listes` | `key`, `ktype` |

---

## Cycle de vie d'un écran (pattern)

Tous les écrans suivent le même pattern d'implémentation :

```javascript
// 1. Sélection des éléments DOM au boot (une seule fois)
const el = document.getElementById('screen-mon-ecran');
const btn = el.querySelector('#mon-btn');

// 2. Attache des événements (une seule fois)
btn.addEventListener('click', () => { /* ... */ });

// 3. Enregistrement dans le router
export function initMonEcran() {
  registerScreen('screen-mon-ecran', {
    enter(state, isBack) {
      // Appelé à chaque affichage — charger données, mettre à jour DOM
    },
    leave() {
      // Appelé quand l'écran disparaît — nettoyage si nécessaire
    }
  });
}
```

Le hook `leave()` est peu utilisé dans le projet (pas de cleanup systématique nécessaire). L'état de session est porté par les variables locales du module (`_state`, `_cards`, etc.) et par `currentState()` / `replaceState()` du router.
