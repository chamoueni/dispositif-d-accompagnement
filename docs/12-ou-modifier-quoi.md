# 12 — Où modifier quoi

Table de correspondance : « je veux… » → les fichiers à ouvrir. Les chemins partent de la racine du projet.

## 1. Apparence

| Je veux… | Fichier(s) | Remarque |
|---|---|---|
| Changer une couleur du site | `frontend/src/assets/theme.css` | Modifier la valeur dans `[data-theme='light']` **et** dans `[data-theme='dark']` |
| Changer la couleur des boutons | `frontend/src/assets/theme.css` (`--couleur-bouton…`) | Les règles sont dans `frontend/src/styles/ui.css` |
| Changer les couleurs de Bootstrap (`primary`, `secondary`), les arrondis | `frontend/src/styles/bootstrap-custom.scss` | Garder les mêmes teintes que dans `theme.css` |
| Changer une police | `index.html` (lien Google Fonts) + `frontend/src/index.css` (`--sans`, `--heading`) + `frontend/src/styles/bootstrap-custom.scss` | Espace admin : `--admin-sans` dans `frontend/src/styles/Admin.css` |
| Changer la taille du texte | `frontend/src/index.css` (règle `:root`) | Mode confort : `frontend/src/assets/theme.css` |
| Régler le mode confort | `frontend/src/assets/theme.css` (règles `html.mode-confort`) | Bascule : `frontend/src/stores/accessibility.js` |
| Corriger un élément mal coloré en mode sombre | `frontend/src/assets/theme.css` (bloc des corrections Bootstrap) | |
| Modifier la barre de navigation | `frontend/src/components/AppNav.vue`, `frontend/src/styles/AppNav.css` | |
| Modifier le pied de page | `frontend/src/App.vue` (gabarit et style) + clés `footer.*` | |
| Changer le logo | `frontend/src/assets/logo.png` et `frontend/public/favicon.png` | |
| Changer une photo | `frontend/src/assets/` | Importée dans `Accueil.vue` et `Services.vue` |
| Agrandir les cases du calendrier | `frontend/src/styles/Profil.css` (`.dispo-case`) | |

## 2. Textes et langues

