# Life History — frise des évènements de vie

> Une application web pour construire, visualiser et imprimer la frise chronologique
> des évènements marquants de sa vie, dans un cadre de thérapie psychologique.

---

## 1. Contexte & intention

En thérapie (TCC, EMDR, thérapie narrative, travail sur le trauma…) reconstituer la ligne de vie du patient est un exercice courant : on pose sur un axe temporel les évènements marquants, on les relie, on observe les périodes denses, les vides, les enchaînements.

Aujourd'hui cet exercice se fait sur papier (rouleau, post-its) ou dans un tableur. L'objectif du produit est de fournir un outil **numérique, sobre et strictement confidentiel**, dont le rendu final reste **imprimable sur papier** pour être travaillé en séance.

### Utilisateur cible

**Le patient**, seul utilisateur du logiciel. Il l'utilise chez lui, à son rythme, entre deux séances, puis apporte la frise imprimée (ou l'affiche sur son écran) en consultation. Le thérapeute n'est pas utilisateur de l'application : il est **destinataire du support imprimé**.

Profil supposé : non technicien, sur ordinateur personnel, potentiellement dans un état émotionnel fragile au moment de la saisie.

### Principes directeurs

1. **Confidentialité par construction** — aucune donnée ne quitte le navigateur. Pas de compte, pas de serveur, pas de télémétrie, pas d'appel réseau après chargement.
2. **Le patient reste propriétaire** — export/import dans un format qu'il peut ouvrir, lire, comprendre et archiver lui-même, sans l'application.
3. **Sobriété émotionnelle** — interface neutre, calme, sans gamification, sans injonction, sans jugement sur le contenu saisi.
4. **Le papier est un livrable de premier plan**, pas une fonctionnalité secondaire.

---

## 2. Périmètre

### Dans la v1

- Création / édition / suppression d'évènements sur une frise horizontale
- Évènements ponctuels (une date) et périodes (début → fin), à la précision jour, mois ou année
- **Un fichier texte unique et lisible** qui sert à la fois de format de stockage, d'export et d'import (voir §5)
- Persistance automatique en `localStorage`
- Note explicative sur la confidentialité, accessible depuis le header
- Impression, y compris sur plusieurs feuilles A4 assemblables

### Hors périmètre v1 (assumé, à réévaluer plus tard)

- Multi-frises / multi-profils sur un même navigateur
- Synchronisation, partage en ligne, compte utilisateur
- Chiffrement par mot de passe du contenu stocké _(voir §8, risque identifié)_
- Catégories, couleurs, valence, intensité ressentie — retirés du périmètre : le format
  texte retenu ne les porte pas. Extension possible en v1.1 via les étiquettes `#` (§5)
- Pièces jointes (photos, documents, audio)
- Annotations du thérapeute, mode collaboratif
- Mobile-first : l'application doit rester **utilisable** sur tablette/mobile, mais l'édition fine est pensée pour un écran large
- Analyse automatique, suggestions, IA

---

## 3. Modèle de données

Le **document texte est la source de vérité** (§5). Le modèle ci-dessous est ce que l'application obtient en le lisant ; il n'ajoute aucune information qui ne soit écrite dans le fichier.

### Évènement

| Champ         | Type                            | Requis | Description                                       |
| ------------- | ------------------------------- | ------ | ------------------------------------------------- |
| `start`       | date partielle                  | oui    | `12 juin 2022`, `juin 2023` ou `2024`             |
| `end`         | date partielle \| `aujourd'hui` | non    | Si présent → période ; sinon → évènement ponctuel |
| `description` | texte, multi-ligne              | oui    | Ce que le patient veut garder de l'évènement      |
| `color`       | nom de teinte                   | non    | Couleur sur la frise ; absente → couleur du thème |

**La couleur** sert à faire ressortir des motifs - les périodes sombres, les
recommencements — sans imposer de nomenclature. Elle est facultative, et se choisit dans une **palette fermée** plutôt qu'au nuancier libre.

