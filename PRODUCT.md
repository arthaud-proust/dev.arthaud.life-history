# Life History — frise des évènements de vie

> Une application web pour construire, visualiser et imprimer la frise chronologique
> des évènements marquants de sa vie, dans un cadre de thérapie psychologique.

---

## 1. Contexte & intention

En thérapie (TCC, EMDR, thérapie narrative, travail sur le trauma…), reconstituer la
ligne de vie du patient est un exercice courant : on pose sur un axe temporel les
évènements marquants, on les relie, on observe les périodes denses, les vides, les
enchaînements.

Aujourd'hui cet exercice se fait sur papier (rouleau, post-its) ou dans un tableur.
L'objectif du produit est de fournir un outil **numérique, sobre et strictement
confidentiel**, dont le rendu final reste **imprimable sur papier** pour être travaillé
en séance.

### Utilisateur cible

**Le patient**, seul utilisateur du logiciel. Il l'utilise chez lui, à son rythme,
entre deux séances, puis apporte la frise imprimée (ou l'affiche sur son écran) en
consultation. Le thérapeute n'est pas utilisateur de l'application : il est
**destinataire du support imprimé**.

Profil supposé : non technicien, sur ordinateur personnel, potentiellement dans un état
émotionnel fragile au moment de la saisie.

### Principes directeurs

1. **Confidentialité par construction** — aucune donnée ne quitte le navigateur. Pas de
   compte, pas de serveur, pas de télémétrie, pas d'appel réseau après chargement.
2. **Le patient reste propriétaire** — export/import dans un format qu'il peut ouvrir,
   lire, comprendre et archiver lui-même, sans l'application.
3. **Sobriété émotionnelle** — interface neutre, calme, sans gamification, sans
   injonction, sans jugement sur le contenu saisi.
4. **Le papier est un livrable de premier plan**, pas une fonctionnalité secondaire.

---

## 2. Périmètre

### Dans la v1

- Création / édition / suppression d'évènements sur une frise horizontale
- Évènements ponctuels (une date) et périodes (début → fin), à la précision jour,
  mois ou année
- Deux granularités d'affichage — **année** et **mois** — déduites automatiquement de
  l'étendue de la frise, et modifiables manuellement
- **Un fichier texte unique et lisible** qui sert à la fois de format de stockage,
  d'export et d'import (voir §5)
- Persistance automatique en `localStorage`
- Note explicative sur la confidentialité, accessible depuis le header
- Impression, y compris sur plusieurs feuilles A4 assemblables

### Hors périmètre v1 (assumé, à réévaluer plus tard)

- Multi-frises / multi-profils sur un même navigateur
- Synchronisation, partage en ligne, compte utilisateur
- Chiffrement par mot de passe du contenu stocké *(voir §8, risque identifié)*
- Catégories, couleurs, valence, intensité ressentie — retirés du périmètre : le format
  texte retenu ne les porte pas. Extension possible en v1.1 via les étiquettes `#` (§5)
- Pièces jointes (photos, documents, audio)
- Annotations du thérapeute, mode collaboratif
- Mobile-first : l'application doit rester **utilisable** sur tablette/mobile, mais
  l'édition fine est pensée pour un écran large
- Analyse automatique, suggestions, IA

---

## 3. Modèle de données

Le **document texte est la source de vérité** (§5). Le modèle ci-dessous est ce que
l'application obtient en le lisant ; il n'ajoute aucune information qui ne soit écrite
dans le fichier.

### Évènement

| Champ | Type | Requis | Description |
|---|---|---|---|
| `start` | date partielle | oui | `12 juin 2022`, `juin 2023` ou `2024` |
| `end` | date partielle \| `aujourd'hui` | non | Si présent → période ; sinon → évènement ponctuel |
| `label` | string | oui | Titre court affiché sur la frise |
| `description` | string | non | Texte libre, non affiché sur la frise par défaut |

**Dates partielles** : un patient se souvient souvent d'une année sans le mois
(« vers 1998 »). Le modèle porte donc une **précision** (`jour` \| `mois` \| `année`) en
plus de la date. Une date imprécise est *positionnée* au début de sa période
(1998 → 1998-01-01) mais **affichée** telle qu'elle a été écrite (« 1998 ») — ne jamais
inventer un mois ou un jour pour compléter une date.

**Pas d'identifiant.** Le format texte n'en porte pas ; deux évènements sont considérés
comme le même s'ils ont la même date et le même libellé (utile à la fusion à l'import,
cf. B3).

