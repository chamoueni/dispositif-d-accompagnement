# 08 — Flux complets

Chaque flux suit le même fil : **clic → composant → fonction JS → requête → base ou backend → réponse → mise à jour de l'écran.**

Rappel important : pour la plupart des fonctionnalités, il n'y a **pas de route backend ni de controller**. Le navigateur appelle Supabase directement. Les étapes « route backend → controller → service » n'existent que pour les flux 9, 10 et 11.

---

## 1. Inscription

```
Inscription.vue  →  handleSubmit()  →  signup()  [stores/auth.js]
      →  supabase.auth.signUp()            → auth.users
      →  supabase.from('profiles').insert  → profiles   (règle profiles_insert_own)
      →  chargerProfil()                   → state.user
      →  router.push('/mon-compte')
```

1. L'utilisateur choisit son rôle et remplit le formulaire ([Inscription.vue](../frontend/src/pages/Inscription.vue)).
2. `handleSubmit` contrôle les champs obligatoires, l'e-mail, le téléphone et la longueur du mot de passe. En cas d'erreur, le message s'affiche et rien n'est envoyé.
3. `signup(payload)` ([auth.js](../frontend/src/stores/auth.js), ligne 131) crée le compte Auth. Les informations du formulaire sont aussi rangées dans les métadonnées du compte.
4. **Deux cas :**
   - *Session reçue* : la ligne `profiles` est insérée, le profil est chargé, la page redirige vers `/mon-compte`.
   - *Pas de session* (confirmation par e-mail activée) : `signup` lève une erreur dont le texte est en réalité un message de succès (« Compte créé : un email de confirmation a été envoyé… »). Il s'affiche dans la zone d'erreur du formulaire. Le profil sera créé à la première connexion par `creerProfilDepuisMetadata`.
5. Erreurs possibles : e-mail déjà utilisé, téléphone déjà utilisé (`profiles_telephone_unique`), réseau. Elles sont traduites par `messageErreurAuth` / `messageErreurProfil`.

## 2. Connexion et déconnexion

```
Connexion.vue  →  handleSubmit()  →  login()  →  supabase.auth.signInWithPassword()
      →  chargerProfil()  →  profiles (lecture de sa ligne)  →  state.user
      →  router.push(redirect || '/mon-compte')
```

- Si l'utilisateur venait d'une page protégée, la garde du routeur avait mis sa destination dans `?redirect=` ; il y est renvoyé.
- La barre de navigation ([AppNav.vue](../frontend/src/components/AppNav.vue)) change toute seule, car elle lit `user`.
- Toute erreur de connexion donne le même message « Email ou mot de passe incorrect. » — y compris un e-mail pas encore confirmé.
- **Déconnexion** : `handleLogout` (navbar) ou `seDeconnecter` (Mon compte) → `logout()` → `supabase.auth.signOut()` → `state.user = null` → retour à l'accueil.

## 3. Mot de passe oublié

```
MotDePasseOublie.vue → handleSubmit() → demanderReinitialisationMotDePasse(email)
      → supabase.auth.resetPasswordForEmail(email, { redirectTo: <site>/reinitialiser-mot-de-passe })
      → e-mail envoyé par Supabase
Lien cliqué → ReinitialiserMotDePasse.vue → session de récupération détectée
      → handleSubmit() → changerMotDePasse() → supabase.auth.updateUser({ password })
      → logout() → message de réussite
```

## 4. Disponibilités d'un intervenant

```
Profil.vue (case du calendrier) → toggleCreneau(jour, creneau)
      → updateProfile({ disponibilites })  [auth.js]
      → supabase.from('profiles').update(...).eq('id', user.id)   (règle profiles_update_own)
      → state.user mis à jour → la case change de couleur
```

1. Le calendrier affiche 7 jours × 3 créneaux fixes (`CRENEAUX`).
2. Un clic ajoute ou retire l'objet `{ jour, heureDebut, heureFin }` du tableau, puis réécrit **tout le tableau** en base.
3. La case ne change d'état qu'après la réponse de Supabase. En cas d'échec, `slotError` s'affiche.
4. Effet immédiat sur la recherche : `ProviderCard` lit `provider.disponibilites` à chaque chargement des profils.

Pas de saisie des disponibilités à l'inscription : `Inscription.vue` envoie toujours un tableau vide.

## 5. Recherche d'un intervenant