**Dates partielles** : un patient se souvient souvent d'une année sans le mois
(« vers 1998 »). Le modèle porte donc une **précision** (`jour` \| `mois` \| `année`) en plus de la date. Une date imprécise est _positionnée_ au début de sa période (1998 → 1998-01-01) mais **affichée** telle qu'elle a été écrite (« 1998 »).

**Pas d'identifiant.** Le format texte n'en porte pas ; deux évènements sont considérés comme le même s'ils ont la même date et le même libellé (utile à la fusion à l'import, cf. B3).

### Frise

La frise **est** la liste ordonnée des évènements du document, il n'y a pas d'autre état persisté.

## 4. User stories

### Épique A — Construire la frise

**A1 — Ajouter un évènement en quelques secondes**

> En tant que patient, je veux ajouter un évènement daté sans effort, afin de
> reconstituer mon histoire au fil de ce qui me revient.

C'est **le geste central du produit** : une séance de saisie, c'est trente évènements d'affilée. Tout ce qui coûte un clic de trop est payé trente fois, au moment précis où le patient a la tête ailleurs.

Critères d'acceptation :

- Le formulaire d'ajout est **visible en permanence** à côté de la frise.
- Il présente quatre champs :

  | Champ                           | Requis | Exemple             |
  | ------------------------------- | ------ | ------------------- |
  | **Date**                        | oui    | `juin 2023`         |
  | **Date de fin** _(optionnelle)_ | non    | `juillet 2024`      |
  | **Description**                 | oui    | `Perte d'un proche` |
  | **Couleur** _(optionnelle)_     | non    | `rose`              |

- Les champs de date sont des **champs texte libres**. Ils acceptent exactement les mêmes écritures que le fichier (§5) — `1998`, `juin 2023`, `12 juin 2022`, `06/2023`… C'est la saisie de référence : elle seule couvre les trois précisions du modèle, et notamment l'année seule (« vers 1998 »), le cas le plus fréquent pour les souvenirs anciens.
- Un **sélecteur de mois** (icône calendrier dans le champ) permet aussi de choisir la date. Il écrit dans le champ la même chose que ce qu'on aurait tapé (« juin 2023 »), et travaille au mois : ni le jour, ni l'année seule ne passent par lui. Il ne remplace donc pas la saisie texte — un calendrier seul rendrait le formulaire moins expressif que le fichier.
- Les **teintes sont toutes affichées**, pas cachées derrière un bouton : le choix d'une couleur vaut un clic, pas trois.
- **`Entrée` valide** depuis les champs de date ; depuis la description, qui est une zone de texte où `Entrée` fait un retour à la ligne, c'est **`⌘`+`Entrée`** — indiqué sous le champ. Le formulaire se vide ensuite, le focus revient sur _Date_, prêt pour l'évènement suivant.
- À la validation, l'évènement apparaît immédiatement sur la frise, et la vue défile jusqu'à lui.
- Une date incomprise empêche l'enregistrement, avec un message explicite et non culpabilisant, qui montre quoi écrire plutôt que ce qui est faux.

**A2 — Représenter une période**

> En tant que patient, je veux représenter une période (ex. « lycée, 2003–2006»),
> afin de distinguer ce qui a duré de ce qui a été ponctuel.

Critères d'acceptation :

- Le champ _Date de fin_ est optionnel. Le remplir crée une période, le laisser vide crée un évènement ponctuel.
- Une période s'affiche comme un **bandeau au-dessus** des évènements qu'elle recouvre (A4) ; un évènement ponctuel comme une carte de la suite.
- Le début et la fin peuvent avoir des précisions différentes
  (`12 juin 2022 à juillet 2024`).
- Écrire `aujourd'hui` dans le champ de fin marque une période toujours en cours.
- La date de fin doit être postérieure ou égale à la date de début ; sinon, un message clair le signale sans effacer la saisie.

**A3 — Modifier / supprimer un évènement**