### Frise

La frise **est** la liste ordonnée des évènements du document — il n'y a pas d'autre
état persisté :

- **Titre** : le nom du fichier (`ma-ligne-de-vie.txt` → « Ma ligne de vie »).
- **Date de naissance** : pas de champ dédié ; c'est un évènement comme un autre
  (`1987; Naissance`).
- **État de la vue** (granularité, plage visible, zoom) : jamais stocké, toujours
  recalculé au chargement (cf. A4 et A6).

## 4. User stories

### Épique A — Construire la frise

**A1 — Ajouter un évènement en quelques secondes**
> En tant que patient, je veux ajouter un évènement daté sans effort, afin de
> reconstituer mon histoire au fil de ce qui me revient.

C'est **le geste central du produit** : une séance de saisie, c'est trente évènements
d'affilée. Tout ce qui coûte un clic de trop est payé trente fois, au moment précis où
le patient a la tête ailleurs.

Critères d'acceptation :
- Le formulaire d'ajout est **visible en permanence** à côté de la frise : il n'y a pas
  de bouton à cliquer pour l'ouvrir, pas de modale.
- Il présente trois champs, **tous affichés par défaut** :

  | Champ | Requis | Exemple |
  |---|---|---|
  | **Date** | oui | `juin 2023` |
  | **Date de fin** *(optionnelle)* | non | `juillet 2024` |
  | **Libellé** | oui | `Perte d'un proche` |

- La **description** est le seul champ replié, derrière un discret
  « + Ajouter une description ».
- Les champs de date sont des **champs texte libres**, jamais un sélecteur de
  calendrier : un calendrier imposerait une précision au jour que le patient n'a pas
  (« vers 1998 »). Ils acceptent exactement les mêmes écritures que le fichier (§5) —
  `1998`, `juin 2023`, `12 juin 2022`, `06/2023`…
- Sous le champ, une **relecture discrète** confirme l'interprétation au fil de la
  frappe : `12/06/22` → « 12 juin 2022 ». Le patient voit ce qui sera enregistré sans
  avoir à valider pour le découvrir.
- **`Entrée` valide.** Le formulaire se vide, le focus revient sur *Date*, prêt pour
  l'évènement suivant — on peut enchaîner au clavier sans toucher la souris.
- À la validation, l'évènement apparaît immédiatement sur la frise, et la vue défile
  jusqu'à lui s'il est hors champ.
- Une date incomprise empêche l'enregistrement, avec un message explicite et non
  culpabilisant, qui montre quoi écrire plutôt que ce qui est faux :
  « Je n'ai pas reconnu cette date. Vous pouvez écrire *1998*, *juin 2023* ou
  *12 juin 2022*. »

*Piste d'accélération (v1.1)* : le format de fichier étant déjà une ligne par
évènement, un champ unique acceptant `juin 2023; Perte d'un proche` coûterait presque
rien à ajouter, pour les patients qui prennent le pli. À proposer en complément du
formulaire, jamais à sa place.

**A2 — Représenter une période**
> En tant que patient, je veux représenter une période (ex. « lycée, 2003–2006 »),
> afin de distinguer ce qui a duré de ce qui a été ponctuel.

Critères d'acceptation :
- **Aucune bascule, aucune case à cocher** : le champ *Date de fin* est déjà là.
  Le remplir crée une période, le laisser vide crée un évènement ponctuel.
- Une période s'affiche comme une barre horizontale, un évènement ponctuel comme un
  marqueur.
- Le début et la fin peuvent avoir des précisions différentes
  (`12 juin 2022 à juillet 2024`).
