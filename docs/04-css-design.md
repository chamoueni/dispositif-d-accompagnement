# 04 — CSS et design

## 1. Organisation des fichiers

Le style vient de quatre sources, chargées dans cet ordre par [src/main.js](../src/main.js) :

| Ordre | Fichier | Rôle |
|---|---|---|
| 1 | [src/styles/bootstrap-custom.scss](../src/styles/bootstrap-custom.scss) | Recompile **Bootstrap 5** avec les couleurs, arrondis et polices du projet |
| 2 | [src/assets/theme.css](../src/assets/theme.css) | Couleurs du thème clair et du thème sombre, alias, mode confort |
| 3 | [src/index.css](../src/index.css) | Polices, taille du texte, titres `h1` / `h2`, fond de page |
| 4 | [src/styles/ui.css](../src/styles/ui.css) | Réglages communs des boutons, classes `.section-label` et `.badge-role` |

Ensuite, **chaque page ou composant importe son propre fichier CSS** depuis son `<script setup>` (exemple : `import '../styles/Profil.css'`). Ces fichiers ne sont **pas isolés** : une classe définie dans `Profil.css` s'applique à tout le site une fois la page visitée. Les noms de classes sont donc préfixés par le sujet (`.dispo-…`, `.sos-…`, `.admin-…`) pour éviter les collisions.

Sept fichiers gardent leurs styles dans un bloc `<style scoped>` (isolé) : `App.vue`, `ConnexionBanner.vue`, `ThemeSwitcher.vue`, `DrapeauLangue.vue`, `IconeAction.vue`, `admin/AdminIcon.vue`, `admin/StatCard.vue`.

### Quel fichier contrôle quoi

| Partie du site | Fichier |
|---|---|
| Barre de navigation, lien d'évitement | `styles/AppNav.css` |
| Pied de page, espace réservé sous la navbar | bloc `<style scoped>` de `App.vue` |
| Page d'accueil (hero, sections, cartes) | `styles/Accueil.css` |
| Vignette carte de Mayotte | `styles/CarteMayotte.css` |
| Cartes de formules | `styles/FormulesSection.css`, `styles/PaiementBandeau.css` |
| Bouton SOS, menu, chat | `styles/SosButton.css` |
| Sélecteur de langue | `styles/SelecteurLangue.css` |
| Questionnaire assistant | `styles/AssistantBesoin.css` |
| Calendrier de disponibilités, page profil | `styles/Profil.css` |
| Liste des demandes, code d'arrivée | `styles/MesDemandes.css` |
| Connexion, mot de passe oublié, réinitialisation | `styles/Connexion.css` |
| Inscription (choix du rôle) | `styles/Inscription.css` |
| Tout l'espace admin (coquille, sidebar, boutons, tableaux, panneau latéral) | `styles/Admin.css` |
| Pages admin | `styles/AdminDashboard.css`, `AdminComptes.css`, `AdminAdherents.css`, `AdminDemandes.css`, `AdminMessages.css`, `AdminLogin.css` |
| Boutons de tout le site | `styles/ui.css` |

Plusieurs fichiers ne contiennent que quelques lignes (marges de page) : `Atouts.css`, `ProviderCard.css`, `Recherche.css` (3 lignes chacun).

## 2. Variables (design tokens)

Les couleurs sont des **variables CSS** définies dans [theme.css](../src/assets/theme.css). Changer une valeur ici change tout le site.

### Couleurs de base

| Variable | Clair | Sombre | Usage |
|---|---|---|---|
| `--bg` | `#f4f1ea` | `#141b1b` | Fond de page |
| `--surface` | `#ffffff` | `#1c2525` | Cartes, champs |
| `--surface-2` | `#fbf9f4` | `#172020` | Fonds secondaires |
| `--border` | `#e7e1d6` | `#2c3838` | Bordures |
| `--ink` | `#1f2a2a` | `#ede8df` | Texte principal |
| `--muted` | `#5b6461` | `#a7b0ad` | Texte discret |
| `--teal` | `#0e6e6b` | `#3fb3ad` | Couleur principale |
| `--coral` | `#c2502f` | `#f08a6b` | Danger, urgence |
| `--ylang` | `#e3a92b` | `#f0c766` | Couleur d'accent secondaire |
| `--green` | `#1e6b47` | `#6fcb9e` | Succès |