| Je veux… | Fichier(s) | Remarque |
|---|---|---|
| Modifier un texte de la page d'accueil | `frontend/src/locales/fr.json`, section `accueil` | Reporter dans `shi.json` et `kib.json` |
| Modifier un texte du site public | `frontend/src/locales/fr.json`, `shi.json`, `kib.json` | Chercher la clé utilisée dans `t('…')` |
| Modifier un texte de l'espace admin | Directement dans la page `frontend/src/pages/Admin*.vue` | L'admin n'utilise pas les fichiers de langue |
| Ajouter une langue | `frontend/src/locales/<code>.json` + `frontend/src/i18n/index.js` (`LANGUES`, `messages`) + `frontend/src/components/DrapeauLangue.vue` | |
| Ajouter un enregistrement audio | `frontend/public/audio/shi/<clé>.mp3` ou `frontend/public/audio/kib/<clé>.mp3` | Voir `frontend/public/audio/LISEZ-MOI.md` |
| Changer le titre de l'onglet | `index.html` (`<title>`) | |
| Changer le nom du site affiché | `frontend/src/components/AppNav.vue` et `frontend/src/App.vue` (texte « Dispositif d'accompagnement »), `index.html` | Écrit en dur, pas dans les traductions |

## 3. Pages et navigation

| Je veux… | Fichier(s) | Étapes |
|---|---|---|
| Ajouter une page | `frontend/src/pages/MaPage.vue`, `frontend/src/router/index.js`, `frontend/src/styles/MaPage.css` | 1. créer la page ; 2. ajouter la route ; 3. ajouter `meta: { requiresAuth: true }` si besoin ; 4. ajouter les textes ; 5. ajouter un lien |
| Ajouter un lien dans le menu | `frontend/src/components/AppNav.vue` + clé `nav.*` | Deux menus : visiteur et connecté |
| Ajouter une tuile dans « Mon compte » | `frontend/src/pages/MonCompte.vue` (`LIENS`) | Une liste par rôle |
| Ajouter une page admin | `frontend/src/pages/AdminX.vue`, `frontend/src/router/index.js` (`children` de `/admin`), `frontend/src/components/admin/AdminSidebar.vue` (`liens`) | L'icône doit exister dans `AdminIcon.vue` |
| Changer les droits d'accès d'une page | `frontend/src/router/index.js` (`meta`) | Contrôle du rôle : dans la page elle-même |
| Changer la redirection après connexion | `frontend/src/pages/Connexion.vue` (`handleSubmit`), `frontend/src/router/index.js` | |

## 4. Formulaires

| Je veux… | Fichier(s) | Étapes |
|---|---|---|
| Ajouter un champ à l'inscription | `frontend/src/pages/Inscription.vue`, `frontend/src/pages/Profil.vue`, `backend/controllers/auth.controller.js` (`inscrire`, objet `champs`), `backend/models/profil.model.js` (`COLONNES`), `backend/services/validation.service.js` (`PROFIL_FIELDS`), `backend/sql/schema.sql`, fichiers de langue | Ajouter la colonne dans `profiles` et **rejouer le SQL** dans phpPgAdmin |
| Changer la règle du mot de passe | `frontend/src/lib/motDePasse.js` (site) et `backend/config/constantes.js` (`MOT_DE_PASSE_MIN`) + `backend/services/motDePasse.service.js` | C'est la règle du serveur qui fait foi |
| Changer le format de téléphone accepté | `frontend/src/pages/Inscription.vue` (`TELEPHONE_REGEX`) | `Profil.vue` ne contrôle pas le format |
| Ajouter une spécialité de santé | `frontend/src/pages/Inscription.vue` et `frontend/src/pages/Profil.vue` (`SPECIALITE_KEYS`) + clés `specialites.*` | |
| Ajouter une commune | `frontend/src/data/store.js` (`COMMUNES_MAYOTTE`) | Avec `zone`, `lat`, `lng` |
| Changer les créneaux horaires | `frontend/src/pages/Profil.vue` (`CRENEAUX`) | Les anciens créneaux enregistrés s'afficheront dans « autres créneaux » |
| Ajouter un champ à la demande d'aide | `frontend/src/pages/NouvelleDemande.vue`, `frontend/src/data/store.js` (`mapDemande`), `backend/controllers/data.controller.js` (`demandes.create`), `backend/models/demande.model.js` (`creerDemande`), `backend/sql/schema.sql` | Rejouer le SQL |

## 5. Services et métier

| Je veux… | Fichier(s) | Remarque |
|---|---|---|
| **Ajouter un service** (ex. « garde ») | `frontend/src/pages/Inscription.vue` et `frontend/src/pages/Profil.vue` (cases à cocher), `frontend/src/pages/RecherchePersonnel.vue` (`TYPES`), `frontend/src/components/CarteMayotte.vue` (`BESOINS`, `libelleAidant`), `frontend/src/components/ProviderCard.vue` (`SERVICE_KEYS`, `resume`), `frontend/src/pages/AssistantBesoin.vue` (`TYPES_AIDE`, `resultats`), `frontend/src/pages/MesDemandes.vue`, `MesAccompagnements.vue`, `Historique.vue` (`SERVICE_KEYS`), `frontend/src/pages/AdminDashboard.vue` et `AdminDemandes.vue` (`SERVICE_LABELS`), fichiers de langue (`demande.service_*`) | Les services n'ont pas de table : la liste est répétée dans une dizaine de fichiers. C'est la modification la plus dispersée du projet. |
| Modifier une formule ou un prix | `frontend/src/data/store.js` (`FORMULES`) | |
| Changer le délai « Acceptée » → « En cours » | `frontend/src/data/store.js` (`DELAI_DEMARRAGE_MISSION_MS`) | |
| Changer la logique d'acceptation d'une demande | `backend/services/demande.service.js` (`changerStatutDemande`, en transaction) | |
| Ajouter un statut de demande | `backend/sql/schema.sql` (contrainte `check`), `backend/config/constantes.js` (`STATUTS_DEMANDE`), `frontend/src/pages/MesDemandes.vue` (`statutAffiche`), pages admin, clés `statut.*` | Rejouer le SQL |
| Changer les filtres de la recherche | `frontend/src/pages/RecherchePersonnel.vue` (`filters`, `results`) | |
| Changer les mots-clés de la commande vocale | `frontend/src/components/SosButton.vue` (`MOTS_CLES`) | |
| Changer d'administrateur | Base de données : `update utilisateurs set est_admin = true where email = '…'` (et `false` pour l'ancien), dans phpPgAdmin | Aucun fichier à modifier ; l'adresse qui reçoit les alertes SOS est la variable `EMAIL_ADMIN` du site API |

## 6. Backend et base de données

