// Règle commune des mots de passe, partagée par l'inscription, le profil et la
// réinitialisation. Le serveur applique la même longueur minimale
// (MOT_DE_PASSE_MIN dans backend/controllers/auth.controller.js) : la vérification du navigateur
// n'est qu'un confort, c'est le serveur qui fait foi.
export const MOT_DE_PASSE_MIN = 8

// Évalue la force d'un mot de passe pour la jauge (JaugeMotDePasse.vue).
// Renvoie le niveau ('faible' | 'moyen' | 'bon' | 'solide') et la liste de ce
// qui manque, sous forme de clés de traduction (mot_de_passe.manque_*).
export function evaluerMotDePasse(mdp) {
  const valeur = mdp || ''
  const criteres = {
    longueur: valeur.length >= MOT_DE_PASSE_MIN,
    chiffre: /[0-9]/.test(valeur),
    majuscule: /[A-Z]/.test(valeur),
    special: /[^A-Za-z0-9]/.test(valeur),
  }
  let points = Object.values(criteres).filter(Boolean).length
  if (valeur.length >= 12) points += 1
  // Trop court = toujours "faible", même avec chiffres et majuscules.
  const niveau = !criteres.longueur || points <= 2 ? 'faible' : points === 3 ? 'moyen' : points === 4 ? 'bon' : 'solide'
  const manques = ['longueur', 'chiffre', 'majuscule'].filter((c) => !criteres[c])
  return { niveau, manques }
}
