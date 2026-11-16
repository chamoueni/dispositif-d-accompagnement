// Envoi d'emails avec « nodemailer », par le serveur mail (SMTP) d'alwaysdata.
// Remplace les emails envoyés par Supabase Auth (mot de passe oublié) et
// l'Edge Function Supabase « notify-contact-message » (alerte à l'admin).
//
// Réglages dans .env (voir .env.example) : SMTP_HOST, SMTP_PORT, SMTP_USER,
// SMTP_PASS, EMAIL_EXPEDITEUR, et EMAIL_ADMIN pour les alertes.
import nodemailer from 'nodemailer'

const PRODUCTION = process.env.NODE_ENV === 'production'

export function emailConfigure() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
}

// Le « transporteur » est créé une seule fois, au premier envoi.
let transporteur = null
function obtenirTransporteur() {
  if (!transporteur) {
    const port = Number(process.env.SMTP_PORT) || 587
    transporteur = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      // Port 465 : connexion chiffrée dès le début ; 587 : chiffrement négocié (STARTTLS).
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  }
  return transporteur
}

async function envoyer({ a, sujet, texte }) {
  if (!emailConfigure()) {
    if (PRODUCTION) throw new Error('Envoi d’emails non configuré (SMTP_HOST, SMTP_USER, SMTP_PASS).')
    // En développement seulement : l'email est affiché dans le terminal au lieu
    // d'être envoyé, pour pouvoir tester sans serveur mail. Jamais en production
    // (le lien de réinitialisation permet de prendre le contrôle d'un compte).
    console.log(`\n[email non envoyé, mode développement] À : ${a}\nSujet : ${sujet}\n${texte}\n`)
    return
  }
  await obtenirTransporteur().sendMail({
    from: process.env.EMAIL_EXPEDITEUR || process.env.SMTP_USER,
    to: a,
    subject: sujet,
    text: texte,
  })
}

// Lien « Mot de passe oublié ». Le lien a le même format que ceux de Supabase
// (#type=recovery&access_token=…) : la page ReinitialiserMotDePasse.vue n'a
// donc pas eu besoin de changer. Le jeton est après « # » : cette partie de
// l'adresse n'est jamais envoyée au serveur, elle n'apparaît dans aucun journal.
export function envoyerLienReinitialisation(email, jeton) {
  const site = (process.env.SITE_URL || 'http://localhost:5173').replace(/\/+$/, '')
  const lien = `${site}/reinitialiser-mot-de-passe#type=recovery&access_token=${encodeURIComponent(jeton)}`
  return envoyer({
    a: email,
    sujet: 'Reinitialisation de votre mot de passe - Au Fil des Ages',
    texte:
      'Bonjour,\n\n' +
      'Vous avez demandé à changer le mot de passe de votre compte. Cliquez sur ce lien ' +
      '(valable 1 heure, une seule fois) :\n\n' +
      `${lien}\n\n` +
      'Si vous n’êtes pas à l’origine de cette demande, ignorez simplement cet email : ' +
      'votre mot de passe ne change pas.\n',
  })
}

// Alerte envoyée à l'administrateur quand un message arrive par le bouton SOS.
// Sujet court et sans accents : certains logiciels de messagerie affichent mal
// les sujets longs encodés (problème déjà rencontré avec Gmail).
export async function alerterNouveauMessage({ nom, message }) {
  if (!process.env.EMAIL_ADMIN) return
  await envoyer({
    a: process.env.EMAIL_ADMIN,
    sujet: 'Nouveau message - Au Fil des Ages',
    texte: `De : ${nom || 'Visiteur non connecté'}\n\n${message}`,
  })
}
