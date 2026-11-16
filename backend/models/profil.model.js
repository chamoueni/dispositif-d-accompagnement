// Modèle « profil » : requêtes SQL sur la table « profiles ».
//
// Le modèle ne décide pas QUI a le droit de lire ou modifier : c'est le rôle
// du contrôleur (backend/controllers/data.controller.js) et des règles de
// confidentialité (services/confidentialite.service.js). Ici, seulement le SQL.
import { requete, requeteUne } from '../db.js'

// Colonnes qu'une création ou une modification peut remplir. Les noms de
// colonnes ne viennent JAMAIS du navigateur : seulement de cette liste.
const COLONNES = [
  'nom', 'telephone', 'ville', 'adresse', 'role', 'specialite', 'services',
  'bio', 'disponibilites', 'abonnement', 'actif', 'verifie',
]

// Colonnes jsonb : « pg » transforme un tableau JavaScript en tableau
// PostgreSQL (text[]), pas en JSON. On les convertit donc nous-mêmes en texte JSON.
const COLONNES_JSON = ['disponibilites', 'abonnement']

// Prépare les paires colonne / valeur à partir d'un objet de champs.
function preparer(champs) {
  const colonnes = Object.keys(champs).filter((cle) => COLONNES.includes(cle))
  const valeurs = colonnes.map((cle) =>
    COLONNES_JSON.includes(cle) && champs[cle] !== null ? JSON.stringify(champs[cle]) : champs[cle],
  )
  return { colonnes, valeurs }
}

// Tous les profils.
export function listerProfils() {
  return requete('select * from profiles order by created_at')
}

// Un profil par son identifiant, ou null s'il n'existe pas.
export function trouverProfil(id, executant) {
  return requeteUne('select * from profiles where id = $1', [id], executant)
}

// Crée le profil d'un compte (même id que dans « utilisateurs »).
export function creerProfil(id, champs, executant) {
  const { colonnes, valeurs } = preparer(champs)
  // $1 = id, puis $2, $3… pour chaque colonne.
  const marqueurs = colonnes.map((_, i) => `$${i + 2}`)
  return requeteUne(
    `insert into profiles (id, ${colonnes.join(', ')})
     values ($1, ${marqueurs.join(', ')})
     returning *`,
    [id, ...valeurs],
    executant,
  )
}

// Modifie les champs donnés d'un profil. Renvoie le profil modifié, ou null
// si aucun profil ne porte cet id.
export function modifierProfil(id, patch, executant) {
  const { colonnes, valeurs } = preparer(patch)
  if (colonnes.length === 0) return trouverProfil(id, executant)
  // Exemple produit : « nom = $2, ville = $3 ».
  const affectations = colonnes.map((colonne, i) => `${colonne} = $${i + 2}`)
  return requeteUne(
    `update profiles set ${affectations.join(', ')} where id = $1 returning *`,
    [id, ...valeurs],
    executant,
  )
}
