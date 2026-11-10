// Connexion à MongoDB Atlas (base NoSQL des adhérents), si MONGODB_URI est
// renseignée. Sinon, models/adherent.model.js utilise le fichier JSON de secours.
//
// Pourquoi MongoDB : sur Render, le disque est effacé à chaque redéploiement,
// donc les adhérents écrits dans le fichier JSON disparaissaient. Une base
// externe (MongoDB Atlas, offre gratuite) les conserve.
import './env.js'
import dns from 'node:dns'
import { MongoClient } from 'mongodb'

// Les adresses Atlas « mongodb+srv:// » demandent une recherche DNS de type SRV.
// Sur certains PC Windows, Node interroge un DNS local (127.0.0.1, VPN...) qui
// refuse ce type de recherche : « querySrv ECONNREFUSED ». Dans ce cas
// seulement, on repasse par des DNS publics et on réessaie. Sans effet sur
// Render, où la recherche fonctionne du premier coup.
async function connecter(uri) {
  try {
    const client = new MongoClient(uri)
    await client.connect()
    return client
  } catch (error) {
    if (!/querySrv/.test(error.message)) throw error
    dns.setServers(['8.8.8.8', '1.1.1.1'])
    const client = new MongoClient(uri)
    await client.connect()
    return client
  }
}

// Promesse de connexion partagée : une seule connexion pour tout le serveur,
// ouverte au premier appel (et non au démarrage).
let collectionPromise = null

// Renvoie la collection « adherents », ou null si MongoDB n'est pas configuré.
// preparer(collection) est appelé une seule fois, juste après la connexion
// (index uniques, import initial : voir models/adherent.model.js).
export function collectionAdherents(preparer) {
  if (!process.env.MONGODB_URI) return null
  if (!collectionPromise) {
    collectionPromise = (async () => {
      const client = await connecter(process.env.MONGODB_URI)
      const collection = client.db(process.env.MONGODB_DB || 'dispositif').collection('adherents')
      await preparer(collection)
      return collection
    })().catch((error) => {
      // Connexion ratée : on oublie la promesse pour réessayer au prochain appel.
      collectionPromise = null
      throw error
    })
  }
  return collectionPromise
}
