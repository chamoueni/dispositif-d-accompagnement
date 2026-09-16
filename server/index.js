// API REST Express de gestion des adhérents + assistant IA du bouton SOS.
import express from 'express'
import cors from 'cors'
import Anthropic from '@anthropic-ai/sdk'
import {
  ajouterAdherent,
  modifierAdherent,
  obtenirAdherents,
  supprimerAdherent,
} from './adherentsStore.js'
import { synchroniserAdherent } from './supabaseSync.js'

const app = express()
const port = Number(process.env.PORT) || 3001
const rolesAutorises = ['senior', 'sante', 'particulier']
const statutsAutorises = ['actif', 'inactif']

app.use(cors())
app.use(express.json())

// Client Anthropic : lit ANTHROPIC_API_KEY dans l'environnement (jamais côté
// client/VITE_, voir .env.example). N'est instancié que si la clé est présente,
// pour que le reste du serveur (API adhérents) fonctionne même sans elle.
const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null

// Contexte injecté dans chaque appel pour que l'assistant reste factuel sur ce
// que propose réellement le site (pas d'invention de fonctionnalités).
const CONTEXTE_SITE = `Tu es l'assistant du site "Dispositif d'accompagnement", qui met en
relation des personnes âgées de Mayotte avec du personnel de santé et des particuliers
de confiance.

Services proposés : soins à domicile, courses, ménage, service de garde, suivi psychologique.
Trois profils : personnes âgées (demandeuses d'aide), personnel de santé (infirmiers, aides-
soignants, kinés), particuliers (coursiers, ménage).
Zones géographiques à Mayotte : Nord, Centre, Sud, Petite-Terre (regroupant les communes de
l'île) ; la recherche se fait par commune. Délai moyen de première réponse : environ 12 minutes.
Formules d'accompagnement : Basique (gratuite, 3 mises en relation offertes à l'essai),
Essentiel (25€/mois), Confort (39€/mois, la plus choisie), Premium (101€/mois).
La mise en relation de base reste gratuite ; les formules payantes ajoutent un accompagnement
mensuel plus soutenu.
En cas d'urgence médicale réelle, oriente toujours vers le 112.

Réponds en français, en 2 à 4 phrases maximum, de façon chaleureuse et concrète. N'invente
aucune fonctionnalité, prix ou zone qui ne figure pas ci-dessus ; si tu ne sais pas, dis-le et
propose le bouton "Un problème avec le site" du menu SOS pour contacter un humain.`

function validerAdherent(body) {
  if (!body.nom?.trim()) return 'Le nom est obligatoire.'
  if (!body.email?.trim() || !body.email.includes('@')) return 'Un email valide est obligatoire.'
  if (!rolesAutorises.includes(body.role || 'particulier')) return 'Le rôle est invalide.'
  if (!statutsAutorises.includes(body.statut || 'actif')) return 'Le statut est invalide.'
  return null
}

app.get('/api/adherents', async (_req, res, next) => {
  try {
    res.json(await obtenirAdherents())
  } catch (error) {
    next(error)
  }
})

app.post('/api/adherents', async (req, res, next) => {
  try {
    const erreur = validerAdherent(req.body)
    if (erreur) return res.status(400).json({ message: erreur })
    const adherent = await ajouterAdherent(req.body)
    await synchroniserAdherent(adherent, 'ajouter')
    return res.status(201).json(adherent)
  } catch (error) {
    next(error)
  }
})

app.put('/api/adherents/:id', async (req, res, next) => {
  try {
    const erreur = validerAdherent(req.body)
    if (erreur) return res.status(400).json({ message: erreur })
    const adherent = await modifierAdherent(req.params.id, req.body)
    if (!adherent) return res.status(404).json({ message: 'Adhérent introuvable.' })
    await synchroniserAdherent(adherent, 'modifier')
    return res.json(adherent)
  } catch (error) {
    next(error)
  }
})

app.delete('/api/adherents/:id', async (req, res, next) => {
  try {
    const adherents = await obtenirAdherents()
    const adherent = adherents.find((item) => item.id === req.params.id)
    if (!adherent || !(await supprimerAdherent(req.params.id))) {
      return res.status(404).json({ message: 'Adhérent introuvable.' })
    }
    await synchroniserAdherent(adherent, 'supprimer')
    return res.status(204).end()
  } catch (error) {
    next(error)
  }
})

app.post('/api/chat-ia', async (req, res, next) => {
  try {
    if (!anthropic) {
      return res.status(503).json({ message: 'Assistant IA non configuré (clé API absente).' })
    }

    const { message, historique } = req.body
    if (!message?.trim()) return res.status(400).json({ message: 'Message vide.' })

    // Historique limité côté client (10 derniers messages) pour garder le
    // contexte des questions de suivi sans faire grossir la requête.
    const messages = [
      ...(Array.isArray(historique) ? historique : [])
        .filter((m) => m?.texte?.trim())
        .map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.texte,
        })),
      { role: 'user', content: message },
    ]

    const reponse = await anthropic.messages.create({
      model: 'claude-opus-5',
      max_tokens: 400,
      system: CONTEXTE_SITE,
      messages,
    })

    const bloc = reponse.content.find((b) => b.type === 'text')
    res.json({ reponse: bloc?.text ?? '' })
  } catch (error) {
    next(error)
  }
})

app.use((error, _req, res, _next) => {
  void _next
  console.error('API adhérents :', error)
  res.status(500).json({ message: 'Une erreur serveur est survenue.' })
})

app.listen(port, () => {
  console.log(`API adhérents disponible sur http://localhost:${port}`)
})