```
RecherchePersonnel.vue → onMounted → getUsers()  [store.js]
      → supabase.from('profiles').select('*')    (règle profiles_select_authenticated)
      → users.value
filtres (type, commune) → computed results → une ProviderCard par résultat
```

1. Tous les profils sont chargés **une seule fois**.
2. Le filtrage se fait dans le navigateur : `sante` → `role === 'sante'` ; `coursier` ou `menage` → `role === 'particulier'` et service coché ; commune si choisie.
3. Changer un filtre ne relance aucune requête.

Ce que la recherche ne fait pas : elle ne tient pas compte de `actif`, n'exige pas qu'un intervenant ait un service ou une disponibilité, ne filtre pas par jour ou créneau et ne trie pas par disponibilité. Le filtre par jour existe seulement dans l'assistant (case « disponible ce jour-là » de [AssistantBesoin.vue](../frontend/src/pages/AssistantBesoin.vue)).

## 6. Création d'une demande

```
ProviderCard (« Envoyer une demande ») → /nouvelle-demande/:aidantId
NouvelleDemande.vue → onMounted
      → findById(aidantId)                   → profiles
      → getDemandesByDemandeur(user.id)      → demandes (détection d'un doublon)
formulaire → handleSubmit() → addDemande(payload)  [store.js]
      → supabase.from('demandes').insert(...)      (règle demandes_insert_demandeur)
      → statut 'en_attente' (valeur par défaut de la base)
      → envoyee = true → écran de confirmation
```

