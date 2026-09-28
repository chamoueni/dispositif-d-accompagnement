// API REST Express de gestion des adhérents + assistant IA du bouton SOS.
import crypto from 'node:crypto'
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
import { supabaseAdmin } from './supabaseAdmin.js'

const app = express()
const port = Number(process.env.PORT) || 3001
const rolesAutorises = ['senior', 'sante', 'particulier']
const statutsAutorises = ['actif', 'inactif']
// Même email en dur que côté client (voir ADMIN_EMAIL dans stores/auth.js) et
// que les policies RLS Supabase : pas de rôle "admin" séparé pour ce projet.
const ADMIN_EMAIL = 'moustakimsinina05@gmail.com'

app.use(cors())
app.use(express.json())

// Protège les routes /api/admin/* : le front envoie le token de session Supabase
// de l'utilisateur connecté (Authorization: Bearer <access_token>), qu'on
// vérifie ici avant d'autoriser une action qui utilise la clé service role
// (donc capable de contourner toute RLS) — sans ce contrôle, ces routes
// seraient utilisables par n'importe qui connaissant leur URL.
async function verifierAdmin(req, res, next) {
  if (!supabaseAdmin) {
    return res.status(503).json({ message: "Service d'administration non configuré côté serveur." })
  }
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ message: 'Authentification requise.' })

  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || data.user?.email !== ADMIN_EMAIL) {
    return res.status(403).json({ message: "Accès réservé à l'administrateur." })
  }
  next()
}

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

// Supprime un compte entièrement (auth.users + sa ligne "profiles", qui suit
// via "on delete cascade", voir supabase/schema.sql). Une simple suppression
// RLS de la ligne "profiles" ne suffirait pas : le compte Supabase Auth
// resterait, bloquant toute réinscription avec le même email ("User already
// registered") — c'est exactement le bug rencontré avec attoufams@gmail.com.
// auth.admin.deleteUser() n'est disponible qu'avec la clé service role, donc
// côté serveur uniquement, jamais depuis le client.
app.delete('/api/admin/comptes/:id', verifierAdmin, async (req, res, next) => {
  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(req.params.id)
    if (error) return res.status(400).json({ message: error.message })
    return res.status(204).end()
  } catch (error) {
    next(error)
  }
})

// Crée un compte complet (auth.users + sa ligne "profiles") depuis l'espace
// admin, sans passer par /inscription. auth.admin.createUser() n'est
// disponible qu'avec la clé service role, donc côté serveur uniquement (voir
// deleteUser ci-dessus, même principe). Un email est obligatoire : Supabase
// Auth ne peut pas créer de compte sans identifiant de connexion, même si le
// reste du formulaire admin (téléphone, commune...) reste facultatif.
// Comme il n'y a pas de champ mot de passe dans ce formulaire admin, un mot de
// passe aléatoire est généré ici puis jamais communiqué : la personne définit
// le sien via le lien "mot de passe oublié" habituel (voir
// demanderReinitialisationMotDePasse dans stores/auth.js, appelé côté client
// juste après la création).
app.post('/api/admin/comptes', verifierAdmin, async (req, res, next) => {
  try {
    const { nom, email, telephone, ville, role, actif } = req.body

    if (!nom?.trim()) return res.status(400).json({ message: 'Le nom est obligatoire.' })
    if (!email?.trim() || !email.includes('@')) {
      return res.status(400).json({ message: 'Un email valide est obligatoire pour créer un compte.' })
    }
    if (!rolesAutorises.includes(role)) return res.status(400).json({ message: 'Le rôle est invalide.' })

    const motDePasseTemporaire = crypto.randomBytes(24).toString('base64url')

    const { data, error: erreurCreation } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: motDePasseTemporaire,
      email_confirm: true,
      user_metadata: { nom, role },
    })
    if (erreurCreation) {
      const message = /already.*registered|already.*exists/i.test(erreurCreation.message)
        ? 'Un compte existe déjà avec cet email.'
        : erreurCreation.message
      return res.status(400).json({ message })
    }

    const { data: profil, error: erreurProfil } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: data.user.id,
        nom,
        role,
        telephone: telephone || '',
        ville: ville || '',
        actif: actif ?? true,
      })
      .select()
      .single()

    if (erreurProfil) {
      // Le compte Auth a été créé mais pas son profil (ex. téléphone déjà pris,
      // voir profiles_telephone_unique) : on annule la création plutôt que de
      // laisser un compte Auth orphelin, sans ligne "profiles", inutilisable
      // et impossible à recréer avec le même email/téléphone ensuite.
      await supabaseAdmin.auth.admin.deleteUser(data.user.id)
      const message = /profiles_telephone_unique/i.test(erreurProfil.message)
        ? 'Ce numéro de téléphone est déjà utilisé par un autre compte.'
        : "Impossible de créer le profil du compte, merci de réessayer."
      return res.status(400).json({ message })
    }

    return res.status(201).json({ ...profil, email })
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
