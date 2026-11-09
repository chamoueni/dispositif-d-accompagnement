# 12 — Où modifier quoi

Table de correspondance : « je veux… » → les fichiers à ouvrir. Les chemins partent de la racine du projet.

## 1. Apparence

| Je veux… | Fichier(s) | Remarque |
|---|---|---|
| Changer une couleur du site | `src/assets/theme.css` | Modifier la valeur dans `[data-theme='light']` **et** dans `[data-theme='dark']` |
| Changer la couleur des boutons | `src/assets/theme.css` (`--couleur-bouton…`) | Les règles sont dans `src/styles/ui.css` |
| Changer les couleurs de Bootstrap (`primary`, `secondary`), les arrondis | `src/styles/bootstrap-custom.scss` | Garder les mêmes teintes que dans `theme.css` |
| Changer une police | `index.html` (lien Google Fonts) + `src/index.css` (`--sans`, `--heading`) + `src/styles/bootstrap-custom.scss` | Espace admin : `--admin-sans` dans `src/styles/Admin.css` |
| Changer la taille du texte | `src/index.css` (règle `:root`) | Mode confort : `src/assets/theme.css` |
| Régler le mode confort | `src/assets/theme.css` (règles `html.mode-confort`) | Bascule : `src/stores/accessibility.js` |
| Corriger un élément mal coloré en mode sombre | `src/assets/theme.css` (bloc des corrections Bootstrap) | |
| Modifier la barre de navigation | `src/components/AppNav.vue`, `src/styles/AppNav.css` | |
| Modifier le pied de page | `src/App.vue` (gabarit et style) + clés `footer.*` | |
| Changer le logo | `src/assets/logo.png` et `public/favicon.png` | |
| Changer une photo | `src/assets/` | Importée dans `Accueil.vue` et `Services.vue` |
| Agrandir les cases du calendrier | `src/styles/Profil.css` (`.dispo-case`) | |

## 2. Textes et langues

