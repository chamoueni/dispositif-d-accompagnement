# 07 — Authentification et sécurité

## 1. Qui fait quoi

L'authentification est entièrement confiée à **Supabase Auth** (e-mail + mot de passe). Le projet n'a pas son propre code de hachage ni de création de jetons.

| Besoin | Où | Fonction |
|---|---|---|
| Créer un compte | [frontend/src/stores/auth.js](../frontend/src/stores/auth.js) | `signup` → `supabase.auth.signUp` |
| Se connecter | auth.js | `login` → `supabase.auth.signInWithPassword` |
| Se déconnecter | auth.js | `logout` → `supabase.auth.signOut` |
| Changer son mot de passe | auth.js | `changerMotDePasse` → `supabase.auth.updateUser` |
| Mot de passe oublié | auth.js | `demanderReinitialisationMotDePasse` → `supabase.auth.resetPasswordForEmail` |
| Restaurer la session au chargement | auth.js | `supabase.auth.getSession()` puis `onAuthStateChange` |
| Protéger les pages | [frontend/src/router/index.js](../frontend/src/router/index.js) | `router.beforeEach` |
| Protéger les données | [supabase/schema.sql](../supabase/schema.sql) | règles RLS |
| Protéger les routes admin du backend | [backend/index.js](../backend/index.js) | `verifierAdmin` |

## 2. Connexion et vérification de l'identité

1. L'utilisateur saisit e-mail et mot de passe ([Connexion.vue](../frontend/src/pages/Connexion.vue)).
2. `login()` appelle Supabase. En cas d'échec, le message est toujours « Email ou mot de passe incorrect. », sans préciser lequel est faux.
3. En cas de succès, Supabase renvoie une session contenant un **jeton JWT**.
4. `chargerProfil(authUser)` lit la ligne `profiles` de l'utilisateur et la range dans `state.user`, avec l'e-mail.
5. Les requêtes suivantes vers Supabase portent automatiquement ce jeton ; la base sait donc qui écrit (`auth.uid()`).

**Mot de passe.** Le contrôle de longueur écrit dans le projet est de 6 caractères (`Inscription.vue`, `Profil.vue`, `ReinitialiserMotDePasse.vue`). Le hachage est fait par Supabase ; l'algorithme n'est pas visible dans le dépôt.

**Confirmation de l'e-mail.** Le code gère le cas où elle est activée dans Supabase : `signup` ne reçoit alors pas de session, les informations du formulaire sont rangées dans les métadonnées du compte, et le profil est créé à la première connexion par `creerProfilDepuisMetadata`. Savoir si cette option est activée sur le projet en ligne : **non trouvé dans le code** (réglage du tableau de bord Supabase).

## 3. Conservation de la session

- Le navigateur ne parle plus directement à Supabase : la connexion passe par le serveur ([authRoutes.js](../backend/authRoutes.js)), qui garde les jetons Supabase chiffrés côté serveur et ne donne au navigateur qu’un cookie de session `httpOnly` ([sessions.js](../backend/sessions.js)).
- Au chargement de la page, `supabase.auth.getSession()` restaure la session puis passe `state.initialized` à `true`. Le routeur attend ce signal avant de décider d'une redirection (`attendreInitialisation`).
- `onAuthStateChange` recharge le profil à chaque changement (connexion ou déconnexion dans un autre onglet, expiration).

## 4. Rôles et permissions

Quatre profils d'utilisation existent, mais seulement trois valeurs de rôle en base.

| Profil | Comment il est reconnu | Où |
|---|---|---|
| Personne âgée | `profiles.role = 'senior'` | choisi à l'inscription |
| Personnel de santé | `profiles.role = 'sante'` | choisi à l'inscription |
| Particulier | `profiles.role = 'particulier'` | choisi à l'inscription |
| Administrateur | l'e-mail du compte est égal à la constante `ADMIN_EMAIL` | `isAdmin` dans auth.js ; `verifierAdmin` dans backend/index.js ; règles RLS |

### Où les permissions sont appliquées