> En tant que patient, je veux corriger ou retirer un évènement, afin que la frise
> reste juste.

Critères d'acceptation :

- Un clic sur une carte ou un bandeau de la frise ouvre directement son édition : il n'y
  a pas de liste séparée à tenir à jour en parallèle du dessin.
- Le formulaire d'édition présente exactement les mêmes champs que celui d'ajout, à la
  même largeur, avec les mêmes règles de saisie de date. La suppression s'y trouve
  aussi, pour ne pas avoir à la chercher ailleurs.
- La suppression demande une confirmation.
- Une suppression est annulable pendant quelques secondes (toast « Annuler »).

**A4 — Lire la suite des évènements**
> En tant que patient, je veux voir l'enchaînement de mon histoire d'un coup d'œil,
> sans qu'un vide de vingt ans m'oblige à faire défiler dans le désert.

La frise n'est **pas une échelle proportionnelle**. Les évènements ponctuels forment une
suite de colonnes accolées : deux dates séparées de deux mois voisinent comme deux
séparées de vingt ans. Ce qu'on lit ici, c'est l'enchaînement et ce qui a été écrit — la
distance entre deux dates, elle, se lit sur les dates elles-mêmes.

Critères d'acceptation :
- Les cartes sont posées côte à côte, par ordre chronologique, sans espace
  proportionnel à l'écart entre les dates.
- Un **jalon d'année** s'intercale à chaque changement d'année. Seules les années
  réellement occupées apparaissent : aucune année vide n'est comblée.
- Une **période** n'est pas une carte de la suite : c'est un **bandeau posé au-dessus**
  des cartes qu'elle recouvre. « Lycée, 2003 à 2006 » chapeaute ainsi les évènements de
  ces années-là, et ne déborde pas sur ceux qui tombent en dehors.
- Une période qui ne recouvre aucun évènement garde sa place : une colonne vide lui est
  réservée, à sa date.
- Deux périodes qui se chevauchent s'empilent sur des étages successifs plutôt que de
  se recouvrir.
- Chaque carte et chaque bandeau portent leur date, ou leurs deux dates, et leur
  description **entière**.
- La frise défile horizontalement quand elle dépasse la largeur disponible.

*Ce que ce choix coûte, et qui est assumé* : la frise ne montre plus le **rythme** d'une
vie — les années denses et les années creuses se ressemblent. En échange, chaque
évènement est lisible en entier, ce qu'aucune échelle proportionnelle ne permettait, et
les périodes retrouvent ce qu'elles disent : ce sous quoi le reste s'est déroulé.

**A5 — Regrouper par thème** _(v1.1, à valider)_

> En tant que patient, je veux regrouper mes évènements par thème, afin de faire
> apparaître des motifs.

Le format porte désormais une **catégorie**, après la couleur (§5) : `# 2003 à 2006;
rose; scolarité`. Elle a été introduite pour que l'application retrouve ce qu'elle a
posé (A7), et elle se prête au regroupement — il reste à lui donner une interface.

Critères d'acceptation :

- Une légende liste les catégories rencontrées et permet d'en masquer/afficher une
  d'un clic.