1. Le bouton n'apparaît que pour une personne âgée.
2. La page calcule `acces`. Si une demande `en_attente` ou `acceptee` existe déjà vers cet intervenant, l'envoi est bloqué (`deja-envoyee`).
3. Le formulaire propose : le service (si l'intervenant en a plusieurs), l'urgence, un créneau parmi les disponibilités de l'intervenant, un message (saisi ou dicté).
4. `envoiEnCours` empêche un double envoi par double clic.

Non vérifié par le code : que le créneau n'est pas dans le passé (un créneau est un jour de semaine, sans date), ni que le service demandé est bien proposé par l'intervenant côté base.

## 7. Acceptation et mise en relation

```
MesDemandes.vue (intervenant, « Accepter ») → accepter(demande)
      → updateDemandeStatut(id, 'acceptee')  [store.js, ligne 307]
            → codeArriveeAAttribuer(id)      → lit demandes.code_arrivee
            → genererCodeArrivee()           → 4 chiffres aléatoires
            → supabase.from('demandes').update({ statut, date_mise_a_jour, code_arrivee })
            → addMiseEnRelation(...)         → supabase.from('mises_en_relation').insert(...)
      → charger() → la liste se rafraîchit
```

1. L'intervenant voit les demandes reçues (`getDemandesByAidant`).
2. Au clic, trois écritures se suivent : lecture du code existant, mise à jour de la demande, création de la mission.
3. Le code d'arrivée apparaît chez les deux personnes, avec une consigne différente (attendre le code / annoncer le code).
4. Le badge affiche « Acceptée », puis « En cours » après 3 minutes (`missionDemarree`). C'est un simple délai d'affichage : en base, la mission est `en_cours` dès sa création.

**Fragilités à connaître**

- Les deux écritures ne sont pas une transaction. Si la création de la mission échoue, la demande reste `acceptee` sans mission.
- Si la colonne `code_arrivee` n'existe pas dans la base en ligne, `codeArriveeAAttribuer` l'ignore volontairement : l'acceptation fonctionne, sans code.
- Aucun contrôle n'empêche un intervenant d'accepter deux demandes sur le même créneau.

**Refus et annulation** : même chemin, `updateDemandeStatut(id, 'refusee')` ou `'annulee'`, sans création de mission.

## 8. Fin de mission et historique

```
MesAccompagnements.vue (« Terminer ») → terminer(mission)
      → updateMiseEnRelationStatut(id, 'terminee')  → mises_en_relation (statut + date_fin)
      → updateDemandeStatut(demandeId, 'terminee')  → demandes
      → charger()
Historique.vue → getDemandesByDemandeur / getDemandesByAidant → filtre 'terminee' | 'annulee'
« Refaire cette demande » → refaire(demande) → /nouvelle-demande/:aidantId?typeService=…&urgence=…&message=…
```

La mission et la demande ont chacune leur statut ; la page met à jour les deux pour qu'ils restent cohérents.

## 9. Création d'un compte par l'administrateur (flux avec backend)

```
AdminComptes.vue (« Nouveau compte » → formulaire) → valider()
      → dashboard.creerCompte(payload)          [stores/adminDashboard.js]
      → createCompteAdmin(payload)              [store.js, ligne 166]
            → fetch POST /api/admin/comptes  + Authorization: Bearer <jeton>
                  → verifierAdmin               [backend/index.js, ligne 31]
                  → supabaseAdmin.auth.admin.createUser()   → auth.users
                  → supabaseAdmin.from('profiles').insert() → profiles
                  ← 201 + profil
      → utilisateurs mis à jour dans le store → la liste et les compteurs changent
      → demanderReinitialisationMotDePasse(email) → e-mail à la personne
```

**Suppression** : `supprimer(u)` → `dashboard.supprimerCompte` → `deleteCompteAdmin` → `DELETE /api/admin/comptes/:id` → `auth.admin.deleteUser`. Le profil et ses demandes, missions et avis disparaissent par cascade.

**Modification** : pas de backend. `dashboard.modifierCompte` → `updateCompteAdmin` → `profiles.update` directement, autorisé par la règle `profiles_update_admin`.

## 10. Gestion des adhérents (flux avec backend)

```
AdminAdherents.vue → enregistrer()
      → store.creerAdherent(formulaire)         [stores/adherents.js]
            → fetch POST /api/adherents
                  → validerAdherent()           [backend/index.js]
                  → ajouterAdherent()           [backend/adherentsStore.js] → adherents.json
                  → synchroniserAdherent()      [backend/supabaseSync.js]   → table adherents
                  ← 201 + adhérent
      → adherents.value.push(...) → le tableau se met à jour → notifier('Adhérent ajouté…')
```

Ici la correspondance avec un découpage classique est : route + controller = la fonction dans `index.js` ; service = `adherentsStore.js` et `supabaseSync.js`.

## 12. Message de contact

```
SosButton.vue (« Un problème avec le site ») → envoyerMessage()
      → addMessageContact({ userId, nom, message })   [store.js]
      → supabase.from('messages_contact').insert(...)  (règle messages_contact_insert_anyone)
      → envoye = true
(côté Supabase, hors dépôt) Database Webhook → fonction Edge notify-contact-message → e-mail à l'admin
(côté admin) AdminMessages.vue / AdminDashboard.vue → marquerLu(), supprimer()
```

Fonctionne sans compte : `nom` vaut alors « Visiteur non connecté ».

## 13. Avis

```
PourQui.vue → onMounted → getAvis() → avis (lecture publique)
(connecté) → handleAjouterAvis() → addAvis({ userId, nom, texte }) → avis.insert → getAvis() à nouveau
(auteur ou admin) → handleSupprimerAvis(id) → deleteAvis(id)
```

Un avis porte sur le dispositif. Il n'est lié ni à un intervenant ni à une mission, et n'a pas de note.

## 14. Choix d'une formule

```
FormulesSection (« Choisir … ») → /formule/:formuleId
PaiementFormule.vue → handleConfirmer()
      → carteValide()   (contrôle local, uniquement si la formule est payante)
      → updateProfile({ abonnement: { formuleId, dateDebut } }) → profiles.update
      → confirmee = true
```

Aucun prestataire de paiement n'est appelé. Les limites annoncées par les formules (« 3 mises en relation », « 2 demandes actives ») ne sont appliquées nulle part dans le code.

## 15. Notifications

**Cette fonctionnalité n'existe pas dans le code.** Il n'y a ni table, ni envoi, ni affichage de notification pour les utilisateurs. Un commentaire de [MonCompte.vue](../frontend/src/pages/MonCompte.vue) le confirme. Un utilisateur découvre une nouvelle demande ou une réponse en ouvrant « Mes demandes ». Le seul envoi automatique est l'e-mail à l'administrateur du flux 12.

## À retenir

- Pour presque tout, le chemin est : page → fonction de `store.js` ou `auth.js` → Supabase → mise à jour d'un `ref`.
- Le backend Express sert d’intermédiaire pour toutes les données : connexion, profils, demandes, adhérents et comptes admin.
- L'acceptation d'une demande déclenche trois écritures non groupées ; c'est le flux le plus fragile.
- La recherche charge tous les profils puis filtre dans le navigateur.
- Il n'y a pas de notifications ni de paiement réel.
