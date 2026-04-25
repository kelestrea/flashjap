# flashjap - Instructions pour Claude Code

## À propos du projet

**flashjap** est une Progressive Web App (PWA) pour la révision de vocabulaire et kanji japonais.

- **Stack** : HTML/JavaScript pur, IndexedDB, Web Speech API
- **Déploiement** : GitHub Pages (automatique à chaque push sur `main`)
- **URL live** : https://kelestrea.github.io/flashjap/

## Source unique de vérité

Le fichier **SPEC.md** est la documentation source du projet. Il contient :
- Architecture complète
- Modèle de données
- Règles fonctionnelles
- Patterns de code
- Conventions

Tous les changements de code doivent rester alignés avec SPEC.md.

## Bump de version

Pour incrémenter le numéro de version, **modifier deux fichiers** :

1. **`js/version.js`** — champ `APP_VERSION` : le footer est injecté dynamiquement par `js/app.js`
2. **`sw.js`** — constante `CACHE` : mettre la même valeur (`'flashjap-x.y.z'`) pour invalider le cache SW et forcer un refresh PWA

Ne pas modifier le numéro de version dans `index.html` (valeur dynamique).

## Directive : Lever les ambiguïtés avant d'agir

Avant toute modification, si une description dans la demande peut correspondre à **plusieurs éléments** de l'interface ou du code, **toujours poser la question** pour identifier lequel est visé. Ne pas deviner. Exemples de cas à clarifier :
- Un élément visuel décrit vaguement ("le truc gris", "le petit rappel") alors que plusieurs éléments correspondent
- Une action qui pourrait s'appliquer à plusieurs composants, boutons ou sections
- Une suppression ou modification dont la portée est imprécise

## Directive : Incrémenter la version avant de pousser une PR

Avant de pousser une PR, incrémenter le patch version dans js/version.js :

Trouver la ligne : export const APP_VERSION = 'x.y.z';
Incrémenter z de 1
Si la version est x.y (sans segment patch), considérer z = 0 → mettre à jour en x.y.1
Ne pas effectuer cette étape si tu as toi-même indiqué un numéro de version durant la session


## Directive : Validation SPEC.md avant merge

**Quand tu me demandes de merger une PR**, voici le workflow :

1. **J'analyse** les changements de code dans la PR
2. **Je te propose** un plan détaillé des sections SPEC.md à mettre à jour
3. **Tu valides** le plan (tu peux l'accepter, le modifier, ou rejeter certaines sections)
4. **Je fais** les changements de SPEC.md et je les commite dans la PR
5. **On merge** la PR avec SPEC.md à jour

Cela garantit que la documentation reste à jour et cohérente avec le code.

### Sections SPEC.md à vérifier typiquement

- **Architecture** : Si structure de fichiers ou modules changent
- **Modèle de données** : Si IndexedDB schema ou structure change
- **Règles fonctionnelles** : Si comportement utilisateur change
- **Système de navigation** : Si routing ou état SPA change
- **Patterns de code** : Si conventions de code changent
- **Points d'attention** : Si considérations de sécurité/compatibilité émergent

## Directive : Vérifier avant d'expliquer

Avant d'expliquer un comportement observé dans l'app (audio, affichage, logique), toujours lire le code concerné en premier, et le fichier SPEC.md. Ne jamais construire une explication à partir de suppositions, même plausibles. Si la cause n'est pas immédiatement certaine, dire "je ne sais pas, je vérifie" et lire le code avant de répondre.