- La catégorie se saisit et se retire depuis le formulaire, sans passer par le fichier.
- La palette par défaut reste sobre et lisible en niveaux de gris (contrainte
  d'impression noir & blanc).
- Un libellé sans étiquette reste parfaitement valide.

**A7 — Poser mes années d'école**

> En tant que patient, je veux que mes années d'école apparaissent d'un coup à partir
> de ma date de naissance, afin de ne pas saisir une à une quinze périodes que je
> connais sans les avoir en tête.

Une scolarité est **déductible** : en France, la classe se fait par année civile de
naissance, et l'année scolaire court de septembre à juin. Qui sait sa date de naissance
sait donc, sans le savoir, quand il est entré au CP. C'est le seul endroit du produit
où l'application propose des évènements — ailleurs, elle ne devine jamais.

Critères d'acceptation :

- Une modale demande la **date de naissance**, puis les étapes du parcours : crèche ou
  nounou, maternelle, primaire, collège, lycée, CAP, études supérieures.
- Chaque étape se coche, se retire, et **se règle en années** — une durée plus longue
  décale tout ce qui suit, sans avoir à le redire. L'application ne demande pas
  pourquoi : redoublement, année sabbatique, réorientation, maladie ne la regardent
  pas, et la nommer serait une manière de juger.
- Une étape sautée ne décale rien : la suivante reprend à sa rentrée normale.
- Un **aperçu** montre les périodes, avec leurs dates, avant qu'elles n'existent.
- Ce qui est posé est une frise ordinaire : chaque période se corrige ensuite carte par
  carte, y compris sa description et sa couleur.
- Les périodes posées portent la catégorie `scolarité` (et la naissance `naissance`) :
  refaire le parcours **remplace les précédentes** sans toucher au reste de la frise.

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
- L'impression ne contient que la frise, son titre et ses jalons : aucun élément
  d'interface (boutons, menus, barres d'outils).
- Chaque carte imprimée porte sa **description entière**, paragraphes compris : la
  feuille est un document complet, pas un aperçu.
- L'espace laissé libre reste annotable au crayon en séance.
- Le rendu reste lisible en noir & blanc.
- Une mention discrète en pied de page : titre de la frise + date d'impression +
  numéro de page.

**C2 — Imprimer sur plusieurs feuilles A4**

> En tant que patient, je veux que ma frise soit répartie sur plusieurs feuilles, afin
> de ne pas devoir tout tasser sur une seule page illisible.

Critères d'acceptation :

- L'aperçu affiche le nombre de feuilles et la période couverte par chacune.
- Les cartes se suivent d'une feuille à l'autre, dans l'ordre : une carte n'est jamais
  coupée en deux, puisque le découpage se fait **entre** les cartes.
- Chaque feuille porte **deux lignes de frise**, lues de gauche à droite puis de haut
  en bas : une A4 en paysage est bien plus large que haute, et une seule ligne y
  laissait les deux tiers du papier vides.
- Une période à cheval sur deux lignes — ou sur deux feuilles — est **reconduite sur
  chacune** : son bandeau chapeaute partout les évènements qui s'y trouvent.
- La répartition est **automatique** : elle est calculée en mesurant les cartes telles
  qu'elles seront imprimées, et non réglée à la main (§6).
- Chaque feuille indique la période qu'elle couvre (« 1992 → 2001 ») et une mention de
  raccordement (« suite page 3 »).
- L'orientation est réglable : paysage par défaut, portrait proposé.
- Le nombre de feuilles est borné : au-delà d'un seuil (10), un avertissement le signale.
- Une feuille dont le contenu **déborde malgré tout** — une description plus haute
  qu'une page — est signalée dans l'aperçu plutôt que rognée en silence.

**C3 — Exporter en image / PDF** _(souhaitable, v1.1)_

> En tant que patient, je veux enregistrer ma frise en image ou en PDF, afin de
> l'envoyer à mon thérapeute ou de l'imprimer ailleurs.

Note : le PDF passe par l'impression système (« Imprimer → Enregistrer au format PDF »),
ce qui évite d'embarquer une librairie PDF et donne un document au texte sélectionnable
plutôt qu'une image. L'export en image, lui, demanderait une conversion du DOM et reste
à évaluer.

---

## 5. Format de stockage et d'échange

**Un seul format, pour tout** : le même document texte est ce qui est stocké dans le
navigateur, ce qui est exporté et ce qui est importé. Pas de conversion, donc pas de
perte possible entre les trois.

### Exemple

```text
Mon histoire, commencée en thérapie.

# 1987; emerald
Naissance

# 2003 à 2006; rose
Lycée
Trois années difficiles, loin de ma famille.

J’y ai quand même rencontré Camille.

# 12 juin 2022 à aujourd'hui; sky
Thérapie

# septembre 2003 à juin 2006; amber; scolarité
École maternelle
```

