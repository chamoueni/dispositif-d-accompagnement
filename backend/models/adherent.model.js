// Modèle « adhérent » : requêtes SQL sur la table « adherents », dans la même
// base que les profils, demandes et missions.
//
// Ces fonctions ne sont appelées que par les routes /api/adherents, réservées
// à l'administrateur (middleware verifierAdmin, voir routes/adherents.routes.js).
import { requete, requeteUne } from '../db.js'

// Copie les champs modifiables saisis dans le formulaire admin, nettoyés.
// L'email est mis en minuscules : l'index unique sur l'email compare alors des
// valeurs homogènes.
function champsAdherent(donnees) {
  return [
    donnees.nom.trim(),
    donnees.email.trim().toLowerCase(),
    (donnees.telephone || '').trim(),
    (donnees.ville || '').trim(),
    donnees.role || 'particulier',
    donnees.statut || 'actif',
  ]
}

// Liste des adhérents, du plus ancien au plus récent.
export function obtenirAdherents() {
  return requete('select * from adherents order by created_at asc')
}

// Ajoute un adhérent ; la base crée son identifiant (UUID) et ses dates.
export function ajouterAdherent(donnees) {
  return requeteUne(
    `insert into adherents (nom, email, telephone, ville, role, statut)
     values ($1, $2, $3, $4, $5, $6)
     returning *`,
    champsAdherent(donnees),
  )
}

// Modifie un adhérent. Renvoie null si aucun adhérent ne porte cet id
// (=> 404 dans le contrôleur) ; « id » et « created_at » ne changent jamais.
export function modifierAdherent(id, donnees) {
  return requeteUne(
    `update adherents
     set nom = $2, email = $3, telephone = $4, ville = $5, role = $6, statut = $7,
         updated_at = now()
     where id = $1
     returning *`,
    [id, ...champsAdherent(donnees)],
  )
}

// Supprime un adhérent. Renvoie false si aucun adhérent ne portait cet id.
export async function supprimerAdherent(id) {
  const lignes = await requete('delete from adherents where id = $1 returning id', [id])
  return lignes.length === 1
}
