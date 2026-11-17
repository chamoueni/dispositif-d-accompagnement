# 08 — Flux complets

Chaque flux suit le même fil : **clic → composant → fonction JS → requête `/api/...` → route → contrôleur (contrôle des droits) → modèle SQL → base → réponse → mise à jour de l'écran.**

Rappel important : le navigateur ne parle **qu'à l'API Express**. Côté site, les fonctions de [store.js](../frontend/src/data/store.js) et de [stores/auth.js](../frontend/src/stores/auth.js) appellent `apiRequest` ([services/api.js](../frontend/src/services/api.js)). Les données métier passent par une seule adresse, `POST /api/data { action, payload }` (une « action » par opération, traitée par [data.controller.js](../backend/controllers/data.controller.js)).

---

## 1. Inscription

```
Inscription.vue  →  handleSubmit()  →  signup()  [stores/auth.js]
      →  POST /api/auth/register            [auth.routes.js : limite 5/heure]
            →  inscrire()                    [auth.controller.js]
                  →  contrôle email, mot de passe (8+), rôle, nom
                  →  hacherMotDePasse()      (bcrypt)
                  →  transaction : creerUtilisateur() → utilisateurs
                                   creerProfil()      → profiles (verifie = false)
                  →  poserCookie()           (JWT httpOnly)
            ←  201 + profil
      →  state.user  →  router.push('/mon-compte')
```

