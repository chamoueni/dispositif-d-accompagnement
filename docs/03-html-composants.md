# 03 — Composants

Un composant est un morceau d'interface réutilisable. Ils sont dans `src/components/` (et `src/components/admin/` pour l'espace admin). Les pages, elles, sont dans `src/pages/` et sont décrites dans [02-frontend.md](02-frontend.md).

## 1. Vocabulaire rapide

- **Props** : les valeurs que le parent passe au composant (`defineProps`).
- **Événements** : ce que le composant signale à son parent (`defineEmits`).
- **Slot** : un emplacement où le parent glisse son propre contenu.
- **État interne** : les `ref` / `reactive` que le composant garde pour lui.

Particularité du projet : beaucoup de composants **n'ont ni props ni événements**. Ils se branchent directement sur un état global (`useAuth()`, `useTheme()`, un store Pinia). Seuls 9 composants déclarent des props, et 2 émettent un événement.

## 2. Hiérarchie

```
App.vue
├── ConnexionBanner
├── AppNav                      (masqué dans l'espace admin)
│   ├── SelecteurLangue
│   │   └── DrapeauLangue
│   ├── ThemeSwitcher
│   └── IconBadge
├── <router-view>               → la page de la route active
└── SosButton                   (masqué dans l'espace admin)
    └── DictateButton

Pages publiques
├── Accueil          → CarteMayotte, FormulesSection, PaiementBandeau → IconBadge,
│                      HighlightWord, IconBadge, ServiceIcon, ReefDivider
├── Pourquoi         → BackLink, IconBadge
├── Services         → BackLink, ServiceIcon
├── PourQui          → BackLink
├── Atouts           → BackLink, IconBadge
├── AssistantBesoin  → BackLink, ServiceIcon, SpeakButton, IconeAction,
│                      ProviderCard → SpeakButton
├── Inscription      → ChampMotDePasse
├── Connexion        → ChampMotDePasse
├── MotDePasseOublie → (aucun)
└── ReinitialiserMotDePasse → ChampMotDePasse

Espace personnel
├── MonCompte           → IconBadge
├── Profil              → BackLink, ChampMotDePasse
├── RecherchePersonnel  → BackLink, ProviderCard → SpeakButton
├── NouvelleDemande     → BackLink, DictateButton
├── MesDemandes         → BackLink, IconeAction
├── MesAccompagnements  → BackLink, IconeAction
├── Historique          → BackLink, IconeAction
└── PaiementFormule     → BackLink

Espace admin
├── AdminLogin → IconBadge
└── Admin
    ├── AdminSidebar → AdminIcon, ThemeSwitcher
    └── <router-view>
        ├── AdminDashboard → StatCard → AdminIcon, AdminIcon
        ├── AdminComptes   → AdminIcon
        ├── AdminAdherents → AdminIcon
        ├── AdminDemandes  → (aucun)
        └── AdminMessages  → (aucun)
```

`MayotteSymbol.vue` existe mais **n'est utilisé par aucun fichier** (un commentaire de `Accueil.vue` le dit remplacé par `CarteMayotte`).

## 3. Circulation des données

Trois chemins existent dans le projet :

1. **Parent → enfant par props.** Exemple : `RecherchePersonnel` passe `:provider="provider"` à `ProviderCard`.
2. **Enfant → parent par événement.** Exemple : `DictateButton` émet `dictate` avec le texte reconnu ; `NouvelleDemande` l'écoute avec `@dictate="handleDictate"`.
3. **État global partagé.** Exemple : `AppNav` et `ProviderCard` lisent tous deux `user` via `useAuth()`, sans rien se passer.

## 4. Composants généraux

### AppNav — [AppNav.vue](../src/components/AppNav.vue)

