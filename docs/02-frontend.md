# 02 — Frontend

Le frontend est une application **Vue 3** construite avec **Vite**. Tous les composants utilisent la syntaxe `<script setup>` (API Composition).

## 1. Démarrage de l'application

1. Le navigateur charge [index.html](../index.html). Un petit script en ligne lit `localStorage` et pose tout de suite `data-theme` et la classe `mode-confort` sur `<html>`, avant que Vue démarre, pour éviter un flash du mauvais thème.
2. [src/main.js](../src/main.js) importe les styles dans cet ordre : `bootstrap-custom.scss`, le JS de Bootstrap, `assets/theme.css`, `index.css`, `styles/ui.css`.
3. `main.js` crée l'application et branche trois extensions : Pinia, le routeur, vue-i18n. Il pose aussi l'attribut `lang` de `<html>` selon la langue mémorisée.
4. [App.vue](../src/App.vue) s'affiche : bandeau hors-ligne, barre de navigation, zone de contenu (`<router-view>`), pied de page, bouton SOS.

## 2. Mise en page (layouts)

Il n'y a pas de dossier `layouts/`. Deux mises en page existent pourtant :

| Mise en page | Fichier | Contenu |
|---|---|---|
| Site public et espace personnel | [App.vue](../src/App.vue) | `ConnexionBanner` + `AppNav` + `<router-view>` + pied de page + `SosButton` |
| Espace admin | [Admin.vue](../src/pages/Admin.vue) | `AdminSidebar` + `<router-view>` imbriqué |

`App.vue` choisit entre les deux avec `estEspaceAdmin` : vrai si la route a `meta.requiresAdmin` ou si elle s'appelle `admin-connexion`. Dans ce cas la navbar, le pied de page et le bouton SOS sont masqués.

## 3. Routes et navigation

Toutes les routes sont dans [src/router/index.js](../src/router/index.js). Chaque page est chargée à la demande (`component: () => import(...)`), donc Vite produit un fichier JS par page. Le routeur utilise `createWebHistory()` (adresses sans `#`) et remonte en haut de page à chaque navigation (`scrollBehavior`).

| Route | Nom | Fichier | Accès |
|---|---|---|---|
| `/` | `accueil` | `Accueil.vue` | Public (un utilisateur connecté est redirigé, voir plus bas) |
| `/pourquoi` | `pourquoi` | `Pourquoi.vue` | Public |
| `/services` | `services` | `Services.vue` | Public |
| `/pour-qui` | `pour-qui` | `PourQui.vue` | Public |
| `/assistant` | `assistant` | `AssistantBesoin.vue` | Public |
| `/atouts` | `atouts` | `Atouts.vue` | Public |
| `/inscription` | `inscription` | `Inscription.vue` | `guestOnly` |
| `/connexion` | `connexion` | `Connexion.vue` | `guestOnly` |
| `/mot-de-passe-oublie` | `mot-de-passe-oublie` | `MotDePasseOublie.vue` | `guestOnly` |
| `/reinitialiser-mot-de-passe` | `reinitialiser-mot-de-passe` | `ReinitialiserMotDePasse.vue` | Aucune garde (la page vérifie elle-même) |
| `/profil` | `profil` | `Profil.vue` | `requiresAuth` |
| `/mon-compte` | `mon-compte` | `MonCompte.vue` | `requiresAuth` |
| `/mes-demandes` | `mes-demandes` | `MesDemandes.vue` | `requiresAuth` |
| `/mes-accompagnements` | `mes-accompagnements` | `MesAccompagnements.vue` | `requiresAuth` |
| `/historique` | `historique` | `Historique.vue` | `requiresAuth` |
| `/recherche` | `recherche` | `RecherchePersonnel.vue` | `requiresAuth` |
| `/nouvelle-demande/:aidantId` | `nouvelle-demande` | `NouvelleDemande.vue` | `requiresAuth` |
| `/formule/:formuleId` | `formule` | `PaiementFormule.vue` | `requiresAuth` |
| `/admin/connexion` | `admin-connexion` | `AdminLogin.vue` | Aucune garde |
| `/admin` | `admin` | `Admin.vue` → `AdminDashboard.vue` | `requiresAuth` + `requiresAdmin` |
| `/admin/comptes` | `admin-comptes` | `AdminComptes.vue` | hérité du parent |
| `/admin/adherents` | `admin-adherents` | `AdminAdherents.vue` | hérité du parent |
| `/admin/demandes` | `admin-demandes` | `AdminDemandes.vue` | hérité du parent |
| `/admin/messages` | `admin-messages` | `AdminMessages.vue` | hérité du parent |

