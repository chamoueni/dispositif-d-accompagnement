// Middlewares de connexion et de rôle.
//
// - sessionMiddleware : lit le jeton JWT (cookie, ou en-tête Authorization pour
//   Postman), vérifie sa signature, puis relit le compte dans la base. Si tout
//   est bon, il place dans la requête :
//     req.utilisateur = { id, email, estAdmin, role }
//   role vaut 'senior', 'sante', 'particulier', ou 'admin' pour l'administrateur.
//   Sinon, la requête continue « en visiteur » (req.utilisateur absent).
// - requireAuth : refuse (401) si personne n'est connecté.
// - exigerRole('sante', 'particulier'…) : refuse (403) si le rôle ne convient pas.
import { requeteUne } from '../db.js'
import { NOM_COOKIE, effacerCookie, lireJeton } from '../services/jeton.service.js'

// Jeton envoyé par le navigateur (cookie) ou par un outil comme Postman (en-tête).
function jetonRecu(req) {
  const enTete = req.get('authorization') || ''
  if (enTete.startsWith('Bearer ')) return enTete.slice(7).trim()
  return req.cookies?.[NOM_COOKIE] || null
}

export async function sessionMiddleware(req, res, next) {
  const jeton = jetonRecu(req)
  if (!jeton) return next()

  // 1. Signature et date d'expiration.
  const contenu = lireJeton(jeton)
  if (!contenu) {
    effacerCookie(res)
    return next()
  }

  try {
    // 2. Le compte existe-t-il toujours, et le jeton est-il de la bonne
    //    « version » ? (Un changement de mot de passe augmente version_jeton :
    //    les jetons émis avant sont alors refusés.) Le rôle est relu dans la
    //    base à chaque requête, il n'est pas stocké dans le jeton : un rôle
    //    modifié par l'administrateur s'applique tout de suite.
    const compte = await requeteUne(
      `select u.id, u.email, u.est_admin, u.version_jeton, p.role
       from utilisateurs u
       left join profiles p on p.id = u.id
       where u.id = $1`,
      [contenu.sub],
    )
    if (!compte || compte.version_jeton !== contenu.v) {
      effacerCookie(res)
      return next()
    }

    req.utilisateur = {
      id: compte.id,
      email: compte.email,
      estAdmin: compte.est_admin,
      role: compte.est_admin ? 'admin' : compte.role,
      // Gardé pour reposer un cookie de même durée (changement de mot de passe).
      souvenir: contenu.souvenir === true,
      versionJeton: compte.version_jeton,
    }
    next()
  } catch (error) {
    next(error)
  }
}

export function requireAuth(req, res, next) {
  if (!req.utilisateur) return res.status(401).json({ message: 'Authentification requise.' })
  next()
}

// Usage dans une route : router.post('/...', exigerRole('senior'), controleur)
// L'administrateur a toujours accès.
export function exigerRole(...roles) {
  return (req, res, next) => {
    if (!req.utilisateur) return res.status(401).json({ message: 'Authentification requise.' })
    if (req.utilisateur.role !== 'admin' && !roles.includes(req.utilisateur.role)) {
      return res.status(403).json({ message: 'Votre profil ne permet pas cette action.' })
    }
    next()
  }
}