- Écrire `aujourd'hui` dans le champ de fin marque une période toujours en cours.
- La date de fin doit être postérieure ou égale à la date de début ; sinon, un message
  clair le signale sans effacer la saisie.

**A3 — Modifier / supprimer un évènement**
> En tant que patient, je veux corriger ou retirer un évènement, afin que la frise
> reste juste.

Critères d'acceptation :
- Un clic sur un évènement ouvre son détail en lecture ; un bouton passe en édition.
- Le formulaire d'édition présente exactement les mêmes champs que celui d'ajout, avec
  les mêmes règles de saisie de date.
- La suppression demande une confirmation.
- Une suppression est annulable pendant quelques secondes (toast « Annuler »).

**A4 — Échelle de temps déduite, et ajustable**
> En tant que patient, je veux que la frise s'affiche d'emblée à la bonne échelle, et
> pouvoir basculer entre années et mois, afin de voir soit l'ensemble de ma vie, soit
> une période dense en détail.

Critères d'acceptation :
- À l'ouverture, la granularité est **déduite de l'étendue des évènements** :
  - étendue totale **> 3 ans** → échelle **années** ;
  - étendue totale **≤ 3 ans** → échelle **mois** ;
  - si aucun évènement n'est daté plus précisément que l'année, l'échelle **mois** n'a
    rien à montrer : rester en années quelle que soit l'étendue.
- Un sélecteur explicite propose « Années » / « Mois » et permet de passer outre la
  déduction.
- Le zoom à la molette / au pincement change la plage visible ; il peut basculer
  automatiquement de granularité, mais le sélecteur reflète toujours l'état courant.
- Un bouton « Tout voir » recadre sur l'intégralité des évènements et rétablit la
  granularité déduite.
- Le changement d'échelle ne modifie jamais les données — il n'est pas non plus
  enregistré : rouvrir l'application repart de la déduction.

**A5 — Regrouper par thème** *(v1.1, à valider)*
> En tant que patient, je veux regrouper mes évènements par thème, afin de faire
> apparaître des motifs.

Le format texte retenu (§5) n'a pas de champ « catégorie ». Plutôt que d'ajouter une
colonne — qui alourdirait chaque ligne —, la piste retenue est l'**étiquette dans le
libellé** : `2003 à 2006; Lycée #école`. Elle reste lisible dans le fichier, survit à
un aller-retour export/import, et n'impose rien à qui n'en veut pas.

Critères d'acceptation :
- Un mot préfixé de `#` dans le libellé est reconnu comme thème et retiré du titre
  affiché sur la frise.