| Règle | Interface | Routeur | Base (RLS) | Backend |
|---|---|---|---|---|
| Page réservée aux connectés | — | `meta.requiresAuth` | — | — |
| Espace admin | navbar masque les liens | `meta.requiresAdmin` | règles « admin » | `verifierAdmin` |
| Seule une personne âgée envoie une demande | bouton masqué (`ProviderCard`), `acces` dans `NouvelleDemande` | non | **non** | — |
| Seul l'intervenant accepte ou refuse | boutons affichés selon le rôle (`MesDemandes`) | non | **non** (les deux participants peuvent modifier) | — |
| Seule une personne âgée souscrit une formule | `accesAutorise`, `peutSouscrire` | non | **non** | — |
| Chacun ne modifie que son profil | — | — | oui (`profiles_update_own`) | — |
| Seuls les participants voient une demande | — | — | oui | — |
| Seul l'admin lit les messages de contact | — | — | oui | — |

À retenir de ce tableau : **les règles liées au rôle métier ne sont appliquées que dans l'interface.** Une personne qui appellerait Supabase directement avec son jeton pourrait les contourner. Les règles liées à l'identité (« c'est ma ligne », « je suis participant ») sont, elles, garanties par la base.

## 5. Communication frontend ↔ backend

- En développement, Vite redirige `/api` vers `http://localhost:3001` ([vite.config.js](../frontend/vite.config.js)).
- En production aussi, le site appelle `/api/...` sur sa propre adresse : une règle de réécriture Render transmet ces appels au serveur Express (voir [11-deploiement.md](11-deploiement.md)). Les cookies de session restent donc « du même site ».
- Pour les routes admin, le frontend ajoute `Authorization: Bearer <jeton de session>` (`createCompteAdmin`, `deleteCompteAdmin` dans [store.js](../frontend/src/data/store.js)).
- Toutes les routes `/api/...` reçoivent le cookie de session `httpOnly` ; `/api/adherents` exige le compte administrateur.

## 6. CORS

`app.use(cors())` sans option dans [backend/index.js](../backend/index.js) : toutes les origines sont acceptées. Aucune liste d'origines autorisées n'est définie.

## 7. Protections contre les failles courantes

| Faille | Situation dans le projet |
|---|---|
| **Injection SQL** | Aucune requête SQL n'est construite par concaténation. Tout passe par le constructeur de requêtes de `supabase-js`, qui envoie les valeurs comme paramètres. |
| **XSS** (injection de HTML/JS) | Vue échappe par défaut ce qui est affiché avec `{{ }}`. Aucun `v-html` dans le projet. Les infobulles de [CarteMayotte.vue](../frontend/src/components/CarteMayotte.vue), construites en HTML pour `bindPopup`, échappent les textes saisis par les utilisateurs (fonction `echapper`, corrigé en novembre 2026). |
| **CSRF** | La session est un cookie `httpOnly`, `SameSite=Lax` (préfixe `__Host-` en production). Le serveur refuse en plus toute requête qui modifie des données si son en-tête `Origin` n'est pas celui du site. |
| **Exposition de clés** | La clé « service role » et la clé de l'API d'IA ne sont lues que côté serveur. Le fichier `.env` est dans `.gitignore`. Seules les variables préfixées `VITE_` arrivent dans le navigateur, et la clé « anon » est conçue pour être publique. |
| **Énumération de comptes** | Message de connexion unique ; la page « mot de passe oublié » affiche la même confirmation que l'adresse existe ou non. |
| **Force brute** | Limites par adresse IP côté serveur ([authRoutes.js](../backend/authRoutes.js)) : 10 connexions / 15 min, 5 inscriptions / heure, 4 demandes de réinitialisation / heure. Mots de passe de 8 caractères minimum, avec une jauge de force à la saisie. |
| **Élévation de privilèges** | L'admin est reconnu par son e-mail, vérifié côté base et côté serveur à partir du jeton, pas à partir d'une donnée modifiable par l'utilisateur. Point faible : un utilisateur peut modifier sa propre colonne `role` (voir [06-base-de-donnees.md](06-base-de-donnees.md)). |

| **Fuite de coordonnées** | Le téléphone et l'adresse d'une personne ne sont envoyés qu'à elle-même, à l'administrateur et aux personnes avec qui elle a une demande acceptée ou terminée. Ailleurs : « Numéro après acceptation ». Voir [05-backend.md](05-backend.md) § 7 bis. |

### Autres constats

- **Routes backend** : `/api/adherents` est réservé à l’administrateur depuis novembre 2026 (elle était auparavant ouverte à tous).
- **Code d'arrivée** : généré avec `crypto.getRandomValues` ([store.js](../frontend/src/data/store.js), `genererCodeArrivee`), donc non prévisible. Il est créé dans le navigateur de l'intervenant, pas sur un serveur.
- **Fonction Edge** : [notify-contact-message](../supabase/functions/notify-contact-message/index.ts) envoie un e-mail pour tout corps contenant `record.message`. Elle ne vérifie pas elle-même l'origine de l'appel ; cela dépend des réglages de la fonction dans Supabase, **non trouvés dans le dépôt**.

## 8. Données personnelles et RGPD

### Données collectées

| Donnée | Où elle est saisie | Où elle est stockée | Qui peut la lire |
|---|---|---|---|
| E-mail, mot de passe | `Inscription.vue` | `auth.users` (Supabase Auth) | Supabase ; l'utilisateur lui-même |
| Nom, téléphone, commune, adresse | `Inscription.vue`, `Profil.vue` | `profiles` | **Tout utilisateur connecté** |
| Rôle, spécialité, services, présentation, disponibilités | `Inscription.vue`, `Profil.vue` | `profiles` | Tout utilisateur connecté |
| Formule choisie | `PaiementFormule.vue` | `profiles.abonnement` | Tout utilisateur connecté |
| Message de demande d'aide (texte libre) | `NouvelleDemande.vue` | `demandes.message` | Le demandeur, l'intervenant, l'admin |
| Type de service demandé (dont « soins »), urgence | `NouvelleDemande.vue` | `demandes` | Idem |
| Avis | `PourQui.vue` | `avis` (avec le nom) | Tout le monde, même non connecté |
| Message de contact | `SosButton.vue` | `messages_contact` ; recopié par e-mail à l'admin | Admin |
| Adhérents (nom, e-mail, téléphone, commune) | `AdminAdherents.vue` | `backend/data/adherents.json` + table `adherents` | Quiconque appelle `GET /api/adherents` |
| Données de carte bancaire | `PaiementFormule.vue` | **Nulle part** : contrôlées dans le navigateur puis ignorées | — |

### Données de santé

Le projet n'a **pas de champ médical structuré** (pas de pathologie, de traitement, de dossier). Deux endroits peuvent toutefois contenir des informations de santé : le texte libre `demandes.message`, et le fait même de demander des « soins » à un professionnel de santé.

### Ce qui est constaté

- **Minimisation de l'affichage** : la carte place un intervenant sur sa commune, pas sur son adresse (commentaire dans `store.js`), et ne s'affiche qu'aux utilisateurs connectés.
- **Coordonnées visibles avant toute mise en relation** : `ProviderCard` affiche un bouton « Appeler » avec le téléphone de l'intervenant dès la recherche, et la règle RLS de lecture des profils expose téléphone et adresse de tous les comptes à tout utilisateur connecté.
- **Droit à l'effacement** : il n'existe pas de bouton « supprimer mon compte » pour l'utilisateur. La suppression n'est possible que par l'administrateur (`DELETE /api/admin/comptes/:id`). Elle efface alors le compte, le profil, les demandes, les missions et les avis par cascade ; les messages de contact sont conservés avec `user_id` à `null` et le nom saisi.
- **Information des utilisateurs** : aucune page de mentions légales, de politique de confidentialité ni de recueil de consentement — **non trouvé dans le code**.
- **Export des données personnelles, durée de conservation** : non trouvé dans le code.
- **Sous-traitants** : Supabase, Render (hébergement), MongoDB Atlas (si configuré), Google (polices, SMTP Gmail), IGN (cartes), Unsplash (photos). Aucun document du dépôt ne les liste pour l'utilisateur.
- **Fichier d'adhérents dans Git** : `backend/data/adherents.json` est suivi par Git et contient un enregistrement. S'il s'agit d'une personne réelle, ses données sont dans l'historique du dépôt.

## À retenir

- Supabase Auth gère comptes, mots de passe et sessions ; le projet ne manipule jamais un mot de passe en clair en dehors du formulaire.
- L'administrateur est un e-mail écrit en dur à quatre endroits, pas un rôle en base.
- Les règles « qui suis-je » sont garanties par la base ; les règles « quel est mon rôle métier » ne le sont que par l'interface.
- La position GPS affichée sur la carte « Ma position » reste dans le navigateur : elle n’est ni envoyée au serveur ni enregistrée.
- Côté RGPD, il manque l'information des utilisateurs, la suppression de compte par l'utilisateur, et une lecture plus restreinte des profils.