1. L'utilisateur choisit son rôle et remplit le formulaire ([Inscription.vue](../frontend/src/pages/Inscription.vue)).
2. `handleSubmit` contrôle les champs obligatoires, l'email, le téléphone et la longueur du mot de passe. En cas d'erreur, le message s'affiche et rien n'est envoyé.
3. Le serveur refait tous les contrôles (c'est lui qui fait foi), hache le mot de passe et crée **le compte et le profil dans une même transaction** : si le profil échoue (numéro déjà pris), le compte n'est pas gardé.
4. La personne est connectée tout de suite (pas de confirmation par email).
5. Erreurs possibles : email déjà utilisé (`409`), téléphone déjà utilisé (`409`), trop de tentatives (`429`), réseau.

Un intervenant (`sante`, `particulier`) est créé avec `verifie = false` : il n'apparaît dans la recherche qu'après validation par l'administrateur.

## 2. Connexion et déconnexion

```
Connexion.vue  →  handleSubmit()  →  login()  →  POST /api/auth/login   [limite 10/15 min]
      →  connecter() : trouverPourConnexion(email) → verifierMotDePasse() (bcrypt)
      →  poserCookie()  →  chargerProfil()  ←  profil + email + est_admin
      →  state.user  →  router.push(redirect || '/mon-compte')
```

- Si l'utilisateur venait d'une page protégée, la garde du routeur avait mis sa destination dans `?redirect=` ; il y est renvoyé.
- La barre de navigation ([AppNav.vue](../frontend/src/components/AppNav.vue)) change toute seule, car elle lit `user`.
- Toute erreur donne le même message « Email ou mot de passe incorrect. ».
- **Déconnexion** : `handleLogout` (navbar) ou `seDeconnecter` (Mon compte) → `logout()` → `POST /api/auth/logout` (le serveur efface le cookie) → `state.user = null` → retour à l'accueil.

## 3. Mot de passe oublié

```
MotDePasseOublie.vue → handleSubmit() → demanderReinitialisationMotDePasse(email)
      → POST /api/auth/forgot-password                     [limite 4/heure]
            → motDePasseOublie() : compte trouvé ?
                  oui → jeton aléatoire → jetons_reinitialisation (empreinte SHA-256, 1 h)
                      → envoyerLienReinitialisation()  → email (SMTP alwaysdata) à l'adresse du compte
                  non → rien n'est envoyé
            ← même message dans les deux cas
Lien cliqué (…/reinitialiser-mot-de-passe#type=recovery&access_token=…)
      → ReinitialiserMotDePasse.vue lit le jeton dans l'adresse
      → verifierLienReinitialisation() → POST /api/auth/recovery/verify
      → handleSubmit() → reinitialiserMotDePasse() → POST /api/auth/recovery
            → transaction : jeton valable ? → nouveau mot de passe (version_jeton + 1) → jetons invalidés
      → message de réussite
```

Le lien ne marche qu'une fois et pendant 1 heure ; les sessions ouvertes du compte sont fermées. L'email est mis en page aux couleurs du site et salue la personne par son nom.

## 4. Disponibilités d'un intervenant

```
Profil.vue (case du calendrier) → toggleCreneau(jour, creneau)
      → updateProfile({ disponibilites })  [auth.js]
      → POST /api/data { action: 'profiles.updateOwn' }
            → patchProfil() (champs autorisés) → modifierProfil(id du jeton) → profiles
      → state.user mis à jour → la case change de couleur
```

1. Le calendrier affiche 7 jours × 3 créneaux fixes (`CRENEAUX`).
2. Un clic ajoute ou retire l'objet `{ jour, heureDebut, heureFin }` du tableau, puis réécrit **tout le tableau** en base.
3. La case ne change d'état qu'après la réponse du serveur. En cas d'échec, `slotError` s'affiche.
4. Effet immédiat sur la recherche : `ProviderCard` lit `provider.disponibilites` à chaque chargement des profils.

Pas de saisie des disponibilités à l'inscription : `Inscription.vue` envoie toujours un tableau vide.

## 5. Recherche d'un intervenant

```
RecherchePersonnel.vue → onMounted → getUsers()  [store.js]
      → POST /api/data { action: 'profiles.list' }
            → listerProfils() → filtrage : profils non validés, comptes de démo
            → masquage du téléphone et de l'adresse (sauf demande acceptée commune)
      → users.value
filtres (type, commune) → computed results → une ProviderCard par résultat
```

1. Tous les profils visibles sont chargés **une seule fois**.
2. Le filtrage par type et commune se fait dans le navigateur : `sante` → `role === 'sante'` ; `coursier` ou `menage` → `role === 'particulier'` et service coché ; commune si choisie. Les résultats sont triés par distance entre communes (`distanceEntreCommunes`).
3. Changer un filtre ne relance aucune requête.
4. Sans demande acceptée, la carte affiche « Numéro après acceptation » au lieu du téléphone.

Ce que la recherche ne fait pas : elle ne tient pas compte de `actif`, n'exige pas qu'un intervenant ait un service ou une disponibilité, ne filtre pas par jour ou créneau. Le filtre par jour existe seulement dans l'assistant ([AssistantBesoin.vue](../frontend/src/pages/AssistantBesoin.vue)).

## 6. Création d'une demande

```
ProviderCard (« Envoyer une demande ») → /nouvelle-demande/:aidantId
NouvelleDemande.vue → onMounted
      → findById(aidantId)                   → action 'profiles.find'
      → getDemandesByDemandeur(user.id)      → action 'demandes.byDemandeur' (détection d'un doublon)
formulaire → handleSubmit() → addDemande(payload)  [store.js]
      → POST /api/data { action: 'demandes.create' }
            → contrôles : destinataire = intervenant existant, pas soi-même
            → creerDemande(demandeur = id du jeton) → demandes (statut 'en_attente')
      → envoyee = true → écran de confirmation
```

1. Le bouton n'apparaît que pour une personne âgée.
2. La page calcule `acces`. Si une demande `en_attente` ou `acceptee` existe déjà vers cet intervenant, l'envoi est bloqué (`deja-envoyee`).
3. Le formulaire propose : le service (si l'intervenant en a plusieurs), l'urgence, un créneau parmi les disponibilités de l'intervenant, un message (saisi ou dicté).
4. `envoiEnCours` empêche un double envoi par double clic.

Non vérifié par le code : que le créneau n'est pas dans le passé (un créneau est un jour de semaine, sans date), que le service demandé est bien proposé par l'intervenant, ni que le demandeur est une personne âgée (seule l'interface l'impose).

## 7. Acceptation et mise en relation

```
MesDemandes.vue (intervenant, « Accepter ») → accepter(demande)
      → updateDemandeStatut(id, 'acceptee')  [store.js]
      → POST /api/data { action: 'demandes.updateStatut' }
            → changerStatutDemande()  [demande.service.js], dans UNE transaction :
                  → trouverDemande(id) verrouillée → la personne connectée est-elle participante ? sinon 404
                  → code d'arrivée : crypto.randomInt → 4 chiffres (si pas encore de code)
                  → modifierStatut()  → demandes (statut, code_arrivee, date_mise_a_jour)
                  → pas encore de mission ? → creerMission() → mises_en_relation
      → charger() → la liste se rafraîchit
```

1. L'intervenant voit les demandes reçues (`getDemandesByAidant`).
2. Le code, le statut et la mission sont écrits **ensemble** : soit tout réussit, soit rien ne change (plus de demande « acceptée » sans mission).
3. Le code d'arrivée apparaît chez les deux personnes, avec une consigne différente (attendre le code / annoncer le code). Le téléphone de l'autre personne devient visible.
4. Le badge affiche « Acceptée », puis « En cours » après 3 minutes (`missionDemarree`). C'est un simple délai d'affichage : en base, la mission est `en_cours` dès sa création.

**À connaître**

- Les deux participants peuvent changer le statut (seule l'interface réserve « Accepter » à l'intervenant).
- Aucun contrôle n'empêche un intervenant d'accepter deux demandes sur le même créneau.

**Refus et annulation** : même chemin, statut `refusee` ou `annulee`, sans création de mission.

## 8. Fin de mission et historique

```
MesAccompagnements.vue (« Terminer ») → terminer(mission)
      → updateMiseEnRelationStatut(id, 'terminee')  → action 'missions.updateStatut' (participant ? statut + date_fin)
      → updateDemandeStatut(demandeId, 'terminee')  → action 'demandes.updateStatut'
      → charger()
Historique.vue → getDemandesByDemandeur / getDemandesByAidant → filtre 'terminee' | 'annulee'
« Refaire cette demande » → refaire(demande) → /nouvelle-demande/:aidantId?typeService=…&urgence=…&message=…
```

La mission et la demande ont chacune leur statut ; la page met à jour les deux pour qu'ils restent cohérents.

## 9. Création d'un compte par l'administrateur

```
AdminComptes.vue (« Nouveau compte » → formulaire) → valider()
      → dashboard.creerCompte(payload)          [stores/adminDashboard.js]
      → createCompteAdmin(payload)              [store.js]
            → POST /api/admin/comptes            (cookie de session)
                  → verifierAdmin               [middleware/admin.js]
                  → creerCompte()               [admin.controller.js]
                        → mot de passe aléatoire haché
                        → transactionAdmin : creerUtilisateur() + creerProfil() (verifie = true par défaut)
                  ← 201 + profil
      → utilisateurs mis à jour dans le store → la liste et les compteurs changent
      → demanderReinitialisationMotDePasse(email) → email à la personne pour choisir son mot de passe
```

**Suppression** : `supprimer(u)` → `dashboard.supprimerCompte` → `deleteCompteAdmin` → `DELETE /api/admin/comptes/:id` → `supprimerUtilisateur()`. Le profil et ses demandes, missions et avis disparaissent par cascade. L'administrateur ne peut pas supprimer son propre compte.

**Modification et validation** : `dashboard.modifierCompte` → `updateCompteAdmin` → action `profiles.updateAdmin` → `transactionAdmin` (seule autorisée à changer `verifie`).

## 10. Gestion des adhérents

```
AdminAdherents.vue → enregistrer()
      → store.creerAdherent(formulaire)         [stores/adherents.js]
            → apiRequest POST /api/adherents
                  → verifierAdmin()             [backend/middleware/admin.js]
                  → validerAdherent()           [backend/services/validation.service.js]
                  → ajouterAdherent()           [backend/models/adherent.model.js] → table adherents
                  ← 201 + adhérent
      → adherents.value.push(...) → le tableau se met à jour → notifier('Adhérent ajouté…')
```

Correspondance avec le découpage classique : route = `routes/adherents.routes.js` ; controller = `controllers/adherents.controller.js` ; model = `models/adherent.model.js` ; service = `services/validation.service.js`.

## 12. Message de contact

```
SosButton.vue (« Un problème avec le site ») → envoyerMessage()
      → addMessageContact({ userId, nom, message })   [store.js]
      → POST /api/data { action: 'contact.create' }   (ouvert à tous)
            → creerMessage() → messages_contact
            → alerterNouveauMessage() → email à EMAIL_ADMIN (un échec d'envoi n'annule pas le message)
      → envoye = true
(côté admin) AdminMessages.vue / AdminDashboard.vue → marquerLu(), supprimer()  (administrateur seulement)
```

Fonctionne sans compte : `nom` vaut alors « Visiteur non connecté ».

## 13. Avis

```
PourQui.vue → onMounted → getAvis() → action 'avis.list' (publique)
(connecté) → handleAjouterAvis() → addAvis({ userId, nom, texte }) → action 'avis.create' → getAvis() à nouveau
      (le serveur ne garde que le texte : auteur et nom viennent du jeton et du profil)
(auteur ou admin) → handleSupprimerAvis(id) → deleteAvis(id) → action 'avis.delete' (sinon 403)
```

Un avis porte sur le dispositif. Il n'est lié ni à un intervenant ni à une mission, et n'a pas de note.

## 14. Choix d'une formule

```
FormulesSection (« Choisir … ») → /formule/:formuleId
PaiementFormule.vue → handleConfirmer()
      → carteValide()   (contrôle local, uniquement si la formule est payante)
      → updateProfile({ abonnement: { formuleId, dateDebut } }) → action 'profiles.updateOwn'
      → confirmee = true
```

Aucun prestataire de paiement n'est appelé. Les limites annoncées par les formules (« 3 mises en relation », « 2 demandes actives ») ne sont appliquées nulle part dans le code.

## 15. Notifications

**Cette fonctionnalité n'existe pas dans le code.** Il n'y a ni table, ni envoi, ni affichage de notification pour les utilisateurs. Un utilisateur découvre une nouvelle demande ou une réponse en ouvrant « Mes demandes » (un badge « nouvelle demande » s'affiche sur Mon compte). Les seuls emails automatiques sont « mot de passe oublié » (flux 3) et l'alerte SOS à l'administrateur (flux 12).

## À retenir

- Le chemin est toujours : page → fonction de `store.js` ou `auth.js` → `apiRequest` → route → contrôleur (droits) → modèle SQL → base.
- L'identité vient du jeton : le navigateur ne choisit jamais « au nom de qui » il écrit.
- L'acceptation d'une demande (statut + code + mission) est faite en une seule transaction sur le serveur.
- La recherche charge les profils visibles puis filtre dans le navigateur.
- Il n'y a pas de notifications ni de paiement réel.
