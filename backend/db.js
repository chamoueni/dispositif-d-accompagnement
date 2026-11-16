// Connexion à la base PostgreSQL (alwaysdata) avec le paquet « pg ».
//
// Un « pool » garde quelques connexions ouvertes et les prête à chaque requête :
// beaucoup plus rapide que d'ouvrir une connexion à chaque appel.
//
// RÈGLE DE SÉCURITÉ : toujours passer les valeurs dans le tableau « params »,
// jamais en les collant dans le texte SQL. PostgreSQL reçoit alors la requête
// ($1, $2…) et les valeurs SÉPARÉMENT : une valeur comme « ' OR 1=1 -- » reste
// du simple texte, l'injection SQL est impossible.
//   Bien : requete('select * from profiles where id = $1', [id])
//   Mal  : requete(`select * from profiles where id = '${id}'`)
import './config/env.js'
import pg from 'pg'

const { Pool } = pg

// DATABASE_URL ressemble à :
// postgresql://utilisateur:motdepasse@postgresql-moustakim.alwaysdata.net:5432/nom_base
// DATABASE_SSL=true seulement si l'hébergeur de la base exige une connexion chiffrée.
export const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
      // L'offre gratuite alwaysdata limite la mémoire : 5 connexions suffisent largement.
      max: 5,
      // Une connexion inutilisée depuis 30 s est fermée par le serveur Node
      // lui-même. Sans ça, le réseau (box, opérateur…) peut la couper en
      // silence après quelques minutes d'inactivité, et la requête suivante
      // échoue (ETIMEDOUT, « Connection terminated unexpectedly »).
      idleTimeoutMillis: 30000,
      // Petits signaux réguliers qui gardent la connexion ouverte pendant une requête longue.
      keepAlive: true,
      // Abandonne au bout de 10 s si la base ne répond pas (au lieu d'attendre indéfiniment).
      connectionTimeoutMillis: 10000,
    })
  : null

// Erreur d'une connexion inactive (base redémarrée…) : on la note sans faire
// tomber le serveur, le pool en ouvrira une nouvelle.
pool?.on('error', (error) => console.error('Base de données :', error.message))

export function baseConfiguree() {
  return pool !== null
}

function verifierPool() {
  if (!pool) throw new Error('DATABASE_URL manquante : la base de données n’est pas configurée.')
}

// Exécute une requête et renvoie les lignes trouvées (tableau, éventuellement vide).
// « executant » permet de rejouer la requête dans une transaction (voir plus bas).
export async function requete(sql, params = [], executant = pool) {
  verifierPool()
  const resultat = await executant.query(sql, params)
  return resultat.rows
}

// Comme requete(), mais renvoie seulement la première ligne, ou null.
export async function requeteUne(sql, params = [], executant = pool) {
  const lignes = await requete(sql, params, executant)
  return lignes[0] ?? null
}

// Transaction : plusieurs requêtes qui réussissent TOUTES ou échouent TOUTES.
// Exemple : créer un compte puis son profil ; si le profil échoue, le compte
// n'est pas gardé. fn reçoit la connexion à utiliser pour chaque requête.
export async function transaction(fn, { admin = false } = {}) {
  verifierPool()
  const client = await pool.connect()
  try {
    await client.query('begin')
    // Annonce au déclencheur proteger_verifie (voir sql/schema.sql) que cette
    // transaction agit pour l'administrateur. « true » = valable uniquement
    // jusqu'à la fin de cette transaction, jamais pour la requête suivante.
    if (admin) await client.query("select set_config('app.admin', 'on', true)")
    const resultat = await fn(client)
    await client.query('commit')
    return resultat
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    // Rend la connexion au pool, même en cas d'erreur.
    client.release()
  }
}

// Raccourci : transaction faite au nom de l'administrateur.
export function transactionAdmin(fn) {
  return transaction(fn, { admin: true })
}
