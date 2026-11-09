// Petits utilitaires d'affichage du nom d'un utilisateur, partagés par la barre
// de navigation (AppNav.vue) et la page Mon compte (MonCompte.vue).
//
// Le nom est saisi librement à l'inscription ("Mariama Ali", "Ali (démo)"...) :
// on ignore ce qui est entre parenthèses, qui n'est pas un vrai mot du nom.

function motsDuNom(nom) {
  return (nom || '')
    .replace(/\([^)]*\)/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

// Prénom seul : "Mariama Ali (démo)" -> "Mariama".
export function prenomDe(nom) {
  return motsDuNom(nom)[0] || (nom || '').trim()
}

// Forme courte pour un bouton étroit : "Mariama Ali (démo)" -> "Mariama A.".
// Avant, le dernier mot était pris tel quel, d'où "Mariama (." à l'écran.
export function nomCourt(nom) {
  const mots = motsDuNom(nom)
  if (!mots.length) return (nom || '').trim()
  if (mots.length === 1) return mots[0]
  return `${mots[0]} ${mots[mots.length - 1][0].toUpperCase()}.`
}