- Une légende liste les thèmes rencontrés et permet d'en masquer/afficher un d'un clic.
- La palette par défaut reste sobre et lisible en niveaux de gris (contrainte
  d'impression noir & blanc).
- Un libellé sans étiquette reste parfaitement valide.

**A6 — Retrouver mon travail**
> En tant que patient, je veux retrouver ma frise telle que je l'ai laissée quand je
> rouvre l'application.

Critères d'acceptation :
- Chaque modification est persistée automatiquement (pas de bouton « Enregistrer »),
  sous la forme du document texte de §5.
- La vue (granularité, plage visible) n'est pas mémorisée : elle est recalculée à
  l'ouverture à partir des évènements (A4). Rien d'autre que le document n'est stocké.
- Un indicateur discret confirme que les modifications sont enregistrées localement.

### Épique B — Confidentialité & maîtrise des données

**B1 — Comprendre où sont mes données**
> En tant que patient, je veux savoir explicitement que mes données restent sur mon
> navigateur, afin d'oser y écrire des choses intimes.

Critères d'acceptation :
- Un bouton discret dans le header (icône bouclier/cadenas + libellé accessible) ouvre
  une modale « Vos données ».
- La modale explique, en français simple et sans jargon :
  - les données sont enregistrées dans le stockage local **de ce navigateur, sur cet
    appareil** ;
  - rien n'est envoyé sur Internet, il n'y a ni compte ni serveur ;
  - **conséquence** : effacer les données de navigation, utiliser la navigation privée,
    changer de navigateur ou d'ordinateur fait perdre la frise ;
  - **conséquence** : toute personne ayant accès à cette session du navigateur peut lire
    la frise — prudence sur un ordinateur partagé ;
  - la recommandation d'exporter régulièrement le fichier et de le ranger en lieu sûr.
- La modale propose un accès direct à « Exporter » et « Tout effacer ».
- Cette information est aussi visible au premier lancement, avant toute saisie.

**B2 — Exporter ma frise**
> En tant que patient, je veux exporter ma frise dans un fichier lisible, afin de la
> sauvegarder et de la garder même sans l'application.

Critères d'acceptation :
- Un bouton « Exporter » télécharge un fichier `.txt` au format décrit en §5, nommé
  `frise-de-vie-AAAA-MM-JJ.txt`.
- Le fichier est **exactement** ce qui est stocké dans le navigateur : exporter n'est
  qu'un enregistrement sur disque, sans conversion.
- Il se lit et se modifie dans n'importe quel éditeur de texte, et reste compréhensible
  sans l'application.
- Il contient l'intégralité des données, y compris les descriptions.
- Le téléchargement se fait sans requête réseau (Blob local, encodage UTF-8).

**B3 — Importer une frise**
> En tant que patient, je veux réimporter un fichier exporté, afin de reprendre mon
> travail sur un autre appareil ou après un effacement.

Critères d'acceptation :
- Import par sélection de fichier **et** par glisser-déposer d'un `.txt`.
- Le fichier est analysé avant application, et un aperçu montre ce qui a été compris,
  y compris les lignes non reconnues (§5) — l'import n'écrase rien tant qu'il n'est pas
  confirmé.
- Si une frise existe déjà, l'utilisateur choisit entre **remplacer** et **fusionner**.
  La fusion rapproche les évènements ayant la même date et le même libellé ; les autres
  sont ajoutés.
- Un récapitulatif est affiché avant confirmation : « 42 évènements seront importés,
  3 lignes n'ont pas été comprises ».

**B4 — Tout effacer**
> En tant que patient, je veux pouvoir supprimer définitivement ma frise de ce
> navigateur, afin de ne rien laisser derrière moi.

Critères d'acceptation :
- Action disponible depuis la modale « Vos données ».
- Double confirmation, avec proposition d'exporter d'abord.
- L'effacement vide réellement l'entrée `localStorage` (pas seulement l'état en mémoire).

### Épique C — Imprimer

**C1 — Imprimer la frise**
> En tant que patient, je veux imprimer ma frise, afin de l'apporter en séance et de la
> travailler au crayon avec mon thérapeute.

Critères d'acceptation :
- Un bouton « Imprimer » ouvre un aperçu dédié avant l'impression système.
- Format A4, orientation paysage par défaut (portrait proposé).
- L'impression ne contient que la frise, son titre, sa légende et l'axe : aucun élément
  d'interface (boutons, menus, barres d'outils).
- Le rendu reste lisible en noir & blanc.
- Une mention discrète en pied de page : titre de la frise + date d'impression +
  numéro de page.

**C2 — Imprimer sur plusieurs feuilles A4**
> En tant que patient, je veux que ma frise soit répartie sur plusieurs feuilles que je
> peux assembler, afin de ne pas devoir tout tasser sur une seule page illisible.

Critères d'acceptation :
- L'aperçu affiche le nombre de pages et la période couverte par chacune.
- Un réglage de **densité** (ex. « cm par année », ou « compact / normal / détaillé »)
  contrôle directement le nombre de pages.
- Le découpage se fait **par tranche de temps**, jamais au milieu d'un libellé : chaque
  page couvre une plage temporelle complète et réaffiche l'axe et la légende.
- Chaque page indique la plage couverte (« 1992 → 2001 ») et une mention de
  raccordement (« suite page 3 »).
- Des repères de collage discrets (traits de coupe + marge de recouvrement) permettent
  d'assembler les feuilles bord à bord.
- Le nombre de pages est borné : au-delà d'un seuil (ex. 10), un avertissement invite à
  réduire la densité.

**C3 — Exporter en image / PDF** *(souhaitable, v1.1)*
> En tant que patient, je veux enregistrer ma frise en image ou en PDF, afin de
> l'envoyer à mon thérapeute ou de l'imprimer ailleurs.

Note : l'export image est fourni nativement par Tempis (PNG/JPEG/WebP). Le PDF passe par
l'impression système (« Imprimer → Enregistrer au format PDF »), ce qui évite d'embarquer
une librairie PDF. À documenter dans l'interface.

---

## 5. Format de stockage et d'échange

**Un seul format, pour tout** : le même document texte est ce qui est stocké dans le
navigateur, ce qui est exporté et ce qui est importé. Pas de conversion, donc pas de
perte possible entre les trois.

### Exemple

```text
# Ma ligne de vie

1987; Naissance
juin 2023; Perte d'un proche; Description optionnelle
2024 à 2025; Voyage à Paris
12 juin 2022 à juillet 2024; Voyage à Lille
2020 à aujourd'hui; Thérapie
```

### Grammaire

Une ligne = un évènement. Trois champs au plus, séparés par des points-virgules :

```text
<date ou période>; <libellé>[; <description>]
```

- **Champ 1 — la date.** Soit une date seule, soit une période `<date> à <date>`.
  Trois précisions possibles : `2024` (année), `juin 2023` (mois), `12 juin 2022`
  (jour). Le début et la fin d'une période peuvent avoir des précisions différentes.
  `aujourd'hui` comme date de fin marque une période toujours en cours.
- **Champ 2 — le libellé.** Obligatoire, une ligne.
- **Champ 3 — la description.** Facultative. Elle peut contenir des points-virgules :
  **seuls les deux premiers `;` de la ligne sont séparateurs**, le reste appartient à
  la description.
- Une ligne **vide** est ignorée ; une ligne commençant par `#` est un **commentaire**
  (et sert de titre ou de repère dans le fichier).
- Une ligne **indentée** (commençant par une espace ou une tabulation) prolonge la
  description de l'évènement précédent — c'est ainsi qu'on écrit une description sur
  plusieurs lignes.
- L'ordre des lignes n'a pas d'importance : la frise trie par date.

### Lecture tolérante, écriture canonique

L'application est **souple à la lecture** — un fichier écrit ou corrigé à la main doit
« juste marcher » — et **régulière à l'écriture**.

Acceptés en lecture :

| Variante | Exemples |
|---|---|
| Casse et accents des mois | `Juin`, `juin`, `fevrier`, `février` |
| Abréviations | `janv.`, `fév`, `sept 2001` |
| Dates numériques | `06/2023`, `12/06/2022`, `2023-06`, `2022-06-12` |
| Séparateurs de période | `à`, `a`, `->`, `→`, `–`, ou `-` entouré d'espaces |
| Période ouverte | `2020 à aujourd'hui`, `depuis 2020` |
| Espaces superflus | autour des `;` et en fin de ligne |

Écrits à l'export (forme canonique) : mois en toutes lettres en français
(`12 juin 2022`, `juin 2023`, `2024`), séparateur de période ` à `, champs séparés par
`; `, évènements triés par ordre chronologique.

**Conséquence assumée** : un fichier importé puis réexporté ressort normalisé —
`06/2023` devient `juin 2023`, les lignes sont retriées. Le sens est intégralement
préservé, la mise en forme d'origine ne l'est pas.

### Robustesse : aucune ligne n'est jamais perdue

C'est la contrepartie indispensable d'un format éditable à la main.

- Une ligne que l'application ne sait pas interpréter est **conservée telle quelle** à
  sa place dans le document, et **réécrite à l'identique** au prochain enregistrement
  comme à l'export.
- L'interface signale leur présence sans dramatiser (« 2 lignes n'ont pas été
  comprises »), les affiche, et propose de les corriger.