- **Rôle** : barre de navigation fixe en haut du site public.
- **Props / événements** : aucun.
- **État interne** : `menuOuvert` (menu mobile), `estDefile` (page défilée), `barre` (référence à l'élément).
- **Dépendances** : `useAuth` (`user`, `isAdmin`, `logout`), `useRoute`, `useRouter`, `useI18n`, `assets/logo.png`, `styles/AppNav.css`.
- **Enfants** : `SelecteurLangue`, `ThemeSwitcher`, `IconBadge`.
- **Comportement** :
  - visiteur → liens Pourquoi, Services, Pour qui, Engagements, bouton Connexion ;
  - connecté non admin → lien Mon compte, plus « Trouver de l'aide » si `user.role === 'senior'`, nom abrégé (`nomAffiche`), Déconnexion ;
  - admin → bouton vers `/admin`.
- **Points techniques** : `mesurerHauteur` publie la hauteur réelle de la barre dans la variable CSS `--hauteur-nav`, que `App.vue` utilise pour décaler le contenu. Le menu mobile est piloté par Vue (pas par le JS de Bootstrap) et se referme au changement de page, à la touche Échap (`surTouche`) et au clic en dehors (`surClicDocument`). Le premier élément est un lien d'évitement vers `#contenu`.

### SosButton — [SosButton.vue](../src/components/SosButton.vue)

- **Rôle** : bouton flottant d'aide, présent sur tout le site public.
- **Props / événements** : aucun.
- **État interne** : `ouvert`, `vue` (`'menu'`, `'formulaire'`, `'chat'`), `message`, `historique`, `reponseEnCours`, `envoi`, `envoye`, `erreur`, `retourVocal`, `urgenceEnAvant`.
- **Dépendances** : `useAuth`, `useVoiceInput`, `addMessageContact` (store.js), `API_BASE_URL`.
- **Enfant** : `DictateButton`.
- **Fonctions importantes** :
  - `routerCommande(transcript)` : cherche des mots-clés (`MOTS_CLES`) dans la phrase dictée et ouvre la bonne vue. Pour « urgence », elle met le 112 en avant **sans lancer l'appel**.
  - Deux choix seulement : appeler le 112, ou écrire à l’équipe (`addMessageContact`, table `messages_contact`). Le chat assistant IA a été retiré le 9 novembre 2026.
  - `envoyerMessage()` : en mode chat, interroge l'IA ; en mode formulaire, appelle `addMessageContact`.
- **Lien d'urgence** : `href="tel:112"`.

### ConnexionBanner — [ConnexionBanner.vue](../src/components/ConnexionBanner.vue)

Bandeau affiché quand `enLigne` (de `useConnexion`) est faux. Aucune prop. Ses styles sont dans un bloc `<style scoped>` du fichier.

### CarteMayotte — [CarteMayotte.vue](../src/components/CarteMayotte.vue)

- **Rôle** : vignette de carte sur l'accueil, qui s'agrandit au survol (ou au toucher) et montre les intervenants par commune.
- **Props / événements** : aucun.
- **État interne** : `estOuverte`, `besoin` (`'tous'`, `'sante'`, `'coursier'`, `'menage'`), `nombreAffiche`.
- **Dépendances** : `leaflet`, `leaflet.markercluster`, `useAidants`, `getCoordonneesCommune` (store.js), `useAuth`.
- **Fonctions importantes** : `dessinerMarqueurs()` (replace les marqueurs à chaque changement de liste ou de filtre), `correspondAuBesoin(aidant)`, `ouvrir()` / `fermer()`, `iconeMaison()`, `iconeRegroupement()`.
- **À savoir** : l'ordre des deux imports Leaflet ne doit pas être inversé (expliqué en commentaire dans le fichier). Les infobulles sont construites en HTML par concaténation de chaînes avec `aidant.nom` (voir la remarque de sécurité dans [07-authentification-securite.md](07-authentification-securite.md)).

### ProviderCard — [ProviderCard.vue](../src/components/ProviderCard.vue)

- **Rôle** : fiche d'un intervenant dans les résultats.
- **Props** : `provider` (objet, obligatoire) — une ligne de la table `profiles`.
- **Événements** : aucun.
- **Calculé** : `resume`, le texte lu par le bouton « Écouter ».
- **Enfant** : `SpeakButton`.
- **Actions** : lien `tel:` vers `provider.telephone` ; lien vers `/nouvelle-demande/:id`, visible seulement si `user.role === 'senior'`.
- **Parents** : `RecherchePersonnel`, `AssistantBesoin`.

### FormulesSection — [FormulesSection.vue](../src/components/FormulesSection.vue)

Affiche les cartes de `FORMULES`. Aucune prop. Fonctions : `estFormuleActive(formule)`, calculé `peutSouscrire` (visiteur ou personne âgée). Parent : `Accueil`.

### PaiementBandeau — [PaiementBandeau.vue](../src/components/PaiementBandeau.vue)

Quatre messages de réassurance (constante `GARANTIES`). Enfant : `IconBadge`. Parent : `Accueil`.

### SelecteurLangue — [SelecteurLangue.vue](../src/components/SelecteurLangue.vue)

- **Rôle** : menu déroulant pour choisir la langue.
- **État interne** : `ouvert`, `racine`, `options`.
- **Fonctions** : `choisir(code)` change `locale`, appelle `enregistrerLangue` et met à jour l'attribut `lang` de `<html>` ; `surToucheOption` gère les flèches haut/bas et Échap.
- **Enfant** : `DrapeauLangue`. **Parent** : `AppNav`.

### DrapeauLangue — [DrapeauLangue.vue](../src/components/DrapeauLangue.vue)

Icône SVG d'une langue. Prop : `code` (`'fr'`, `'shi'`, `'kib'`, obligatoire).

### ThemeSwitcher — [ThemeSwitcher.vue](../src/components/ThemeSwitcher.vue)

Deux boutons ronds : thème clair/sombre (`basculerThemeDirect`) et mode confort (`basculerConfort`). Aucune prop. Dépend de `useTheme` et `useAccessibility`. Parents : `AppNav`, `AdminSidebar`. Styles dans le fichier.

### ChampMotDePasse — [ChampMotDePasse.vue](../src/components/ChampMotDePasse.vue)

- **Rôle** : champ mot de passe avec bouton Afficher / Masquer.
- **Props** : `modelValue` (texte), `id` (obligatoire), `autocomplete` (défaut `current-password`), `required`.
- **Événement** : `update:modelValue` — c'est ce qui permet d'écrire `v-model="form.password"` côté parent.
- **État interne** : `visible`.
- **Parents** : `Connexion`, `Inscription`, `Profil`, `ReinitialiserMotDePasse`.

### DictateButton — [DictateButton.vue](../src/components/DictateButton.vue)

Bouton micro. **Événement** : `dictate(transcript)`. Dépend de `useVoiceInput`. Le bouton ne s'affiche pas si le navigateur ne gère pas la reconnaissance vocale (`supported`). Parents : `NouvelleDemande`, `SosButton`.

### SpeakButton — [SpeakButton.vue](../src/components/SpeakButton.vue)

Bouton « Écouter ». **Props** : `text` (obligatoire, texte français à lire), `cle` (clé de traduction, facultative, sert à trouver un enregistrement audio). Dépend de `useSpeech`. Parents : `ProviderCard`, `AssistantBesoin`.

### BackLink — [BackLink.vue](../src/components/BackLink.vue)

Bouton « Retour » qui appelle `router.back()`. Aucune prop.

### Composants d'icônes et de décor

| Composant | Props | Rôle |
|---|---|---|
| [IconBadge.vue](../src/components/IconBadge.vue) | `name` (liste fermée : `profile`, `calendar`, `search`, `map-pin`, `bolt`, `shield-check`, `connect`, `home`, `phone`), `tone` (`accent` ou `accent-2`), `compact` | Icône ronde générique |
| [ServiceIcon.vue](../src/components/ServiceIcon.vue) | `type` (`soins`, `courses`, `menage`, `garde`, `psychologique`), `tone` (`default` ou `light`) | Icône d'un service |
| [IconeAction.vue](../src/components/IconeAction.vue) | `nom` (`historique`, `calendrier`, `refaire`, `recherche`, `crayon`) | Petite icône devant un libellé |
| [HighlightWord.vue](../src/components/HighlightWord.vue) | aucune ; un **slot** | Mot en dégradé animé |
| [ReefDivider.vue](../src/components/ReefDivider.vue) | aucune | Ligne ondulée décorative |
| [MayotteSymbol.vue](../src/components/MayotteSymbol.vue) | aucune | Silhouette de l'île — **non utilisé** |

Toutes ces icônes sont des SVG dessinés dans le fichier : le projet n'utilise pas de bibliothèque d'icônes.

## 5. Composants de l'espace admin

### AdminSidebar — [AdminSidebar.vue](../src/components/admin/AdminSidebar.vue)

- **Rôle** : menu latéral de l'admin.
- **Props** : aucune. Les compteurs viennent des stores `useAdminDashboard` et `useAdherentsStore`.
- **État interne** : `ouvert` (menu mobile).
- **Calculés** : `liens` (5 entrées avec compteur ou pastille), `initiales`.
- **Action** : `seDeconnecter`.
- **Enfants** : `AdminIcon`, `ThemeSwitcher`.

### StatCard — [StatCard.vue](../src/components/admin/StatCard.vue)

Carte de chiffre clé. **Props** : `icone` (obligatoire), `tone` (défaut `teal`), `valeur` (obligatoire), `libelle` (obligatoire), `badgeTexte`, `badgeTone`, `lien`. Ne fait aucun calcul. Parent : `AdminDashboard`.

### AdminIcon — [AdminIcon.vue](../src/components/admin/AdminIcon.vue)

Icônes en trait fin. **Prop** : `nom` (obligatoire). Noms disponibles : `arrow-left`, `check-circle`, `chevron-right`, `clock`, `edit`, `heart`, `home`, `inbox`, `log-out`, `mail`, `menu`, `message-square`, `plus`, `search`, `trash`, `user-plus`, `users`, `x`.

## À retenir

- Peu de props : la plupart des composants lisent un état global (`useAuth`, `useTheme`, stores Pinia).
- Deux événements seulement : `update:modelValue` (`ChampMotDePasse`) et `dictate` (`DictateButton`).
- `ProviderCard` est la fiche intervenant, réutilisée par la recherche et l'assistant.
- `AppNav` et `SosButton` sont montés une fois dans `App.vue` et masqués dans l'espace admin.
- Les icônes sont des SVG maison ; `MayotteSymbol.vue` n'est plus utilisé.
