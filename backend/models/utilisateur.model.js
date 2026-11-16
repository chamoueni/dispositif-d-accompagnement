// Modèle « utilisateur » : requêtes SQL sur les tables « utilisateurs » (les
// comptes : email + mot de passe haché) et « jetons_reinitialisation » (liens
// « Mot de passe oublié »).
//
// Le mot de passe en clair n'arrive JAMAIS ici : le contrôleur le hache avec
// bcrypt avant (voir services/motDePasse.service.js).
import { requete, requeteUne } from '../db.js'

// Colonnes renvoyées au reste du serveur : jamais l'empreinte du mot de passe,
// sauf pour la connexion (trouverPourConnexion).
const COLONNES_PUBLIQUES = 'id, email, est_admin, version_jeton, created_at'

export function trouverUtilisateur(id, executant) {
  return requeteUne(`select ${COLONNES_PUBLIQUES} from utilisateurs where id = $1`, [id], executant)
}

export function trouverParEmail(email, executant) {
  return requeteUne(`select ${COLONNES_PUBLIQUES} from utilisateurs where email = $1`, [email], executant)
}

// Seule fonction qui renvoie l'empreinte : la connexion doit la comparer.
export function trouverPourConnexion(email) {
  return requeteUne(
    `select ${COLONNES_PUBLIQUES}, mot_de_passe_hash from utilisateurs where email = $1`,
    [email],
  )
}

// Crée un compte. Si l'email existe déjà, PostgreSQL lève l'erreur 23505
// (valeur en double), traitée par le contrôleur (réponse 409).
export function creerUtilisateur(email, motDePasseHash, executant) {
  return requeteUne(
    `insert into utilisateurs (email, mot_de_passe_hash)
     values ($1, $2)
     returning ${COLONNES_PUBLIQUES}`,
    [email, motDePasseHash],
    executant,
  )
}

// Nouveau mot de passe. version_jeton + 1 : tous les jetons de connexion
// déjà émis pour ce compte cessent d'être valables (autres appareils déconnectés).
export function changerMotDePasse(id, motDePasseHash, executant) {
  return requeteUne(
    `update utilisateurs
     set mot_de_passe_hash = $2, version_jeton = version_jeton + 1
     where id = $1
     returning ${COLONNES_PUBLIQUES}`,
    [id, motDePasseHash],
    executant,
  )
}

// Supprime un compte ; son profil, ses demandes, missions et avis partent avec
// (on delete cascade dans sql/schema.sql). Renvoie true si un compte a été supprimé.
export async function supprimerUtilisateur(id) {
  const lignes = await requete('delete from utilisateurs where id = $1 returning id', [id])
  return lignes.length === 1
}

// --- Liens « Mot de passe oublié » ------------------------------------------

export function creerJetonReinitialisation(utilisateurId, jetonHash, expireLe) {
  return requeteUne(
    `insert into jetons_reinitialisation (utilisateur_id, jeton_hash, expire_le)
     values ($1, $2, $3)
     returning id`,
    [utilisateurId, jetonHash, expireLe],
  )
}

// Jeton encore valable : pas expiré et jamais utilisé. Sinon null.
// « for update » (dans une transaction) bloque la ligne : deux clics en même
// temps sur le même lien ne peuvent pas l'utiliser deux fois.
export function trouverJetonValide(jetonHash, executant, { verrouiller = false } = {}) {
  return requeteUne(
    `select id, utilisateur_id from jetons_reinitialisation
     where jeton_hash = $1 and utilise_le is null and expire_le > now()
     ${verrouiller ? 'for update' : ''}`,
    [jetonHash],
    executant,
  )
}

// Marque TOUS les liens encore valables du compte comme utilisés : après un
// changement de mot de passe, aucun ancien lien ne doit pouvoir resservir.
export function invaliderJetons(utilisateurId, executant) {
  return requete(
    `update jetons_reinitialisation set utilise_le = now()
     where utilisateur_id = $1 and utilise_le is null`,
    [utilisateurId],
    executant,
  )
}

// Ménage : supprime les liens expirés depuis plus d'un jour.
export function supprimerJetonsExpires() {
  return requete("delete from jetons_reinitialisation where expire_le < now() - interval '1 day'")
}