| Je veux… | Fichier(s) | Étapes |
|---|---|---|
| **Ajouter une route backend** | `backend/routes/`, `backend/controllers/`, `backend/app.js` | 1. une ligne dans un fichier de routes (ou un nouveau fichier branché dans `app.js`) ; 2. la fonction du contrôleur, avec `try/catch` et `next(error)` ; 3. **refaire les contrôles d'accès** (`requireAuth`, `exigerRole(...)`, `verifierAdmin`, ou une vérification dans le contrôleur) ; 4. appeler la route depuis le frontend avec `apiRequest` |
| Protéger une route existante | le fichier de `backend/routes/` | Ajouter `requireAuth`, `exigerRole('senior', …)` ou `verifierAdmin` avant le contrôleur ; le cookie de session est envoyé automatiquement |
| Changer les origines autorisées (CORS) | `backend/config/origines.js` (variables `SITE_URL`, `CORS_ORIGINS`) | |
| **Ajouter une table** | `backend/sql/schema.sql`, `backend/models/`, `backend/controllers/` | 1. `create table if not exists` ; 2. **exécuter le SQL dans phpPgAdmin** ; 3. un fichier de modèle avec des requêtes paramétrées ; 4. les actions du contrôleur, **avec leurs contrôles d'accès** ; 5. les fonctions côté site dans `frontend/src/data/store.js` |
| Ajouter une colonne | `backend/sql/schema.sql` avec `alter table … add column if not exists` | `create table if not exists` ne modifie pas une table existante |
| Modifier une règle d'accès (qui voit quoi) | `backend/controllers/data.controller.js`, `backend/services/confidentialite.service.js` | Il n'y a plus de règles RLS : les droits sont vérifiés dans le serveur |
| Ajouter ou modifier une requête SQL | `backend/models/` | Toujours avec des paramètres `$1, $2…`, jamais en collant les valeurs dans le texte |
| Modifier un email (mot de passe oublié, alerte SOS) | `backend/services/email.service.js` (`gabarit`, `envoyerLienReinitialisation`, `alerterNouveauMessage`) | Puis mettre à jour le site API (`git pull` + redémarrage) |
| Ajouter une variable d'environnement | `.env.example` + le fichier qui la lit + le champ « Environnement » du site API sur alwaysdata | Préfixe `VITE_` uniquement si elle peut être publique |

## 7. Composants

| Je veux… | Fichier(s) |
|---|---|
| Modifier la fiche d'un intervenant | `frontend/src/components/ProviderCard.vue` |
| Ajouter une icône | `frontend/src/components/IconBadge.vue` (et sa liste `validator`), `ServiceIcon.vue`, `IconeAction.vue` ou `admin/AdminIcon.vue` |
| Modifier le bouton SOS | `frontend/src/components/SosButton.vue`, `frontend/src/styles/SosButton.css` |
| Modifier la carte de Mayotte | `frontend/src/components/CarteMayotte.vue`, `frontend/src/styles/CarteMayotte.css` |
| Modifier les cartes de formules | `frontend/src/components/FormulesSection.vue` (présentation) ; `frontend/src/data/store.js` (contenu) |
| Modifier le bandeau hors-ligne | `frontend/src/components/ConnexionBanner.vue` |
| Modifier le menu de l'admin | `frontend/src/components/admin/AdminSidebar.vue` |

## 8. Réflexes à garder

1. **Après toute modification de `backend/sql/schema.sql`** : exécuter le SQL dans phpPgAdmin (alwaysdata).
2. **Après un nouveau texte** : l'ajouter dans les trois fichiers de langue (au minimum `fr.json`, les autres retombent dessus).
3. **Avant de pousser** : `npm run lint` puis `npm run build`.
4. **Une nouvelle route doit vérifier elle-même les droits** : la base ne protège plus les lignes (plus de RLS).
5. **Après une modification du front** : reconstruire avec `VITE_SITE_URL` puis renvoyer `dist/` (voir [11-deploiement.md](11-deploiement.md) § 6).

## À retenir

- Couleurs : `frontend/src/assets/theme.css`. Textes : `frontend/src/locales/`. Routes : `frontend/src/router/index.js`. Appels métier : `frontend/src/data/store.js`. Routes d'API : `backend/routes/`. Requêtes SQL : `backend/models/`. Tables : `backend/sql/schema.sql`.
- Ajouter un service demande de toucher de nombreux fichiers, car la liste est répétée. Changer d'administrateur se fait dans la base (`est_admin`).
- Toute modification du schéma se termine par une exécution manuelle dans phpPgAdmin.
