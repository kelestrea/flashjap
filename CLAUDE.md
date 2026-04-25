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

## Directive : Lever les ambiguïtés avant d'agir

Avant toute modification, si une description dans la demande peut correspondre à **plusieurs éléments** de l'interface ou du code, **toujours poser la question** pour identifier lequel est visé. Ne pas deviner. Exemples de cas à clarifier :
- Un élément visuel décrit vaguement ("le truc gris", "le petit rappel") alors que plusieurs éléments correspondent
- Une action qui pourrait s'appliquer à plusieurs composants, boutons ou sections
- Une suppression ou modification dont la portée est imprécise

## Directive : Incrémenter la version avant de pousser une PR

**Juste avant de pousser une PR** (sauf si tu m'as toi-même précisé un numéro de version), incrémenter le patch version (`z` dans `x.y.z`) de 1 dans le fichier `index.html` :

```html
<div class="version-footer">vX.Y.Z</div>
```

Par exemple : `v3.1.2` → `v3.1.3`.

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