- L'application ne réécrit jamais silencieusement une ligne dont elle n'est pas sûre,
  et ne refuse jamais d'ouvrir un document à cause d'une ligne fautive.

### Ce que le format ne porte pas

Ni identifiants, ni couleurs, ni état de la vue, ni métadonnées de version. C'est
volontaire : tout ce qui est stocké doit avoir un sens pour la personne qui lit le
fichier. Si une évolution future exige une information supplémentaire, elle devra
prendre une forme lisible (à l'image des étiquettes `#` proposées en A5) plutôt qu'un
champ technique.

L'absence de numéro de version implique que **toute évolution du format doit rester
rétrocompatible en lecture**.

### Tests attendus

- **Aller-retour** : `écrire(lire(texte))` est stable (un second aller-retour ne change
  plus rien), et `lire(écrire(modèle))` redonne le modèle.
- **Préservation** : un document contenant des lignes invalides ressort avec ces lignes
  intactes.
- Un jeu d'exemples couvrant chaque variante du tableau ci-dessus.

## 6. Choix techniques

| Sujet | Choix | Motivation |
|---|---|---|
| Framework | Nuxt 4 (déjà en place) | Base du dépôt, DX, routing, build statique |
| UI | Nuxt UI 4 + Tailwind 4 | Composants accessibles prêts à l'emploi, mode sombre |
| Frise | [`@tempis/vue`](https://github.com/tempis-dev/tempis) (wrapper Vue 3 de `@tempis/timeline`) | Rendu canvas performant, items ponctuels + périodes, catégories + légende, zoom animé, export image, navigation clavier + ARIA |
| Persistance | Le document texte de §5, stocké tel quel dans `localStorage` | Un format unique pour stocker, exporter et importer ; lisible par le patient |
| Déploiement | **Site statique, sans backend** | Aucune donnée ne doit pouvoir transiter par un serveur |

### Contraintes d'architecture

- **Pas de rendu côté serveur des données patient.** L'application est une SPA statique
  (`ssr: false` ou prerender complet). La frise ne s'hydrate qu'au client, après lecture
  du `localStorage`.
- **Aucune ressource externe au runtime** : polices, icônes et scripts sont embarqués
  dans le bundle. Pas de CDN, pas de Google Fonts, pas d'analytics, pas de Sentry.
- Un **en-tête CSP** strict (pas de `connect-src` externe) rend la promesse de
  confidentialité vérifiable, et pas seulement déclarative.
- **Toute la logique métier (parseur, sérialiseur, validation, pagination
  d'impression) est indépendante de Tempis** et testée unitairement. Tempis est un
  détail de rendu remplaçable.
- Le **parseur / sérialiseur du format texte est le cœur du produit** : c'est lui qui
  garantit la promesse « vos données vous appartiennent ». Il est écrit en premier,
  isolé de toute dépendance UI, et couvert par des tests d'aller-retour.

### Point d'attention : canvas vs impression

Tempis rend la frise dans un `<canvas>`. Conséquences :

- Le CSS d'impression ne peut pas « couper » naturellement le contenu sur plusieurs
  pages comme il le ferait pour du DOM.
- **Approche retenue** : à l'impression, générer *N* rendus Tempis distincts — un par
  page — chacun configuré avec sa propre plage temporelle (`range`) et dimensionné pour
  une page A4 à haute résolution. Le découpage est donc temporel, le texte reste net,
  et aucun libellé n'est coupé en deux.
- *Repli si nécessaire* : export d'une image unique en haute résolution, puis découpage
  en tuiles de largeur A4 côté client. Plus simple, mais coupe les libellés à cheval
  entre deux pages.
- Une troisième voie, à évaluer si l'impression reste insatisfaisante : un **rendu SVG
  dédié à l'impression**, écrit par nous, alimenté par le même modèle de données que la
  frise écran. Plus de travail, mais un contrôle total sur la pagination et la qualité.

### Dépendance Tempis — risque à surveiller

`@tempis/vue` est en **1.0.0** alors que le cœur `@tempis/timeline` est en **1.3.0** : le
wrapper Vue peut être en retard sur les fonctionnalités du cœur. Vérifier tôt (spike)
que le wrapper expose bien ce dont nous avons besoin (plage visible contrôlée, export
image, granularité). À défaut, utiliser directement `@tempis/timeline` dans un composant
Vue maison — la librairie est sans dépendance et typée.

---

## 7. Exigences non fonctionnelles

- **Langue** : interface en français.
- **Accessibilité** : navigation clavier complète, contrastes AA, `prefers-reduced-motion`
  respecté. La frise canvas doit avoir une alternative accessible (liste chronologique
  des évènements, lisible par un lecteur d'écran).
- **Hors-ligne** : l'application doit fonctionner sans connexion après le premier
  chargement (service worker, v1.1).
- **Performance** : fluide jusqu'à ~500 évènements (largement au-delà d'un usage réel).
- **Robustesse des données** : aucune action ne doit pouvoir corrompre le `localStorage`
  de façon irrécupérable ; en cas de contenu illisible, proposer une récupération plutôt
  qu'un écrasement silencieux.

---

## 8. Risques & décisions à prendre

| # | Risque / question | Piste |
|---|---|---|
| 1 | **Perte de données** : vider le cache du navigateur détruit la frise — et il s'agit d'un travail thérapeutique long et coûteux émotionnellement. | Message explicite (B1) + invitation à exporter après chaque session de saisie + rappel si aucun export depuis N modifications. |
| 2 | **Confidentialité sur poste partagé** : le `localStorage` est lisible en clair par quiconque ouvre le navigateur. | v1 : l'assumer et le dire clairement. v2 : chiffrement du contenu par phrase de passe (WebCrypto) — mais un mot de passe oublié = données perdues, arbitrage produit à faire. |
| 3 | **Charge émotionnelle** : la saisie peut réactiver des souvenirs douloureux. | Ton neutre, aucun rappel intrusif, pas de notification. Envisager une mention « faites une pause » et l'indication que l'outil ne remplace pas un accompagnement. |
| 4 | **Cadre médical** : l'outil ne doit pas se présenter comme un dispositif de soin. | Mention claire : outil de support, à utiliser avec un professionnel ; aucun conseil thérapeutique généré par l'application. |
| 5 | **Ambiguïté du format texte** : une ligne écrite à la main peut être mal interprétée (mois inconnu, `;` de trop, libellé ressemblant à une date). Une mauvaise interprétation silencieuse est pire qu'un refus. | Lecture tolérante mais **jamais devinette** : en cas de doute, la ligne est conservée intacte et signalée (§5). Aperçu systématique avant import. |
| 6 | Qualité d'impression multi-pages (voir §6). | Spike technique dès le début du développement — c'est le risque technique n°1. |
| 7 | Maturité de `@tempis/vue`. | Spike d'intégration en amont ; isoler la librairie derrière un composant maison. |

---

## 9. Jalons proposés

**M0 — Spikes (avant tout développement de fonctionnalité)**
Intégrer Tempis dans Nuxt, afficher une frise de démonstration, valider zoom
année/mois et contrôle de la plage visible. Valider une impression 3 pages A4
assemblables. *Sortie : go/no-go sur l'approche de rendu.*

**M1 — Le format**
Parseur et sérialiseur du document texte, tests d'aller-retour, préservation des lignes
invalides. *Sortie : les données ont une forme stable et lisible, indépendante de l'UI.*

**M2 — Frise utilisable**
CRUD évènements (ponctuels + périodes), déduction de l'échelle année/mois, persistance
du document en `localStorage`. *Sortie : le patient peut construire sa frise.*

**M3 — Maîtrise des données**
Export `.txt`, import avec aperçu et fusion, modale « Vos données », tout effacer.
*Sortie : le patient peut sauvegarder et faire confiance à l'outil.*

**M4 — Impression**
Aperçu paginé, réglage de densité, pagination temporelle, repères d'assemblage.
*Sortie : le patient peut apporter sa frise en séance.*

**M5 — Finitions**
Étiquettes `#` & légende, accessibilité, mode hors-ligne, export image.