### Grammaire

Une ligne commençant par `#` ouvre un évènement et porte sa date ; **tout ce qui suit
jusqu'au prochain `#` est sa description**.

```text
# <date ou période>[; <couleur>][; <catégorie>]
<description, sur autant de lignes qu'il le faut>
```

À l'écriture, l'application est plus stricte que cette grammaire : **elle met toujours
une couleur**, puisque le formulaire en propose une d'office. Ce que l'on relit dans un
fichier exporté a donc toujours la forme `# <date>; <couleur>[; <catégorie>]`. Les
crochets ne valent que pour la lecture — d'un fichier écrit ou corrigé à la main.

- **La ligne `#` — la date.** Soit une date seule, soit une période `<date> à <date>`.
  Trois précisions possibles : `2024` (année), `juin 2023` (mois), `12 juin 2022`
  (jour). Le début et la fin d'une période peuvent avoir des précisions différentes.
  `aujourd'hui` comme date de fin marque une période toujours en cours.
- **La couleur**, après un `;`, est le **nom d'une teinte** de la palette (`rose`,
  `emerald`, `slate`), éventuellement avec sa nuance (`sky-700`). Un nom plutôt qu'un
  code hexadécimal, parce que le fichier doit rester lisible — « rose » dit quelque
  chose à qui l'ouvre, « #ff2056 » non. L'application en écrit toujours une ; son
  absence n'est tolérée qu'à la lecture, et l'évènement prend alors la couleur du
  thème.
- **La catégorie**, après la couleur, est facultative : une étiquette libre
  (`scolarité`, `travail`). Elle sert d'abord à l'application, qui retrouve par elle
  les évènements qu'elle a posés — les années d'école — pour les refaire sans toucher
  au reste. Comme la position seule les distingue, un mot unique qui n'est pas une
  teinte connue est lu comme une catégorie : le cas ne se présente que dans un fichier
  écrit à la main, puisque l'application écrit toujours la couleur.
- **La description** occupe les lignes suivantes. Elle est obligatoire, et **libre** :
  plusieurs paragraphes, de la ponctuation, des points-virgules — rien n'y est
  réservé. Sa **première ligne** sert d'étiquette sur la frise.
- Les lignes précédant le premier `#` forment un **préambule** libre — un titre, une
  note d'intention — conservé tel quel.
- L'ordre des évènements dans le fichier n'a pas d'importance : la frise trie par date.

Une seule contrainte, conséquence directe de la règle : **une ligne de description ne
peut pas commencer par `#`**, puisque ce caractère ouvre l'évènement suivant. Une telle
ligne est traitée comme un en-tête, jugée incompréhensible, et signalée — jamais avalée
en silence.

### Lecture tolérante, écriture canonique

L'application est **souple à la lecture** — un fichier écrit ou corrigé à la main doit
« juste marcher » — et **régulière à l'écriture**.

Acceptés en lecture :

| Variante                  | Exemples                                           |
| ------------------------- | -------------------------------------------------- |
| Casse et accents des mois | `Juin`, `juin`, `fevrier`, `février`               |
| Abréviations              | `janv.`, `fév`, `sept 2001`                        |
| Dates numériques          | `06/2023`, `12/06/2022`, `2023-06`, `2022-06-12`   |
| Séparateurs de période    | `à`, `a`, `->`, `→`, `–`, ou `-` entouré d'espaces |
| Période ouverte           | `2020 à aujourd'hui`, `depuis 2020`                |
| Espaces superflus         | autour du `;` et en fin de ligne                   |
| Couleur                   | `rose`, `Rose`, `sky-700`                          |

Écrits à l'export (forme canonique) : mois en toutes lettres en français
(`12 juin 2022`, `juin 2023`, `2024`), séparateur de période `à`, **couleur toujours
présente** après `; ` en minuscules, catégorie ensuite si l'évènement en porte une, un
évènement par bloc séparé d'une ligne vide, blocs triés par ordre chronologique.