Chaque couleur a aussi une variante `-soft` (fond pâle) et `-text` (texte lisible sur ce fond).

### Alias

Le code plus ancien utilise d'autres noms. `theme.css` les fait pointer vers les couleurs de base : `--text` et `--text-h` → `--ink`, `--accent` → `--teal`, `--accent-2` → `--ylang`, `--danger` → `--coral`, `--card-bg` → `--surface`, `--bg-alt` → `--surface-2`, `--couleur-bouton` → `--teal`, `--couleur-bouton-survol` → `--teal-text`, `--couleur-bouton-texte` → `--on-teal`.

### Variables Sass de Bootstrap

[bootstrap-custom.scss](../src/styles/bootstrap-custom.scss) fixe : `$primary: #0e5c56`, `$secondary: #e3a234`, arrondi des cartes `0.9rem`, boutons et badges en pilule (`50rem`), marges intérieures de boutons agrandies.

**Piège à connaître** : Bootstrap est compilé une seule fois, en clair. Ses couleurs ne suivent donc pas le thème sombre automatiquement. `theme.css` contient une liste de corrections manuelles (`[data-theme='dark'] .card`, `.form-control`, `.alert-…`, `.table`, `.text-muted`). Un composant Bootstrap non listé resterait clair en mode sombre.

### Variable calculée en JavaScript

`--hauteur-nav` est écrite par `mesurerHauteur()` dans [AppNav.vue](../src/components/AppNav.vue) et lue par `.app-main` dans `App.vue` : `padding-top: calc(var(--hauteur-nav, 96px) + 32px)`. C'est ce qui empêche le contenu de passer sous la barre fixe.

## 3. Thème clair / sombre

- L'attribut `data-theme="light"` ou `"dark"` est posé sur `<html>`.
- Il est écrit d'abord par le script de [index.html](../index.html) (anti-flash), puis par [useTheme.js](../src/composables/useTheme.js).
- Valeur par défaut : `auto`, qui suit le réglage du système (`prefers-color-scheme`).
- En sombre, les images sont légèrement assombries (`filter: brightness(0.9)`), sauf le logo.

## 4. Typographie

| Élément | Police | Taille |
|---|---|---|
| Texte courant | Inter | 18 px ; 16 px en dessous de 1024 px de large |
| Titres `h1`, `h2` | Fraunces | `h1` 56 px (36 px ≤ 1024 px) ; `h2` 24 px (20 px ≤ 1024 px) |
| Titre du hero | Fraunces | 46 px (32 px ≤ 480 px) — `Accueil.css` |
| Espace admin | Nunito Sans (texte), Fraunces (titres) | 15 px — `Admin.css` |

Les polices viennent de Google Fonts, avec `display=swap` : le texte s'affiche tout de suite dans une police de secours.

## 5. Mise en page et positionnement

- **Grille Bootstrap** (`container`, `row`, `col-md-6`…) dans la plupart des pages.
- **CSS Grid** pour : le hero de l'accueil (`.hero-inner`, 2 colonnes), le pied de page (`.footer-grid`, 4 colonnes), le calendrier de disponibilités (`.dispo-calendrier-ligne`, `64px repeat(7, 1fr)`), les colonnes de suivi admin.
- **Flexbox** pour : la coquille admin (`.admin-shell`), les boutons (`.btn` en `inline-flex`), les menus.

### Éléments fixes et ordre d'empilement (`z-index`)

| Élément | Position | `z-index` | Fichier |
|---|---|---|---|
| Bandeau hors-ligne | `fixed` | 2000 | `ConnexionBanner.vue` |
| Panneau latéral admin (création de compte) | `fixed` | 1050 | `Admin.css` |
| Lien d'évitement | `fixed` | 1040 | `AppNav.css` |
| Bouton SOS | `fixed`, en bas à droite (20 px) | 1040 | `SosButton.css` |
| Barre de navigation | `fixed`, à 14 px du haut | 1030 | `AppNav.css` |
| Vignette carte de Mayotte | — | 1020 | `CarteMayotte.css` |

