// Hachage des mots de passe avec bcrypt (paquet « bcryptjs » : même
// algorithme que « bcrypt », écrit en JavaScript pur, donc rien à compiler sur
// le serveur alwaysdata).
//
// Hacher ≠ chiffrer : on ne peut pas retrouver le mot de passe à partir de son
// empreinte. Pour vérifier une connexion, bcrypt hache le mot de passe saisi et
// compare les deux empreintes. Bcrypt est volontairement lent (« coût » 10 =
// 2^10 tours) et ajoute un sel aléatoire : deux personnes avec le même mot de
// passe n'ont pas la même empreinte, et tester des millions de mots de passe
// prendrait des années.
//
// Les comptes venant de Supabase gardent leur empreinte (« $2a$10$… ») : c'est
// aussi du bcrypt, donc leur mot de passe actuel continue de marcher.
import bcrypt from 'bcryptjs'
import { MOT_DE_PASSE_MIN } from '../config/constantes.js'

const COUT = 10

// Empreinte d'un mot de passe impossible, utilisée quand l'email n'existe pas :
// la connexion prend alors le même temps qu'avec un vrai compte, ce qui
// empêche de deviner quels emails sont inscrits en mesurant le temps de réponse.
const EMPREINTE_FACTICE = bcrypt.hashSync('compte-inexistant-' + Math.random(), COUT)

export const MESSAGE_MOT_DE_PASSE = `Le mot de passe doit contenir au moins ${MOT_DE_PASSE_MIN} caractères.`

// Longueur minimale côté serveur (c'est elle qui fait foi), et maximale :
// bcrypt ne tient compte que des 72 premiers octets.
export function motDePasseValide(motDePasse) {
  return typeof motDePasse === 'string' &&
    motDePasse.length >= MOT_DE_PASSE_MIN &&
    Buffer.byteLength(motDePasse) <= 72
}

export function hacherMotDePasse(motDePasse) {
  return bcrypt.hash(motDePasse, COUT)
}

// true si le mot de passe correspond à l'empreinte. empreinte absente
// (compte inexistant) => comparaison factice, puis false.
export async function verifierMotDePasse(motDePasse, empreinte) {
  if (!empreinte) {
    await bcrypt.compare(motDePasse, EMPREINTE_FACTICE)
    return false
  }
  return bcrypt.compare(motDePasse, empreinte)
}