Il n'existe pas de route « page introuvable » (404) : **non trouvé dans le code**.

### La garde de navigation

`router.beforeEach` ([router/index.js](../src/router/index.js), lignes 175 à 202) s'exécute avant chaque changement de page :

1. Elle attend que la session soit restaurée (`attendreInitialisation`). Sans cette attente, un utilisateur déjà connecté serait renvoyé vers `/connexion` à chaque rechargement.
2. Route `requiresAdmin` sans admin connecté → redirection vers `admin-connexion`.
3. Route `requiresAuth` sans utilisateur → redirection vers `connexion`, avec la destination d'origine dans `?redirect=`.
4. Route `accueil` avec un utilisateur connecté et sans ancre (`#`) → redirection vers `mon-compte` (ou `admin` pour l'admin).
5. Route `guestOnly` avec un utilisateur connecté → même redirection.

Cette garde ne contrôle **pas le rôle** (personne âgée, santé, particulier). Les pages réservées à un rôle font leur propre contrôle : `acces` dans `NouvelleDemande.vue`, `accesAutorise` dans `PaiementFormule.vue`.

## 4. Gestion de l'état

Le projet mélange deux façons de partager un état. Les deux fonctionnent ; il faut juste savoir laquelle est utilisée où.

| État | Fichier | Technique | Contenu |
|---|---|---|---|
| Utilisateur connecté | [stores/auth.js](../src/stores/auth.js) | `reactive()` au niveau du module, exposé par `useAuth()` | `user`, `initialized`, `isAdmin`, fonctions de connexion |
| Mode confort | [stores/accessibility.js](../src/stores/accessibility.js) | `reactive()` au niveau du module | `state.actif` |
| Thème | [composables/useTheme.js](../src/composables/useTheme.js) | `reactive()` au niveau du module | `theme`, `effectif` |
| Connexion internet | [composables/useConnexion.js](../src/composables/useConnexion.js) | `ref()` au niveau du module | `enLigne` |
| Liste des intervenants | [composables/useAidants.js](../src/composables/useAidants.js) | `ref()` au niveau du module | `aidants`, `chargement`, `pres` |
| Espace admin | [stores/adminDashboard.js](../src/stores/adminDashboard.js) | **Pinia** (`defineStore`) | `utilisateurs`, `messages`, `demandes`, `missions`, compteurs |
| Adhérents | [stores/adherents.js](../src/stores/adherents.js) | **Pinia** (`defineStore`) | `adherents`, `chargement`, `erreur` |

Le reste de l'état est local à chaque page (`ref`, `reactive`).

Trois préférences sont conservées dans `localStorage` : `theme`, `dispositif.modeConfort`, `langue`.

## 5. Formulaires et validation

- Les champs sont liés avec `v-model` à un objet `reactive` (souvent nommé `form`).
- La validation est écrite à la main dans la fonction d'envoi, il n'y a **pas de bibliothèque de validation**.
- Exemple complet : `handleSubmit` dans [Inscription.vue](../src/pages/Inscription.vue). Elle vérifie les champs obligatoires, le format de l'e-mail (`EMAIL_REGEX`), le format du téléphone (`TELEPHONE_REGEX` : `0X` + 9 chiffres, `+33` ou `+262`), et la longueur du mot de passe (6 caractères minimum).
- Le message d'erreur est rangé dans un `ref` (`error`, `erreur`) et affiché sous le formulaire.
- Les pages admin utilisent en plus `confirm()` et `alert()` du navigateur.

## 6. Appels aux données et gestion des erreurs

Les pages n'écrivent pas de requête Supabase elles-mêmes (seule exception : `ReinitialiserMotDePasse.vue`, qui lit la session). Elles passent par :

- [src/data/store.js](../src/data/store.js) pour les données métier ;
- [src/stores/auth.js](../src/stores/auth.js) pour le compte ;
- `fetch` vers Express dans trois endroits (voir [05-backend.md](05-backend.md)).

Deux conventions à connaître dans `store.js` :

- **Les fonctions de lecture ne lèvent pas d'erreur.** En cas d'échec, elles écrivent dans la console et renvoient une liste vide ou `null` (`getUsers`, `getDemandes`, `findById`…). Conséquence : une panne de lecture ressemble à « aucun résultat » pour l'utilisateur.
- **Les fonctions d'écriture lèvent une erreur** (`throw new Error(...)`) que la page doit attraper.

Les messages d'erreur de Supabase, en anglais, sont traduits par `messageErreurAuth` et `messageErreurProfil` dans [auth.js](../src/stores/auth.js).

Point faible repéré : dans [MesDemandes.vue](../src/pages/MesDemandes.vue) et [MesAccompagnements.vue](../src/pages/MesAccompagnements.vue), les fonctions `accepter`, `refuser`, `annuler`, `terminer` et `annulerMission` ont un `try … finally` **sans `catch`**. Si l'écriture échoue, aucun message n'est affiché.

## 7. Traductions

[src/i18n/index.js](../src/i18n/index.js) configure trois langues : `fr`, `shi` (shimaoré), `kib` (kibushi). Les textes sont dans `src/locales/*.json`. Une clé absente retombe sur le français (`fallbackLocale: 'fr'`). Dans un composant : `const { t } = useI18n()` puis `t('nav.connexion')`.

Les pages de l'espace admin n'utilisent pas `t()` : leurs textes sont écrits en français directement dans le fichier.

## 8. Les pages, une par une

Format : objectif, composants utilisés, données, actions, déroulé.

### Accueil — `/` — [Accueil.vue](../src/pages/Accueil.vue)

- **Objectif** : présenter le dispositif (hero, pourquoi, services, publics, étapes, engagements, formules).
- **Composants** : `CarteMayotte`, `FormulesSection`, `PaiementBandeau`, `HighlightWord`, `IconBadge`, `ServiceIcon`, `ReefDivider`.
- **Données** : `useAidants()` pour le compteur « près de chez vous » ; `FORMULES` via `FormulesSection`. Le reste est du texte traduit.
- **Actions** : liens vers `/assistant`, `/inscription`, `/recherche`, les pages de présentation, `/formule/:id`.
- **Déroulé** : affichage immédiat du contenu statique → un `IntersectionObserver` ajoute la classe `is-visible` aux cartes de services quand elles entrent dans l'écran → si une session existe, `useAidants` charge les profils et la carte place les marqueurs.
- **À savoir** : le compteur et les marqueurs ne s'affichent qu'à un utilisateur connecté, mais la garde redirige un utilisateur connecté hors de `/` (sauf lien avec ancre comme `/#nos-formules`). Ces deux éléments sont donc rarement visibles.

### Pourquoi — `/pourquoi` — [Pourquoi.vue](../src/pages/Pourquoi.vue)

Page statique. Composants : `BackLink`, `IconBadge`. Aucune donnée chargée.

### Services — `/services` — [Services.vue](../src/pages/Services.vue)

Page statique : cinq cartes (soins, courses, ménage, garde, soutien psychologique) définies dans la constante `SERVICES`. Composants : `BackLink`, `ServiceIcon`. Les textes viennent des clés `accueil.services.*`.

### Pour qui — `/pour-qui` — [PourQui.vue](../src/pages/PourQui.vue)

- **Objectif** : présenter les trois publics et afficher les avis des utilisateurs.
- **Composants** : `BackLink`.
- **Données** : `getAvis()` au montage (lecture publique).
- **Actions** : publier un avis (`handleAjouterAvis` → `addAvis`, utilisateur connecté) ; supprimer un avis (`handleSupprimerAvis` → `deleteAvis`, auteur ou admin, voir `peutSupprimer`).

### Atouts — `/atouts` — [Atouts.vue](../src/pages/Atouts.vue)

Page statique : trois engagements (constante `VALEURS`). Composants : `BackLink`, `IconBadge`.

### Assistant de besoin — `/assistant` — [AssistantBesoin.vue](../src/pages/AssistantBesoin.vue)

- **Objectif** : guider en 4 étapes vers les bons intervenants.
- **Composants** : `BackLink`, `ServiceIcon`, `SpeakButton`, `IconeAction`, `ProviderCard`.
- **État** : `step` (1 à 4 puis `'resultats'`), `answers` (pour qui, type d'aide, zone, commune, date, heures, urgence), `resultFilters`.
- **Données** : `getUsers()` appelé par `lancerRecherche()` à la fin de l'étape 4.
- **Actions** : `suivant`, `precedent`, `modifierReponses`, `recommencer`, filtres sur les résultats.
- **Déroulé** : l'utilisateur répond → `peutContinuer` active le bouton → étape 4 validée → chargement des profils → `resultats` filtre par type, commune et, en option, par jour disponible (`jourDemande`).
- **À savoir** : sur les 7 types d'aide de `TYPES_AIDE`, seuls 3 sont marqués `disponible: true` (santé, courses, ménage). La page est publique, mais `getUsers()` renvoie une liste vide à un visiteur non connecté (règle RLS) : il ne verra donc aucun résultat.

### Inscription — `/inscription` — [Inscription.vue](../src/pages/Inscription.vue)

- **Objectif** : créer un compte pour l'un des trois rôles.
- **Composants** : `ChampMotDePasse`.
- **Données envoyées** : nom, e-mail, mot de passe, téléphone, commune, adresse, rôle, spécialité (santé), services (particulier), présentation.
- **Action** : `handleSubmit` → `signup()` de `auth.js` → redirection vers `/mon-compte`.
- **À savoir** : `disponibilites` est toujours envoyé vide (`[]`) ; elles se saisissent ensuite dans le profil.

### Connexion — `/connexion` — [Connexion.vue](../src/pages/Connexion.vue)

`handleSubmit` → `login(email, password)` → redirection vers `route.query.redirect` ou `/mon-compte`. Composant : `ChampMotDePasse`. Si l'utilisateur vient d'une formule (`vientDUneFormule`), un lien de retour vers les formules est proposé.

### Mot de passe oublié — `/mot-de-passe-oublie` — [MotDePasseOublie.vue](../src/pages/MotDePasseOublie.vue)

`handleSubmit` → `demanderReinitialisationMotDePasse(email)`. La page affiche le même message de confirmation que l'adresse existe ou non.

### Réinitialiser le mot de passe — `/reinitialiser-mot-de-passe` — [ReinitialiserMotDePasse.vue](../src/pages/ReinitialiserMotDePasse.vue)

Ouverte depuis le lien reçu par e-mail. Au montage, elle vérifie qu'une session existe (`supabase.auth.getSession()`) et écoute l'événement `PASSWORD_RECOVERY`. `handleSubmit` contrôle la longueur et la confirmation, appelle `changerMotDePasse`, puis `logout`.

### Mon compte — `/mon-compte` — [MonCompte.vue](../src/pages/MonCompte.vue)

Page d'aiguillage. La liste de tuiles `LIENS` dépend du rôle : une personne âgée voit en plus « Trouver de l'aide ». Affiche la formule active (`formuleActive`). Action : `seDeconnecter`. Composant : `IconBadge`.

### Profil — `/profil` — [Profil.vue](../src/pages/Profil.vue)

- **Objectif** : modifier ses informations, son mot de passe et, pour un intervenant, ses disponibilités.
- **Composants** : `BackLink`, `ChampMotDePasse`.
- **Données** : `user` de `useAuth()` (déjà en mémoire, pas de requête au chargement).
- **Actions** : `handleSave` → `updateProfile` ; `handleChangerMotDePasse` → `changerMotDePasse` ; `toggleCreneau(jour, creneau)` → `updateProfile({ disponibilites })` ; `removeSlot`.
- **À savoir** : le calendrier propose trois créneaux fixes (constante `CRENEAUX` : 08:00–12:00, 12:00–17:00, 17:00–20:00). Le prénom et le nom sont deux champs à l'écran mais un seul champ `nom` en base (`decouperNom`).

### Recherche — `/recherche` — [RecherchePersonnel.vue](../src/pages/RecherchePersonnel.vue)

- **Objectif** : lister les intervenants selon un type de service et une commune.
- **Composants** : `BackLink`, `ProviderCard`.
- **Données** : `getUsers()` une fois au montage ; le filtrage se fait ensuite dans le navigateur (`results`).
- **Filtres** : `filters.type` (`sante`, `coursier`, `menage`), `filters.ville`.
- **À savoir** : le type initial vient de `?type=`. Il n'y a pas de filtre par jour ou créneau sur cette page. L'accueil envoie un paramètre `?ville=` que cette page **ne lit pas**.

### Nouvelle demande — `/nouvelle-demande/:aidantId` — [NouvelleDemande.vue](../src/pages/NouvelleDemande.vue)

- **Objectif** : envoyer une demande à un intervenant précis.
- **Composants** : `BackLink`, `DictateButton`.
- **Données** : `findById(aidantId)` puis `getDemandesByDemandeur(user.id)` pour détecter un doublon.
- **Contrôle d'accès** : `acces` vaut `chargement`, `introuvable`, `role-invalide`, `deja-envoyee` ou `ok`.
- **Action** : `handleSubmit` → `addDemande`.

### Mes demandes — `/mes-demandes` — [MesDemandes.vue](../src/pages/MesDemandes.vue)

- **Objectif** : voir ses demandes (envoyées pour une personne âgée, reçues pour un intervenant) et agir dessus.
- **Composants** : `BackLink`, `IconeAction`.
- **Données** : `getDemandesByDemandeur` ou `getDemandesByAidant`, `getUsers`, puis `getMiseEnRelationByDemande` pour chaque demande acceptée.
- **Actions** : `accepter`, `refuser` (intervenant) ; `annuler`, `refaire` (personne âgée).
- **À savoir** : le badge est calculé par `statutAffiche`. Une demande acceptée s'affiche « Acceptée » puis « En cours » après 3 minutes (`DELAI_DEMARRAGE_MISSION_MS`), grâce à un minuteur qui tourne toutes les 15 secondes. Le code d'arrivée s'affiche tant que le statut est `acceptee`.

### Mes accompagnements — `/mes-accompagnements` — [MesAccompagnements.vue](../src/pages/MesAccompagnements.vue)

Liste les missions `en_cours` démarrées (`missionsAffichees`). Actions : `terminer` et `annulerMission`, qui mettent à jour la mission **et** la demande liée. Composants : `BackLink`, `IconeAction`.

### Historique — `/historique` — [Historique.vue](../src/pages/Historique.vue)

Liste les demandes `terminee` ou `annulee`, avec quatre filtres (`filtres` : période, service, accompagnant, statut). Action : `refaire`. Composants : `BackLink`, `IconeAction`.

### Formule — `/formule/:formuleId` — [PaiementFormule.vue](../src/pages/PaiementFormule.vue)

- **Objectif** : confirmer le choix d'une formule.
- **Données** : `FORMULES` (constante), `user`.
- **Action** : `handleConfirmer` → `updateProfile({ abonnement })`.
- **À savoir** : **aucun paiement réel**. Les champs de carte sont contrôlés par `carteValide()` puis ignorés ; rien n'est envoyé ni stocké. Réservé au rôle `senior` (`accesAutorise`).

### Connexion admin — `/admin/connexion` — [AdminLogin.vue](../src/pages/AdminLogin.vue)

`seConnecter` → `login` ; si le compte n'est pas admin, `logout` immédiat et message d'erreur.

### Coquille admin — `/admin` — [Admin.vue](../src/pages/Admin.vue)

Au montage : `dashboard.charger()` et `adherents.chargerAdherents()`. Les sous-pages lisent ensuite ces stores sans recharger.

### Tableau de bord — `/admin` — [AdminDashboard.vue](../src/pages/AdminDashboard.vue)

Lecture seule du store `adminDashboard` : chiffres clés (`StatCard`), messages non lus, 4 demandes récentes, activité récente, répartition par rôle. Actions : `marquerLu`, recherche qui renvoie vers `/admin/comptes?q=`.

### Comptes — `/admin/comptes` — [AdminComptes.vue](../src/pages/AdminComptes.vue)

Liste filtrable par rôle et par texte. Actions : `valider` (création via `dashboard.creerCompte` ou modification via `dashboard.modifierCompte`), `supprimer`. Après une création, un e-mail de définition de mot de passe est demandé (`demanderReinitialisationMotDePasse`).

### Adhérents — `/admin/adherents` — [AdminAdherents.vue](../src/pages/AdminAdherents.vue)

Gestion complète (ajout, modification, suppression, recherche, tri) via le store `adherents`, qui appelle l'API Express.

### Demandes et missions — `/admin/demandes` — [AdminDemandes.vue](../src/pages/AdminDemandes.vue)

Lecture seule, en colonnes : en attente, acceptées, en cours, terminées, plus une liste repliable des refusées.

### Messages — `/admin/messages` — [AdminMessages.vue](../src/pages/AdminMessages.vue)

Liste des messages de contact. Actions : `marquerLu`, `supprimer`. Le bouton « Répondre » propose d'appeler la personne si son compte a un téléphone (`telephone(m)`) ; il n'y a pas de messagerie.

## À retenir

- Une seule page HTML ; le routeur change le composant affiché dans `<router-view>`.
- Les droits d'accès par page sont dans `meta` des routes et appliqués par `router.beforeEach`. Le contrôle du rôle est fait dans les pages concernées.
- L'état partagé vient soit de modules réactifs (`auth.js`, `useTheme.js`…), soit de deux stores Pinia (admin, adhérents).
- Les pages passent toujours par `data/store.js` ou `stores/auth.js` pour parler à Supabase.
- Les lectures qui échouent renvoient une liste vide sans message : penser à regarder la console.
