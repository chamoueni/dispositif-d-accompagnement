// Modèle « avis » : requêtes SQL sur la table « avis » (témoignages affichés
// sur la page « Pour qui »).
//
// Tout le monde peut lire les avis ; le contrôleur vérifie qu'un avis est
// écrit au nom de l'utilisateur connecté, et que seul son auteur (ou
// l'administrateur) peut le supprimer.
import { requete, requeteUne } from '../db.js'

// Tous les avis, du plus récent au plus ancien.
export function listerAvis() {
  return requete('select * from avis order by created_at desc')
}

// Un avis par son identifiant, ou null.
export function trouverAvis(id) {
  return requeteUne('select * from avis where id = $1', [id])
}

// Enregistre un avis et le renvoie tel que la base l'a créé.
export function creerAvis({ userId, nom, texte }) {
  return requeteUne(
    'insert into avis (user_id, nom, texte) values ($1, $2, $3) returning *',
    [userId, nom, texte],
  )
}

// Supprime un avis. Renvoie true si une ligne a bien été supprimée.
export async function supprimerAvis(id) {
  const lignes = await requete('delete from avis where id = $1 returning id', [id])
  return lignes.length > 0
}
