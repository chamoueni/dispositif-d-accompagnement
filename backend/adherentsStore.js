// Stockage des adhérents : base NoSQL MongoDB (documents) si MONGODB_URI est
// renseignée, sinon fichier JSON local (backend/data/adherents.json).
//
// Pourquoi MongoDB : sur Render, le disque est effacé à chaque redéploiement,
// donc les adhérents écrits dans le fichier JSON disparaissaient. Une base
// externe (ex. MongoDB Atlas, offre gratuite) les conserve. Chaque adhérent est
// un document indépendant, sans schéma imposé, dans la collection "adherents".
//
// Les deux modes exposent exactement les mêmes fonctions (obtenir, ajouter,
// modifier, supprimer) : backend/index.js ne sait pas lequel est utilisé.
import crypto from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { MongoClient } from 'mongodb'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fichierAdherents = path.join(__dirname, 'data', 'adherents.json')

// Copie les champs modifiables saisis dans le formulaire admin, nettoyés.
// Partagé par les deux modes pour garantir des documents identiques.
function champsAdherent(donnees) {
  return {
    nom: donnees.nom.trim(),
    email: donnees.email.trim().toLowerCase(),
    telephone: (donnees.telephone || '').trim(),
    ville: (donnees.ville || '').trim(),
    role: donnees.role || 'particulier',
    statut: donnees.statut || 'actif',
  }
}

// ---------------------------------------------------------------------------
// Mode fichier JSON (développement local, ou si MongoDB n'est pas configuré)
// ---------------------------------------------------------------------------

async function lireFichier() {
  const contenu = await fs.readFile(fichierAdherents, 'utf8')
  return JSON.parse(contenu)
}

async function ecrireFichier(adherents) {
  await fs.writeFile(fichierAdherents, `${JSON.stringify(adherents, null, 2)}\n`, 'utf8')
}

// ---------------------------------------------------------------------------
// Mode MongoDB (NoSQL)
// ---------------------------------------------------------------------------

// Le champ technique "_id" de MongoDB n'est jamais renvoyé au front : on garde
// notre propre identifiant "id" (UUID), déjà utilisé dans les URL /api/adherents/:id.
const SANS_ID_MONGO = { projection: { _id: 0 } }

// Promesse de connexion partagée : une seule connexion pour tout le serveur,
// ouverte au premier appel (et non au démarrage, pour que dotenv ait déjà
// chargé le .env, voir backend/supabaseAdmin.js).
let collectionPromise = null

function collectionMongo() {
  if (!process.env.MONGODB_URI) return null
  if (!collectionPromise) {
    collectionPromise = (async () => {
      const client = new MongoClient(process.env.MONGODB_URI)
      await client.connect()
      const collection = client.db(process.env.MONGODB_DB || 'dispositif').collection('adherents')
      // Index unique : deux documents ne peuvent pas partager le même "id".
      await collection.createIndex({ id: 1 }, { unique: true })

      // Premier lancement sur une base vide : on y importe les adhérents du
      // fichier JSON pour ne rien perdre lors du passage à MongoDB.
      if ((await collection.countDocuments()) === 0) {
        const existants = await lireFichier().catch(() => [])
        if (existants.length) await collection.insertMany(existants)
      }
      return collection
    })().catch((error) => {
      // Connexion ratée : on oublie la promesse pour réessayer au prochain appel.
      collectionPromise = null
      throw error
    })
  }
  return collectionPromise
}

// ---------------------------------------------------------------------------
// Fonctions utilisées par backend/index.js
// ---------------------------------------------------------------------------

export async function obtenirAdherents() {
  const collection = await collectionMongo()
  if (collection) {
    return collection.find({}, SANS_ID_MONGO).sort({ created_at: 1 }).toArray()
  }
  return lireFichier()
}

export async function ajouterAdherent(donnees) {
  const adherent = {
    id: crypto.randomUUID(),
    ...champsAdherent(donnees),
    created_at: new Date().toISOString(),
  }

  const collection = await collectionMongo()
  if (collection) {
    // insertOne ajoute "_id" à l'objet passé : on insère une copie pour
    // renvoyer au front un adhérent sans ce champ technique.
    await collection.insertOne({ ...adherent })
    return adherent
  }

  const adherents = await lireFichier()
  adherents.push(adherent)
  await ecrireFichier(adherents)
  return adherent
}

export async function modifierAdherent(id, donnees) {
  const modifications = { ...champsAdherent(donnees), updated_at: new Date().toISOString() }

  const collection = await collectionMongo()
  if (collection) {
    // $set ne remplace que ces champs : "id" et "created_at" sont conservés.
    // Renvoie null si aucun document ne porte cet id (=> 404 dans index.js).
    return collection.findOneAndUpdate(
      { id },
      { $set: modifications },
      { returnDocument: 'after', ...SANS_ID_MONGO },
    )
  }

  const adherents = await lireFichier()
  const index = adherents.findIndex((adherent) => adherent.id === id)
  if (index === -1) return null
  adherents[index] = { ...adherents[index], ...modifications }
  await ecrireFichier(adherents)
  return adherents[index]
}

export async function supprimerAdherent(id) {
  const collection = await collectionMongo()
  if (collection) {
    const { deletedCount } = await collection.deleteOne({ id })
    return deletedCount === 1
  }

  const adherents = await lireFichier()
  const restants = adherents.filter((adherent) => adherent.id !== id)
  if (restants.length === adherents.length) return false
  await ecrireFichier(restants)
  return true
}
