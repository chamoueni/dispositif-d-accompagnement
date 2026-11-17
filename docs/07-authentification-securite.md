# 07 — Authentification et sécurité

## 1. Qui fait quoi

Depuis la migration vers alwaysdata (novembre 2026), l'authentification est **gérée par le backend lui-même** : mots de passe hachés avec **bcrypt** (`bcryptjs`), connexion par **jeton JWT** (`jsonwebtoken`) rangé dans un **cookie httpOnly**. Le navigateur ne voit jamais ni le mot de passe haché, ni le jeton.

| Besoin | Côté navigateur | Côté serveur |
|---|---|---|
| Créer un compte | `signup` ([stores/auth.js](../frontend/src/stores/auth.js)) → `POST /api/auth/register` | `inscrire` ([auth.controller.js](../backend/controllers/auth.controller.js)) : hache le mot de passe, crée `utilisateurs` + `profiles` dans une transaction, pose le cookie |
| Se connecter | `login` → `POST /api/auth/login` | `connecter` : compare le mot de passe à l'empreinte bcrypt, pose le cookie |
| Se déconnecter | `logout` → `POST /api/auth/logout` | `deconnecter` : efface le cookie |
| Changer son mot de passe | `changerMotDePasse` → `PUT /api/auth/password` | nouvelle empreinte, `version_jeton + 1` (autres appareils déconnectés), nouveau cookie pour cet appareil |
| Mot de passe oublié | `demanderReinitialisationMotDePasse` → `POST /api/auth/forgot-password` | jeton aléatoire (empreinte SHA-256 en base, valable 1 h, une fois), email envoyé à l'adresse du compte |
| Restaurer la session au chargement | `initialiserSession` → `GET /api/auth/session` | `sessionCourante` |
| Protéger les pages | `router.beforeEach` ([router/index.js](../frontend/src/router/index.js)) | — |
| Protéger les données | — | contrôles dans les contrôleurs ([06-base-de-donnees.md](06-base-de-donnees.md) § 3) |
| Protéger les routes admin | — | `verifierAdmin` ([middleware/admin.js](../backend/middleware/admin.js)) |

## 2. Connexion et vérification de l'identité

1. L'utilisateur saisit email et mot de passe ([Connexion.vue](../frontend/src/pages/Connexion.vue)).
2. Le serveur cherche le compte par email (en minuscules) et compare le mot de passe avec `bcrypt.compare` ([motDePasse.service.js](../backend/services/motDePasse.service.js)). Si l'email n'existe pas, il fait quand même une comparaison factice : la réponse prend le même temps, ce qui empêche de deviner quels emails sont inscrits. Le message est toujours « Email ou mot de passe incorrect. ».
3. En cas de succès, le serveur fabrique un **JWT** signé avec `JWT_SECRET` ([jeton.service.js](../backend/services/jeton.service.js)) : identifiant du compte (`sub`), version (`v`), durée (12 h, ou 30 jours avec « Se souvenir de moi »).
4. Ce jeton est rangé dans un cookie **httpOnly**, **Secure** et **SameSite=Lax**, nommé `__Host-dispositif_session` en production.
5. À chaque requête, `middleware/session.js` vérifie la signature et la date du jeton, puis **relit le compte dans la base** : il doit exister et avoir la même `version_jeton`. Le rôle est relu lui aussi, donc un changement de rôle s'applique tout de suite.

**Mot de passe.** 8 caractères minimum, vérifiés côté serveur (`MOT_DE_PASSE_MIN`) et côté site (`frontend/src/lib/motDePasse.js`, avec une jauge de force). Haché avec bcrypt, coût 10 (2¹⁰ tours) et sel aléatoire. Les comptes venus de Supabase ont gardé leur empreinte bcrypt (`$2a$10$…`) : leur mot de passe habituel fonctionne toujours.

**Confirmation de l'email** : il n'y en a pas. Le compte est actif dès l'inscription.

## 3. Conservation de la session

- Le navigateur ne garde qu'un cookie httpOnly : le JavaScript de la page ne peut pas le lire, donc un script malveillant injecté ne pourrait pas le voler.
- Au chargement de la page, [stores/auth.js](../frontend/src/stores/auth.js) appelle `/api/auth/session` puis passe `state.initialized` à `true`. Le routeur attend ce signal avant de décider d'une redirection (`attendreInitialisation`).
- Si l'API répond `401` (jeton expiré, mot de passe changé ailleurs), [services/api.js](../frontend/src/services/api.js) émet l'événement `auth:expired` et le site se met en mode déconnecté.
- Pour tester l'API avec Postman, le serveur accepte aussi l'en-tête `Authorization: Bearer <jeton>`.

**Contrôles d'accès** : il n'y a plus de règles RLS dans la base. Chaque route vérifie elle-même les droits ; **toute nouvelle route doit le faire aussi**.

## 4. Rôles et permissions