**Ordre des blocs à l'écriture.** Le préambule reste en tête, les évènements suivent
par ordre chronologique, et les blocs incompris sont réécrits en fin de fichier dans
leur ordre d'origine. Rien n'est perdu, mais un bloc fautif placé au milieu migre à la
fin.

**Conséquence assumée** : un fichier importé puis réexporté ressort normalisé —
`06/2023` devient `juin 2023`, les lignes sont retriées. Le sens est intégralement
préservé, la mise en forme d'origine ne l'est pas.

### Robustesse : aucune ligne n'est jamais perdue

C'est la contrepartie indispensable d'un format éditable à la main.

- Un bloc que l'application ne sait pas interpréter — date illisible, teinte inconnue,
  évènement sans description — est **conservé tel quel**, avec sa description, et
  **réécrit à l'identique** au prochain enregistrement comme à l'export.
- L'interface signale sa présence sans dramatiser, affiche la ligne fautive et la
  raison, et propose de l'abandonner.
- Une teinte inconnue invalide le bloc entier plutôt que d'être ignorée : effacer
  silencieusement une couleur écrite à la main serait perdre ce que le patient a voulu
  dire.
- L'application ne réécrit jamais un bloc dont elle n'est pas sûre, et ne refuse jamais
  d'ouvrir un document à cause d'un bloc fautif.

### Ce que le format ne porte pas

Ni identifiants, ni état de la vue, ni métadonnées de version. C'est
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

| Sujet       | Choix                                                        | Motivation                                                                   |
| ----------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Framework   | Nuxt 4 (déjà en place)                                       | Base du dépôt, DX, routing, build statique                                   |
| UI          | Nuxt UI 4 + Tailwind 4                                       | Composants accessibles prêts à l'emploi, mode sombre                         |
| Frise       | Composant maison, en HTML                                    | Seul moyen d'afficher une description entière dans un évènement (§6)         |
| Persistance | Le document texte de §5, stocké tel quel dans `localStorage` | Un format unique pour stocker, exporter et importer ; lisible par le patient |
| Déploiement | **Site statique, sans backend**                              | Aucune donnée ne doit pouvoir transiter par un serveur                       |

### Contraintes d'architecture

- **Pas de rendu côté serveur des données patient.** L'application est une SPA statique
  (`ssr: false` ou prerender complet). La frise ne s'hydrate qu'au client, après lecture
  du `localStorage`.
- **Aucune ressource externe au runtime** : polices, icônes et scripts sont embarqués
  dans le bundle. Pas de CDN, pas de Google Fonts, pas d'analytics, pas de Sentry.
- Un **en-tête CSP** strict (pas de `connect-src` externe) rend la promesse de
  confidentialité vérifiable, et pas seulement déclarative.
- **Toute la logique métier (parseur, sérialiseur, validation, rangement des feuilles)
  est indépendante de l'affichage** et testée unitairement. Le composant de frise ne
  décide de rien : il met en forme ce que ces modules produisent.
- Le **parseur / sérialiseur du format texte est le cœur du produit** : c'est lui qui
  garantit la promesse « vos données vous appartiennent ». Il est écrit en premier,
  isolé de toute dépendance UI, et couvert par des tests d'aller-retour.

### Pourquoi un rendu maison plutôt qu'une librairie de frise

