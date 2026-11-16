// Modèle « message » : requêtes SQL sur la table « messages_contact »
// (bouton SOS › « Un problème avec le site »).
//
// N'importe qui peut écrire un message, même sans compte ; seul
// l'administrateur peut les lire, les marquer lus et les supprimer (contrôle
// isAdmin dans le contrôleur).
import { requete, requeteUne } from '../db.js'

// Tous les messages, du plus récent au plus ancien.
export function listerMessages() {
  return requete('select * from messages_contact order by created_at desc')
}

// Enregistre un message (userId null si le visiteur n'est pas connecté).
export function creerMessage({ userId, nom, message }) {
  return requeteUne(
    'insert into messages_contact (user_id, nom, message) values ($1, $2, $3) returning id',
    [userId, nom, message],
  )
}

// Marque un message comme lu. Renvoie true si le message existait.
export async function marquerLu(id) {
  const lignes = await requete('update messages_contact set lu = true where id = $1 returning id', [id])
  return lignes.length > 0
}

// Supprime un message. Renvoie true si une ligne a bien été supprimée.
export async function supprimerMessage(id) {
  const lignes = await requete('delete from messages_contact where id = $1 returning id', [id])
  return lignes.length > 0
}
