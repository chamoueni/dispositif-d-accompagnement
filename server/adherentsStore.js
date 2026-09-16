// Stockage local des adhérents dans un fichier JSON.
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fichierAdherents = path.join(__dirname, 'data', 'adherents.json')

async function lireAdherents() {
  const contenu = await fs.readFile(fichierAdherents, 'utf8')
  return JSON.parse(contenu)
}

async function ecrireAdherents(adherents) {
  await fs.writeFile(fichierAdherents, `${JSON.stringify(adherents, null, 2)}\n`, 'utf8')
}

export async function obtenirAdherents() {
  return lireAdherents()
}

export async function ajouterAdherent(donnees) {
  const adherents = await lireAdherents()
  const adherent = {
    id: crypto.randomUUID(),
    nom: donnees.nom.trim(),
    email: donnees.email.trim().toLowerCase(),
    telephone: (donnees.telephone || '').trim(),
    ville: (donnees.ville || '').trim(),
    role: donnees.role || 'particulier',
    statut: donnees.statut || 'actif',
    created_at: new Date().toISOString(),
  }
  adherents.push(adherent)
  await ecrireAdherents(adherents)
  return adherent
}

export async function modifierAdherent(id, donnees) {
  const adherents = await lireAdherents()
  const index = adherents.findIndex((adherent) => adherent.id === id)
  if (index === -1) return null

  adherents[index] = {
    ...adherents[index],
    nom: donnees.nom.trim(),
    email: donnees.email.trim().toLowerCase(),
    telephone: (donnees.telephone || '').trim(),
    ville: (donnees.ville || '').trim(),
    role: donnees.role || 'particulier',
    statut: donnees.statut || 'actif',
    updated_at: new Date().toISOString(),
  }
  await ecrireAdherents(adherents)
  return adherents[index]
}

export async function supprimerAdherent(id) {
  const adherents = await lireAdherents()
  const restants = adherents.filter((adherent) => adherent.id !== id)
  if (restants.length === adherents.length) return false
  await ecrireAdherents(restants)
  return true
}