Quatre profils d'utilisation, trois valeurs de rôle dans `profiles` et un statut administrateur dans `utilisateurs`.

| Profil | Comment il est reconnu | `req.utilisateur.role` |
|---|---|---|
| Personne âgée | `profiles.role = 'senior'` (choisi à l'inscription) | `senior` |
| Personnel de santé | `profiles.role = 'sante'` | `sante` |
| Particulier | `profiles.role = 'particulier'` | `particulier` |
| Administrateur | `utilisateurs.est_admin = true` | `admin` |

Côté site, `isAdmin` lit `user.est_admin` renvoyé par le serveur ([stores/auth.js](../frontend/src/stores/auth.js)) : ce n'est qu'un affichage, chaque route admin est **aussi** vérifiée par le serveur.

### Où les permissions sont appliquées

| Règle | Interface | Routeur | Serveur |
|---|---|---|---|
| Page réservée aux connectés | — | `meta.requiresAuth` | `requireAuth` / `401` |
| Espace admin | navbar masque les liens | `meta.requiresAdmin` | `verifierAdmin` (`403`) |
| Seule une personne âgée envoie une demande | bouton masqué (`ProviderCard`), `acces` dans `NouvelleDemande` | non | **partiel** : le destinataire doit être un intervenant et pas soi-même, mais le rôle du demandeur n'est pas vérifié |
| Seul l'intervenant accepte ou refuse (RG12) | boutons affichés selon le rôle (`MesDemandes`) | non | **oui** : `403` pour tout autre compte (`demande.service.js`) |
| Seule une personne âgée souscrit une formule | `accesAutorise`, `peutSouscrire` | non | **non** |
| Chacun ne modifie que son profil | — | — | oui (identifiant pris dans le jeton) |
| Seuls les participants voient une demande ou une mission | — | — | oui |
| Seul l'admin lit les messages de contact et les adhérents | — | — | oui |
| Seul l'admin valide un profil (`verifie`) | — | — | oui, + déclencheur dans la base |

Le middleware `exigerRole('senior', …)` permet de restreindre une route à certains rôles ; les règles « métier » marquées **non** ci-dessus sont des améliorations possibles.

## 5. Communication frontend ↔ backend

- En développement, Vite redirige `/api` vers `http://localhost:3001` ([vite.config.js](../frontend/vite.config.js)).
- En production, front (`/fil`) et API (`/fil/api`) sont deux sites alwaysdata sur le **même nom de domaine** : [services/api.js](../frontend/src/services/api.js) appelle `/fil/api/...` et le cookie reste « du même site ».
- Toutes les routes `/api/...` reçoivent le cookie automatiquement (`credentials: 'same-origin'`).

## 6. Protections contre les failles courantes

| Faille | Situation dans le projet |
|---|---|
| **Injection SQL** | Aucune requête construite par concaténation de valeurs : toutes les requêtes de `backend/models/` sont paramétrées (`$1, $2…`). Les noms de colonnes des mises à jour viennent d'une liste fixe, jamais du navigateur. |
| **XSS** (injection de HTML/JS) | Vue échappe par défaut ce qui est affiché avec `{{ }}`. Aucun `v-html` dans le projet. Les infobulles de [CarteMayotte.vue](../frontend/src/components/CarteMayotte.vue) et les emails ([email.service.js](../backend/services/email.service.js)) échappent les textes saisis par les utilisateurs. |
| **Vol de session** | Jeton dans un cookie httpOnly (illisible par le JavaScript), `Secure` (HTTPS seulement), préfixe `__Host-`. |
| **CSRF** | Cookie `SameSite=Lax`, et le serveur refuse toute requête qui modifie des données si son en-tête `Origin` n'est pas celui du site (`403`). |
| **Exposition de secrets** | `DATABASE_URL`, `JWT_SECRET`, `SMTP_PASS` ne sont lus que côté serveur ; `.env` est dans `.gitignore` ; sur alwaysdata, ils sont saisis dans la fiche du site API. Seules les variables préfixées `VITE_` arrivent dans le navigateur (adresse du site). |
| **Énumération de comptes** | Message de connexion unique et temps de réponse identique ; « mot de passe oublié » affiche la même confirmation que l'adresse existe ou non. |
| **Force brute** | Limites par adresse IP ([limiteurs.js](../backend/middleware/limiteurs.js)) : 10 connexions / 15 min, 5 inscriptions / heure, 4 demandes de réinitialisation / heure. bcrypt est volontairement lent. |
| **Lien de réinitialisation** | Jeton aléatoire de 32 octets ; seule son empreinte SHA-256 est en base ; valable 1 heure, une seule fois ; placé après `#` dans l'adresse (jamais envoyé au serveur ni écrit dans un journal). |
| **Élévation de privilèges** | L'admin est reconnu par `utilisateurs.est_admin`, relu dans la base à chaque requête. `verifie` est protégé par le serveur et par un déclencheur. Point faible : un utilisateur peut modifier sa propre colonne `role` (voir [06-base-de-donnees.md](06-base-de-donnees.md) § 3). |
| **Fuite de coordonnées** | Le téléphone et l'adresse d'une personne ne sont envoyés qu'à elle-même, à l'administrateur et aux personnes avec qui elle a une demande acceptée ou terminée. Ailleurs : « Numéro après acceptation ». |
| **En-têtes** | `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, HSTS : envoyés par l'API ([securite.js](../backend/middleware/securite.js)) et par le front (`.htaccess`). |

### Autres constats

- **Code d'arrivée** : généré **sur le serveur** avec `crypto.randomInt` ([demande.service.js](../backend/services/demande.service.js)), donc non prévisible, dans la même transaction que l'acceptation de la demande.
- **Pas de confirmation de l'email** à l'inscription : une personne peut s'inscrire avec l'adresse de quelqu'un d'autre.

## 7. Données personnelles et RGPD

### Données collectées

| Donnée | Où elle est saisie | Où elle est stockée | Qui peut la lire |
|---|---|---|---|
| Email, mot de passe (haché) | `Inscription.vue` | `utilisateurs` | Le serveur ; l'utilisateur voit son email |
| Nom, commune | `Inscription.vue`, `Profil.vue` | `profiles` | Tout utilisateur connecté |
| Téléphone, adresse | `Inscription.vue`, `Profil.vue` | `profiles` | La personne, l'admin, et ses contacts après une demande acceptée |
| Rôle, spécialité, services, présentation, disponibilités | `Inscription.vue`, `Profil.vue` | `profiles` | Tout utilisateur connecté |
| Formule choisie | `PaiementFormule.vue` | `profiles.abonnement` | Tout utilisateur connecté |
| Message de demande d'aide (texte libre) | `NouvelleDemande.vue` | `demandes.message` | Le demandeur, l'intervenant, l'admin |
| Type de service demandé (dont « soins »), urgence | `NouvelleDemande.vue` | `demandes` | Idem |
| Avis | `PourQui.vue` | `avis` (avec le nom) | Tout le monde, même non connecté |
| Message de contact | `SosButton.vue` | `messages_contact` ; recopié par email à l'admin | Admin |
| Adhérents (nom, email, téléphone, commune) | `AdminAdherents.vue` | `adherents` | L'administrateur seulement |
| Données de carte bancaire | `PaiementFormule.vue` | **Nulle part** : contrôlées dans le navigateur puis ignorées | — |

### Données de santé

Le projet n'a **pas de champ médical structuré** (pas de pathologie, de traitement, de dossier). Deux endroits peuvent toutefois contenir des informations de santé : le texte libre `demandes.message`, et le fait même de demander des « soins » à un professionnel de santé. Ces deux informations ne sont visibles que par les deux participants et l'administrateur.

### Ce qui est constaté

- **Hébergement en France** : base, API et site sont chez alwaysdata (Paris). Les pages [Mentions légales](../frontend/src/pages/MentionsLegales.vue) et [Confidentialité](../frontend/src/pages/Confidentialite.vue) l'indiquent.
- **Minimisation de l'affichage** : la carte place un intervenant sur sa commune, pas sur son adresse, et ne s'affiche qu'aux utilisateurs connectés. La position GPS de « Ma position » reste dans le navigateur.
- **Droit à l'effacement** : pas de bouton « supprimer mon compte » pour l'utilisateur. La suppression est faite par l'administrateur (`DELETE /api/admin/comptes/:id`) : compte, profil, demandes, missions et avis partent par cascade ; les messages de contact sont conservés avec `user_id` à `null` et le nom saisi.
- **Information des utilisateurs** : pages Mentions légales, Confidentialité et Cookies présentes.
- **Export des données personnelles, durée de conservation** : non trouvé dans le code.
- **Sous-traitants** : alwaysdata (hébergement, base, emails), Google (polices), IGN (cartes), Unsplash (photos).
- **Sauvegarde de migration** : le transfert depuis Supabase a produit deux fichiers SQL contenant des données personnelles et les empreintes des mots de passe ; ils sont gardés **hors du dépôt**, sur le poste du propriétaire.

## À retenir

- Comptes gérés par le serveur : bcrypt pour les mots de passe, JWT dans un cookie httpOnly pour la session.
- L'administrateur est reconnu par la colonne `utilisateurs.est_admin`, relue à chaque requête.
- Toutes les protections d'accès aux données sont dans le serveur : chaque nouvelle route doit les refaire.
- Les règles du cycle de vie d'une demande (RG11, RG12, RG14) sont vérifiées par le serveur ; d'autres règles liées au rôle (qui envoie une demande, qui souscrit une formule) restent appliquées par l'interface.
- Côté RGPD : hébergement en France, coordonnées masquées, pages légales présentes ; il manque la suppression de compte par l'utilisateur et une politique de conservation.
