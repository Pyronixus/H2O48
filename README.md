# 🧪 H2O48 : The Fusion Lab

Bienvenue dans **H2O48**, une réinterprétation moderne et fluide du célèbre jeu de réflexion 2048. Plongez dans un laboratoire numérique où la logique rencontre une esthétique dynamique et aquatique. Fusionnez les tuiles, gérez votre score et tentez d'atteindre la tuile ultime de **65 536** !

## ✨ Caractéristiques principales

* **Grille Étendue (6x6 par défaut, modifiable)** : Un espace de jeu plus vaste offrant plus de possibilités stratégiques et des scores plus élevés.
* **Système de Chronomètre** : Un mode optionnel pour suivre votre temps de jeu et ajouter une dimension de défi contre la montre.
* **Objectifs de tuile** : Choisissez votre tuile "suprême" à atteindre ou jouez chill avec l'objectif infini et dépassez vous avec les records d'objectifs (temps) enregistrés!
* **Interface Réactive** : Des animations de fusion et d'apparition soignées utilisant des transitions fluides, des filtres et de la perspective 3D.
* **Sauvegarde Persistante** : Votre meilleur score et vos records d'objectifs sont conservés localement pour vous permettre de vous dépasser à chaque session.
* **Accessibilité Hybride** : Jouez confortablement au clavier ou via l'interface tactile et les boutons intégrés.

---

## 🎮 Comment Jouer ?

Le but est de faire glisser des tuiles numérotées sur une grille pour les combiner et créer une tuile avec le nombre **65 536** (ou tout autre objectif choisit :) ).

1.  **Déplacement** : Utilisez les **touches directionnelles** de votre clavier ou les **boutons fléchés** à l'écran.
2.  **Fusion** : Lorsque deux tuiles portant le même nombre se touchent, elles fusionnent en une seule dont la valeur est le double.
3.  **Apparition** : Après chaque mouvement, une nouvelle tuile (2 ou 4) apparaît aléatoirement dans un espace vide.
4.  **Score** : Chaque fusion augmente votre score actuel.

### ⚙️ Paramètres
En cliquant sur l'icône **paramètres**, vous pouvez accéder aux options suivantes :
* **Temps** : Activer ou désactiver l'affichage du chronomètre pour vos parties.
* **Rejouer** : recommencez votre partie et battez votre record.
* **Réinitialiser le meilleur score** : Remettre à zéro votre record personnel enregistré dans le navigateur.
* **Grille** : Choisissez par vous-même la taille de la grille de jeu pour pimenter ou simplifier le gameplay.
* **Objectifs** : définissez votre objectif de tuile à atteindre et surpassez vos temps pour y parvenir.
* **...** et bien d'autres ! 

---

## 🛠️ Détails Techniques

Le projet repose sur une architecture front-end pure (Vanilla JS), garantissant légèreté et rapidité.

### Technologies utilisées
| Composant | Technologie |
| :--- | :--- |
| **Structure** | HTML5 (Sémantique) |
| **Style** | CSS3 (Flexbox, Grid, Keyframes, Custom Properties) |
| **Logique** | JavaScript ES6+ |
| **Typographie** | Google Fonts (Bungee) |
| **Icônes** | Font Awesome & SVG |

### Architecture du code
* **Moteur de rendu** : Synchronisation entre un tableau logique en JavaScript et le DOM pour des performances optimales.
* **Animations** : Gestion des classes CSS dynamiques (`tile-new`, `tile-merged`, `tile-moving`) pour des retours visuels immédiats.
* **Stockage** : Utilisation de l'API `localStorage` pour la persistance du score et des records.

---

## 🚀 Installation locale

Pour lancer le "laboratoire" sur votre machine, aucune installation complexe n'est requise :

1.  Téléchargez les fichiers le zip via github : ouvrez code puis cliquez sur Download zip ou sinon clonez le dépôt git (https://github.com/Pyronixus/H2O48.git) dans un fichier sur votre ordinateur.
2.  Ouvrez le fichier `index.html` dans n'importe quel navigateur moderne (Chrome, Firefox, Edge, Safari).
3.  Fusionnez !

---

## 🎨 Design & Palette
Le jeu utilise un dégradé élégant de bleu et de violet évoquant l'élément aquatique. La palette de couleurs des tuiles évolue dynamiquement, allant du bleu cyan léger pour les petites valeurs jusqu'au noir profond avec des accents néons pour la tuile finale.

> **Note :** Ce projet est "Responsive". La grille s'adapte à la taille de votre écran pour une expérience fluide sur mobile comme sur ordinateur.