| Je veux… | Fichier(s) | Remarque |
|---|---|---|
| Modifier un texte de la page d'accueil | `src/locales/fr.json`, section `accueil` | Reporter dans `shi.json` et `kib.json` |
| Modifier un texte du site public | `src/locales/fr.json`, `shi.json`, `kib.json` | Chercher la clé utilisée dans `t('…')` |
| Modifier un texte de l'espace admin | Directement dans la page `src/pages/Admin*.vue` | L'admin n'utilise pas les fichiers de langue |
| Ajouter une langue | `src/locales/<code>.json` + `src/i18n/index.js` (`LANGUES`, `messages`) + `src/components/DrapeauLangue.vue` | |
| Ajouter un enregistrement audio | `public/audio/shi/<clé>.mp3` ou `public/audio/kib/<clé>.mp3` | Voir `public/audio/LISEZ-MOI.md` |
| Changer le titre de l'onglet | `index.html` (`<title>`) | |
| Changer le nom du site affiché | `src/components/AppNav.vue` et `src/App.vue` (texte « Dispositif d'accompagnement »), `index.html` | Écrit en dur, pas dans les traductions |

## 3. Pages et navigation

| Je veux… | Fichier(s) | Étapes |
|---|---|---|
| Ajouter une page | `src/pages/MaPage.vue`, `src/router/index.js`, `src/styles/MaPage.css` | 1. créer la page ; 2. ajouter la route ; 3. ajouter `meta: { requiresAuth: true }` si besoin ; 4. ajouter les textes ; 5. ajouter un lien |
| Ajouter un lien dans le menu | `src/components/AppNav.vue` + clé `nav.*` | Deux menus : visiteur et connecté |
| Ajouter une tuile dans « Mon compte » | `src/pages/MonCompte.vue` (`LIENS`) | Une liste par rôle |
| Ajouter une page admin | `src/pages/AdminX.vue`, `src/router/index.js` (`children` de `/admin`), `src/components/admin/AdminSidebar.vue` (`liens`) | L'icône doit exister dans `AdminIcon.vue` |
| Changer les droits d'accès d'une page | `src/router/index.js` (`meta`) | Contrôle du rôle : dans la page elle-même |
| Changer la redirection après connexion | `src/pages/Connexion.vue` (`handleSubmit`), `src/router/index.js` | |

## 4. Formulaires

| Je veux… | Fichier(s) | Étapes |
|---|---|---|
| Ajouter un champ à l'inscription | `src/pages/Inscription.vue`, `src/stores/auth.js` (`signup` et `creerProfilDepuisMetadata`), `supabase/schema.sql`, `src/pages/Profil.vue`, fichiers de langue | Ajouter la colonne dans `profiles` et **rejouer le SQL** ; penser aux deux fonctions de `auth.js` |
| Changer la règle du mot de passe | `src/pages/Inscription.vue`, `src/pages/Profil.vue`, `src/pages/ReinitialiserMotDePasse.vue` + les messages d'erreur | Supabase a aussi son propre minimum |
| Changer le format de téléphone accepté | `src/pages/Inscription.vue` (`TELEPHONE_REGEX`) | `Profil.vue` ne contrôle pas le format |
| Ajouter une spécialité de santé | `src/pages/Inscription.vue` et `src/pages/Profil.vue` (`SPECIALITE_KEYS`) + clés `specialites.*` | |
| Ajouter une commune | `src/data/store.js` (`COMMUNES_MAYOTTE`) | Avec `zone`, `lat`, `lng` |
| Changer les créneaux horaires | `src/pages/Profil.vue` (`CRENEAUX`) | Les anciens créneaux enregistrés s'afficheront dans « autres créneaux » |
| Ajouter un champ à la demande d'aide | `src/pages/NouvelleDemande.vue`, `src/data/store.js` (`addDemande`, `mapDemande`), `supabase/schema.sql` | |

## 5. Services et métier

| Je veux… | Fichier(s) | Remarque |
|---|---|---|
| **Ajouter un service** (ex. « garde ») | `src/pages/Inscription.vue` et `src/pages/Profil.vue` (cases à cocher), `src/pages/RecherchePersonnel.vue` (`TYPES`), `src/components/CarteMayotte.vue` (`BESOINS`, `libelleAidant`), `src/components/ProviderCard.vue` (`SERVICE_KEYS`, `resume`), `src/pages/AssistantBesoin.vue` (`TYPES_AIDE`, `resultats`), `src/pages/MesDemandes.vue`, `MesAccompagnements.vue`, `Historique.vue` (`SERVICE_KEYS`), `src/pages/AdminDashboard.vue` et `AdminDemandes.vue` (`SERVICE_LABELS`), fichiers de langue (`demande.service_*`) | Les services n'ont pas de table : la liste est répétée dans une dizaine de fichiers. C'est la modification la plus dispersée du projet. |
| Modifier une formule ou un prix | `src/data/store.js` (`FORMULES`) | Mettre aussi à jour `CONTEXTE_SITE` dans `server/index.js`, sinon l'assistant annonce l'ancien prix |
| Changer le délai « Acceptée » → « En cours » | `src/data/store.js` (`DELAI_DEMARRAGE_MISSION_MS`) | |
| Changer la logique d'acceptation d'une demande | `src/data/store.js` (`updateDemandeStatut`) | |
| Ajouter un statut de demande | `supabase/schema.sql` (contrainte `check`), `src/pages/MesDemandes.vue` (`statutAffiche`), pages admin, clés `statut.*` | Rejouer le SQL |
| Changer les filtres de la recherche | `src/pages/RecherchePersonnel.vue` (`filters`, `results`) | |
| Modifier les réponses de l'assistant IA | `server/index.js` (`CONTEXTE_SITE`) | Réponses de secours : `SosButton.vue` (`formulaireReponseAutomatique`) |
| Changer les mots-clés de la commande vocale | `src/components/SosButton.vue` (`MOTS_CLES`) | |
| Changer d'administrateur | `src/stores/auth.js`, `server/index.js`, `supabase/schema.sql` (toutes les règles), `supabase/functions/notify-contact-message/index.ts` | Quatre endroits ; rejouer le SQL et redéployer la fonction |

## 6. Backend et base de données

| Je veux… | Fichier(s) | Étapes |
|---|---|---|
| **Ajouter une route backend** | `server/index.js` | 1. `app.get/post(...)` avec `try/catch` et `next(error)` ; 2. ajouter `verifierAdmin` si la route est réservée ; 3. appeler la route depuis le frontend avec `API_BASE_URL` |
| Protéger une route existante | `server/index.js` | Ajouter `verifierAdmin` en deuxième argument, et envoyer le jeton côté frontend (modèle : `createCompteAdmin` dans `store.js`) |
| Restreindre les origines autorisées (CORS) | `server/index.js` (`app.use(cors())`) | |
| **Ajouter une table** | `supabase/schema.sql` | 1. `create table if not exists` ; 2. `alter table … enable row level security` ; 3. une règle par opération permise ; 4. **exécuter le SQL dans Supabase** ; 5. ajouter les fonctions d'accès dans `src/data/store.js` |
| Ajouter une colonne | `supabase/schema.sql` avec `alter table … add column if not exists` | `create table if not exists` ne modifie pas une table existante |
| Modifier une règle RLS | `supabase/schema.sql` | Garder le `drop policy if exists` avant le `create policy` ; rejouer le SQL |
| Ajouter ou modifier une requête | `src/data/store.js` | Ne pas écrire de requête dans une page |
| Changer le modèle d'IA | `server/index.js` (`model:` dans `/api/chat-ia`) | |
| Modifier l'e-mail envoyé à l'admin | `supabase/functions/notify-contact-message/index.ts` | Redéployer la fonction |
| Ajouter une variable d'environnement | `.env.example` + le fichier qui la lit + l'hébergeur | Préfixe `VITE_` uniquement si elle peut être publique |

## 7. Composants

| Je veux… | Fichier(s) |
|---|---|
| Modifier la fiche d'un intervenant | `src/components/ProviderCard.vue` |
| Ajouter une icône | `src/components/IconBadge.vue` (et sa liste `validator`), `ServiceIcon.vue`, `IconeAction.vue` ou `admin/AdminIcon.vue` |
| Modifier le bouton SOS | `src/components/SosButton.vue`, `src/styles/SosButton.css` |
| Modifier la carte de Mayotte | `src/components/CarteMayotte.vue`, `src/styles/CarteMayotte.css` |
| Modifier les cartes de formules | `src/components/FormulesSection.vue` (présentation) ; `src/data/store.js` (contenu) |
| Modifier le bandeau hors-ligne | `src/components/ConnexionBanner.vue` |
| Modifier le menu de l'admin | `src/components/admin/AdminSidebar.vue` |

## 8. Réflexes à garder

1. **Après toute modification de `supabase/schema.sql`** : exécuter le SQL dans le tableau de bord Supabase.
2. **Après un nouveau texte** : l'ajouter dans les trois fichiers de langue (au minimum `fr.json`, les autres retombent dessus).
3. **Avant de pousser** : `npm run lint` puis `npm run build`.
4. **Une écriture bloquée par la RLS ne renvoie pas d'erreur** : si une modification « ne fait rien », vérifier les règles de la table.

## À retenir

- Couleurs : `src/assets/theme.css`. Textes : `src/locales/`. Routes : `src/router/index.js`. Requêtes : `src/data/store.js`. Routes d'API : `server/index.js`. Tables : `supabase/schema.sql`.
- Ajouter un service ou changer d'administrateur demande de toucher de nombreux fichiers, car ces informations sont répétées.
- Toute modification du schéma se termine par une exécution manuelle dans Supabase.