La barre de navigation est une « carte flottante » : largeur `min(1400px, 100% - 20px)`, coins arrondis de 18 px, fond en dégradés superposés turquoise → vert.

## 6. Responsive

Il n'y a pas de fichier central de points de rupture. Chaque feuille définit les siens :

| Largeur | Où | Effet |
|---|---|---|
| ≤ 1280 px | `AdminDashboard.css`, `AdminDemandes.css` | Adaptation des grilles admin (détail dans le fichier) |
| ≤ 1024 px | `index.css`, `Admin.css`, `AdminDashboard.css` | Texte à 16 px ; la sidebar admin passe en haut et se replie derrière un bouton |
| ≤ 991 px / ≥ 992 px | `AppNav.css`, `Accueil.css`, `CarteMayotte.css` | Menu « burger » ; hero sur une colonne (c'est le seuil `lg` de Bootstrap) |
| ≤ 860 px | `AdminAdherents.css` | Adaptation de la page adhérents (détail dans le fichier) |
| ≤ 767 px | `App.vue` | Pied de page sur 2 colonnes |
| ≤ 640 px | `AdminComptes.css`, `AdminDemandes.css`, `AssistantBesoin.css` | Adaptation aux petits écrans (détail dans chaque fichier) |
| ≤ 575 px | `AppNav.css` | Adaptation du nom du site dans la barre |
| ≤ 560 px | `AdminDashboard.css`, `AdminAdherents.css` | Adaptation aux écrans étroits (détail dans le fichier) |
| ≤ 480 px | `Accueil.css`, `Profil.css` | Titre du hero réduit ; cases du calendrier plus petites |
| ≤ 420 px | `SelecteurLangue.css` | Adaptation du sélecteur de langue |

L'approche est « ordinateur d'abord » : les règles de base visent le grand écran, et les `@media (max-width: …)` corrigent pour les petits.

## 7. Animations et transitions

| Animation | Fichier | Effet |
|---|---|---|
| `reveal-card-in` | `Accueil.css` | Les cartes de services apparaissent en fondu quand elles entrent à l'écran (classe `is-visible` ajoutée par `Accueil.vue`) |
| `highlight-word-shimmer` | `HighlightWord.css` | Dégradé animé sur un mot du titre |
| `nav-deroule` | `AppNav.css` | Ouverture du menu mobile |
| `langue-menu-ouverture` | `SelecteurLangue.css` | Ouverture du menu des langues |
| `sos-parler-pulse` | `SosButton.css` | Pulsation pendant l'écoute vocale |
| `admin-panel-ouverture` | `Admin.css` | Glissement du panneau latéral |

Transitions de 0,15 à 0,2 s sur les boutons, cartes et champs (`ui.css`, `theme.css`).

Huit feuilles respectent `prefers-reduced-motion: reduce` et coupent leurs animations : `theme.css`, `ui.css`, `Accueil.css`, `AppNav.css`, `CarteMayotte.css`, `HighlightWord.css`, `SelecteurLangue.css`, `SosButton.css`. `Admin.css` ne le fait pas.

## 8. États des boutons

Définis dans [ui.css](../src/styles/ui.css) :

- **Survol** (`:hover`) : le bouton monte d'1 px et prend une ombre.
- **Appui** (`:active`) : il revient à plat.
- **Focus clavier** (`:focus-visible`) : contour de 3 px, décalé de 2 px.
- **Désactivé** : curseur « interdit », pas d'effet.

Les couleurs des variantes (`.btn-primary`, `.btn-outline-secondary`, `.btn-secondary`) sont réglées en réécrivant les variables `--bs-btn-*` de Bootstrap, pas avec `background-color`.

## 9. Accessibilité pour un public âgé

### Ce qui est présent

| Sujet | Mise en œuvre | Fichier |
|---|---|---|
| Taille du texte | 18 px par défaut sur grand écran | `index.css` |
| Mode confort | Bouton « Aa » ; classe `mode-confort` sur `<html>` : texte à 18 px sur tous les écrans, titres +20 %, interligne 1,6, champs et boutons à 52 px de haut minimum, texte discret plus foncé | `theme.css`, `stores/accessibility.js` |
| Zones cliquables | `.btn` : 44 px de haut minimum (52 px en confort) ; champs admin : 44 px ; bouton SOS : 64 px (76 px en confort) | `ui.css`, `Admin.css`, `SosButton.css` |
| Contraste des boutons | Un commentaire de `ui.css` indique un passage de 2,1:1 à environ 6,8:1 pour les boutons en contour | `ui.css` |
| Focus visible | Règles `:focus-visible` dans `ui.css`, `AppNav.css`, `SelecteurLangue.css`, `SosButton.css`, `CarteMayotte.css` ; contour renforcé sur tous les éléments en mode confort | — |
| Navigation clavier | Lien d'évitement « Aller au contenu » ; Échap ferme le menu mobile et le menu des langues ; flèches haut/bas dans le menu des langues | `AppNav.vue`, `SelecteurLangue.vue` |
| Lecteurs d'écran | Attribut `lang` de `<html>` mis à jour selon la langue ; `aria-label`, `aria-expanded`, `aria-pressed` sur les boutons à bascule ; `role="alert"` sur le bandeau hors-ligne ; `aria-live="polite"` dans le chat SOS | divers |
| Voix | Lecture à voix haute (`SpeakButton`), dictée (`DictateButton`), commande vocale du menu SOS | — |
| Mouvement réduit | `prefers-reduced-motion` respecté sur le site public | voir § 7 |
| Thème sombre | Oui, avec variante de couleurs dédiée | `theme.css` |

### Ce qui manque ou reste fragile

- **Cases du calendrier de disponibilités trop petites** : 32 px de haut, 26 px en dessous de 480 px (`.dispo-case` dans `Profil.css`), sous les 44 px appliqués ailleurs. Elles n'ont pas non plus de style `:focus-visible` propre hors mode confort.
- **Libellés du calendrier très petits** : 11 px et 12 px (`.dispo-calendrier-entete span`, `.dispo-calendrier-label`).
- **Texte de l'espace admin à 15 px**, plus petit que le reste du site.
- **Le mode confort change peu la taille du texte courant sur grand écran**, car la base y est déjà à 18 px ; il agit surtout sur les titres, l'interligne et la hauteur des zones cliquables.
- **Contrastes non vérifiés dans le dépôt** : aucun outil ni test de contraste n'est présent. Seul le cas des boutons est documenté en commentaire.
- **Dictée et commande vocale** : la reconnaissance vocale est réglée sur `fr-FR` et n'existe pas dans tous les navigateurs (commentaire de `useVoiceInput.js` : absente sur Firefox). Le bouton est alors masqué.
- **Lecture à voix haute en shimaoré et kibushi** : les dossiers `public/audio/shi/` et `public/audio/kib/` sont vides, donc c'est toujours le texte français qui est lu.
- **Pas de `<label for>` systématique** : dans `Profil.vue`, plusieurs `<label>` ne sont pas reliés à leur champ par `for` / `id`, contrairement à `Inscription.vue`.
- **`Admin.css` ne tient pas compte de `prefers-reduced-motion`**.

## À retenir

- Les couleurs se changent dans `src/assets/theme.css` ; les couleurs de Bootstrap dans `src/styles/bootstrap-custom.scss`.
- Chaque page importe son CSS, mais ces fichiers ne sont pas isolés : attention aux noms de classes.
- Bootstrap ne suit pas le thème sombre tout seul ; les corrections sont listées à la main dans `theme.css`.
- Les points de rupture principaux sont 1024 px (texte, admin) et 991/992 px (navbar, hero).
- L'accessibilité est soignée sur les boutons et la navigation ; le calendrier de disponibilités et l'espace admin sont les points faibles.