Le projet est parti de [Tempis](https://github.com/tempis-dev/tempis), une librairie de
frise rendue sur canvas. Elle a été abandonnée, et la raison mérite d'être écrite : elle
ne tient pas à un défaut de la librairie, mais à une exigence du produit.

**Une étiquette dessinée sur un canvas est écrite d'un seul trait.** Tempis la pose avec
un unique `fillText` et la tronque par des points de suspension dès que la place manque
— il n'y a pas de retour à la ligne possible. Or ce produit demande exactement le
contraire : la description que le patient a écrite doit se lire **en entier**, dans
l'évènement, à l'écran comme sur le papier. Aucun réglage ne rattrape cela.

Trois autres constats, relevés pendant l'intégration, allaient dans le même sens :

| Constat                                                                                          | Conséquence                                                                             |
| ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Les noms de mois de l'axe sont écrits **en anglais en dur**.                                     | Il fallait réécrire un adaptateur de date complet.                                      |
| **`toImage({ dpr })` ne re-rend pas** à la résolution demandée : il agrandit le bitmap existant. | L'export image n'apportait aucune netteté ; l'impression restait tributaire de l'écran. |
| Changer les options **reconstruit l'instance**.                                                  | Tout changement de cadrage passait par des contournements.                              |

**Ce que le HTML donne en échange** : le texte s'écoule et revient à la ligne ; il
s'imprime à la résolution de l'imprimante et non à celle de l'écran, ce qui fait
disparaître d'un coup le problème de netteté ; il se sélectionne, se cherche, et se
laisse lire par un lecteur d'écran — la frise n'a plus besoin d'une alternative
accessible, elle _est_ accessible.

Ce qu'on perd : le rendu de milliers d'évènements en restant fluide. Sur une frise de
vie — quelques dizaines d'évènements — ce ne fut jamais l'enjeu.

### Impression : mesurer plutôt que régler

Les feuilles restent composées dans un espace de **2100 px de large**, réduit en CSS à
la largeur utile d'une A4 : cela permet d'exprimer toutes les tailles dans une seule
unité. Mais le texte étant du vrai texte, il s'imprime à la résolution de l'imprimante
quelle que soit la densité de pixels de l'écran — la contrainte qui avait dicté ce
choix a disparu, seule la commodité reste.

**Combien de cartes par feuille ?** La question n'a pas de réponse fixe : une
description de dix lignes n'occupe pas la même place qu'un titre seul. Plutôt que de
demander au patient de deviner avec un curseur de densité, l'aperçu **rend toutes les
colonnes hors écran, à la taille exacte du papier, les mesure, puis les range** — sur
deux lignes par feuille. La pagination reflète donc ce qui a réellement été écrit. Les
bandeaux de période ne comptent pas dans ce rangement : ils ne prennent pas de place
dans la suite, ils la chapeautent.

**Les fonds de couleur.** Un navigateur n'imprime pas les arrière-plans sans que
l'utilisateur coche « graphiques d'arrière-plan » — sans quoi barres de période,
pastilles et jalons disparaissent de l'enregistrement en PDF. La feuille déclare donc
`print-color-adjust: exact` : la couleur choisie par le patient arrive sur le papier
sans qu'il ait à connaître une case à cocher.

### La palette, lue dans Tailwind plutôt que recopiée

Les teintes proposées sont celles du Tailwind installé, lues dans le paquet lui-même
(`tailwindcss/colors`). Aucune valeur n'est recopiée dans le code : la palette suit la
version installée.

Ce n'est pas l'`exposeConfig` de `@nuxtjs/tailwindcss` : ce module expose une
configuration JavaScript, or Tailwind 4 se configure en CSS et n'est ici même pas
installé de cette façon — c'est `@nuxt/ui` qui l'intègre.

Tailwind 4 n'exprime plus ses couleurs qu'en `oklch()`, et cela suffit : elles ne
servent qu'à être écrites dans du CSS, qui sait les lire. Le texte ne se pose jamais
sur un aplat coloré — une carte porte sa couleur en bordure, un bandeau en fond très
pâle — et sa lisibilité vient du thème, sombre sur clair et clair sur sombre. Aucun
calcul de contraste n'est donc nécessaire, et aucune conversion vers sRGB non plus.

## 7. Exigences non fonctionnelles

- **Langue** : interface en français.
- **Accessibilité** : navigation clavier complète, contrastes AA, `prefers-reduced-motion`
  respecté. La frise étant rendue en HTML, elle **est** son alternative accessible : son
  texte se sélectionne, se cherche et se lit au lecteur d'écran — aucune liste parallèle
  à maintenir.
- **Hors-ligne** : l'application fonctionne sans connexion après le premier
  chargement. Un agent de service met ses fichiers en cache — il reçoit, il n'envoie
  rien : aucune donnée du patient n'y passe. Elle s'installe aussi comme application
  (manifeste), et s'ouvre alors directement sur la frise. Une nouvelle version ne
  s'applique pas d'elle-même : elle est proposée, pour ne pas recharger la page au
  milieu d'une phrase.
- **Performance** : fluide jusqu'à ~500 évènements (largement au-delà d'un usage réel).
- **Robustesse des données** : aucune action ne doit pouvoir corrompre le `localStorage`
  de façon irrécupérable ; en cas de contenu illisible, proposer une récupération plutôt
  qu'un écrasement silencieux.

