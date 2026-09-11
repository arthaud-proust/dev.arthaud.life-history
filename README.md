# Historique de vie

Une application web pour construire, visualiser et imprimer la frise chronologique des
évènements marquants de sa vie, dans un cadre de thérapie psychologique.

**Vos données ne quittent pas votre navigateur** : pas de compte, pas de serveur, pas
de statistiques d'usage. La frise est enregistrée dans le stockage local, et s'exporte
dans un fichier texte que vous pouvez lire, modifier et archiver sans l'application.

Le besoin, les parcours utilisateur et les décisions de conception sont dans
[PRODUCT.md](./PRODUCT.md).

## Le format de fichier

Un seul format sert de stockage, d'export et d'import — une ligne par évènement :

```text
Mon histoire, commencée en thérapie.

# 1987
Naissance

# 2003 à 2006; rose
Lycée
Trois années difficiles, loin de ma famille.

# 12 juin 2022 à aujourd'hui; sky
Thérapie
```

Une ligne `#` ouvre un évènement et porte sa date, éventuellement sa couleur ; tout ce
qui suit jusqu'au prochain `#` est sa description, **libre et sur autant de lignes
qu'il le faut**. Sa première ligne sert d'étiquette sur la frise. La couleur est le nom
d'une teinte Tailwind, pour que le fichier reste lisible.

Les dates acceptent trois précisions — `2024`, `juin 2023`, `12 juin 2022` — parce
qu'on ne se souvient pas toujours du mois. La lecture est tolérante (`06/2023`,
`sept 2001`, `2024 -> 2025`), l'écriture canonique. Un bloc incompris est conservé tel
quel et signalé, jamais deviné ni supprimé. La grammaire complète est en §5 de
[PRODUCT.md](./PRODUCT.md).

## Développement

Node 26 (voir [mise.toml](./mise.toml)).

```bash
yarn install
yarn dev         # http://localhost:3000
yarn test        # parseur, sérialiseur, échelles, pagination d'impression
yarn lint        # règles de correction (le formatage est à Prettier)
yarn format      # met en forme ; `yarn format:check` vérifie sans écrire
yarn typecheck
yarn build       # site statique dans .output/public
```

## Architecture

L'application est une **SPA statique** (`ssr: false`) : aucune donnée de patient ne peut
transiter par un serveur, et la frise n'est lue et rendue que dans le navigateur.

| Emplacement | Rôle |
|---|---|
| [app/utils/partial-date.ts](./app/utils/partial-date.ts) | Dates partielles : lecture tolérante, écriture canonique. Seule autorité sur les dates, partagée par le fichier et le formulaire. |
| [app/utils/life-document.ts](./app/utils/life-document.ts) | Le document texte : parseur, sérialiseur, fusion à l'import. |
| [app/utils/timeline-sequence.ts](./app/utils/timeline-sequence.ts) | Disposition de la frise : colonnes accolées, jalons d'année, bandeaux de période. |
| [app/utils/print-pagination.ts](./app/utils/print-pagination.ts) | Rangement des cartes en feuilles A4, à partir de leurs dimensions mesurées. |
| [modules/tailwind-palette/](./modules/tailwind-palette/) | Module Nuxt qui extrait la palette de `tailwindcss/theme.css` à la compilation et la convertit d'oklch en sRGB. Expose `#tailwind-palette`. |
| [app/composables/useLifeHistory.ts](./app/composables/useLifeHistory.ts) | L'état, et son unique lieu de stockage : le document texte dans `localStorage`. |
| [app/components/LifeTimeline.vue](./app/components/LifeTimeline.vue) | La frise : une suite de cartes en HTML, écran et impression. |

Le parseur et le sérialiseur sont le cœur du produit : ce sont eux qui garantissent
qu'un export est réimportable, donc que les données appartiennent au patient. Ils sont
écrits sans dépendance à l'interface et couverts par des tests d'aller-retour.

La frise est rendue **en HTML**, sans librairie de timeline. Une frise dessinée sur un
canvas écrit ses étiquettes d'un seul trait et les tronque : impossible d'y afficher la
description entière d'un évènement, ce que ce produit exige. Le HTML donne en prime un
texte qui s'imprime à la résolution de l'imprimante, se sélectionne et se laisse lire
par un lecteur d'écran. Le raisonnement complet est en §6 de [PRODUCT.md](./PRODUCT.md).