---

## 8. Risques & décisions à prendre

| #   | Risque / question                                                                                                                                                                                               | Piste                                                                                                                                                                         |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Perte de données** : vider le cache du navigateur détruit la frise — et il s'agit d'un travail thérapeutique long et coûteux émotionnellement.                                                                | Message explicite (B1) + invitation à exporter après chaque session de saisie + rappel si aucun export depuis N modifications.                                                |
| 2   | **Confidentialité sur poste partagé** : le `localStorage` est lisible en clair par quiconque ouvre le navigateur.                                                                                               | v1 : l'assumer et le dire clairement. v2 : chiffrement du contenu par phrase de passe (WebCrypto) — mais un mot de passe oublié = données perdues, arbitrage produit à faire. |
| 3   | **Charge émotionnelle** : la saisie peut réactiver des souvenirs douloureux.                                                                                                                                    | Ton neutre, aucun rappel intrusif, pas de notification. Envisager une mention « faites une pause » et l'indication que l'outil ne remplace pas un accompagnement.             |
| 4   | **Cadre médical** : l'outil ne doit pas se présenter comme un dispositif de soin.                                                                                                                               | Mention claire : outil de support, à utiliser avec un professionnel ; aucun conseil thérapeutique généré par l'application.                                                   |
| 5   | **Ambiguïté du format texte** : une ligne écrite à la main peut être mal interprétée (mois inconnu, `;` de trop, libellé ressemblant à une date). Une mauvaise interprétation silencieuse est pire qu'un refus. | Lecture tolérante mais **jamais devinette** : en cas de doute, la ligne est conservée intacte et signalée (§5). Aperçu systématique avant import.                             |
| 6   | Qualité d'impression multi-pages (voir §6).                                                                                                                                                                     | Spike technique dès le début du développement — c'est le risque technique n°1.                                                                                                |
| 7   | **Aucune librairie de frise** : la mise en page de la frise est à notre charge, y compris ses cas tordus (description très longue, écran étroit).                                                               | Le rangement des cartes est pur et testé ; l'aperçu d'impression mesure le rendu réel plutôt que de l'estimer.                                                                |

---

## 9. Jalons

**M0 — Spikes** ✅
Intégration d'une librairie de frise, puis **abandon au profit d'un rendu maison** : une
étiquette dessinée sur un canvas ne peut pas porter une description entière.
_Raisonnement consigné en §6._

**M1 — Le format** ✅
Parseur et sérialiseur du document texte, tests d'aller-retour, préservation des lignes
invalides.

**M2 — Frise utilisable** ✅
CRUD évènements (ponctuels + périodes), déduction de l'échelle, persistance du document
en `localStorage`.

**M3 — Maîtrise des données** ✅
Export `.txt`, import avec aperçu et fusion, modale « Vos données », tout effacer.

**M4 — Impression** ✅
Aperçu paginé, orientation, répartition mesurée des cartes, couleurs forcées au papier.

**M5 — Finitions** — reste à faire
Étiquettes `#` et légende (A5), mode hors-ligne (service worker), export image (C3),
passe d'accessibilité complète.
