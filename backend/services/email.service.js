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

// Nom affiché comme expéditeur dans la boîte de réception (au lieu de « moustakim »).
const NOM_EXPEDITEUR = 'Au Fil des Âges'

// Couleurs du site (frontend/src/styles/bootstrap-custom.scss), pour que les
// emails lui ressemblent.
const TEAL = '#0e5c56'
const OR = '#e3a234'
const CREME = '#fbfaf6'
const TEXTE = '#3f544f'
const GRIS = '#7a8a86'

// Une valeur saisie par un visiteur (nom, message) est « échappée » avant
// d'être mise dans le HTML : un « <script> » reste du simple texte affiché.
const CARACTERES_HTML = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
function echapper(valeur) {
  return String(valeur ?? '').replace(/[&<>"']/g, (c) => CARACTERES_HTML[c])
}

// Mise en page commune à tous les emails. Les messageries (Gmail, Outlook…)
// ignorent une grande partie du CSS moderne : on utilise donc des tableaux et
// des styles écrits sur chaque balise, la méthode la plus fiable pour un email.
function gabarit({ titre, contenu }) {
  return `<!doctype html>
<html lang="fr">
<body style="margin:0;padding:0;background:${CREME};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREME};padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e8e2d4;">
        <tr>
          <td style="background:${TEAL};padding:22px 28px;">
            <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#ffffff;">Au Fil des Âges</div>
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#cfe3df;margin-top:4px;">Accompagnement des personnes âgées à Mayotte</div>
          </td>
        </tr>
        <tr><td style="height:4px;background:${OR};font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr>
          <td style="padding:28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:${TEXTE};">
            <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:normal;color:${TEAL};">${titre}</h1>
            ${contenu}
          </td>
        </tr>
        <tr>
          <td style="padding:18px 28px;background:${CREME};font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:${GRIS};">
            Cet email a été envoyé automatiquement par le site Au Fil des Âges, merci de ne pas y répondre.<br>
            En cas d'urgence, appelez le 112.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

async function envoyer({ a, sujet, texte, html }) {
  if (!emailConfigure()) {
    if (PRODUCTION) throw new Error('Envoi d’emails non configuré (SMTP_HOST, SMTP_USER, SMTP_PASS).')
    // En développement seulement : l'email est affiché dans le terminal au lieu
    // d'être envoyé, pour pouvoir tester sans serveur mail. Jamais en production
    // (le lien de réinitialisation permet de prendre le contrôle d'un compte).
    console.log(`\n[email non envoyé, mode développement] À : ${a}\nSujet : ${sujet}\n${texte}\n`)
    return
  }
  await obtenirTransporteur().sendMail({
    // « Au Fil des Âges <moustakim@alwaysdata.net> » : le nom s'affiche dans la
    // boîte de réception, l'adresse reste celle du compte SMTP (obligatoire).
    from: process.env.EMAIL_EXPEDITEUR || { name: NOM_EXPEDITEUR, address: process.env.SMTP_USER },
    to: a,
    subject: sujet,
    // Deux versions : HTML (mise en page) et texte brut, affiché par les
    // messageries qui ne lisent pas le HTML.
    text: texte,
    html,
  })
}

// Lien « Mot de passe oublié ». Le lien a le même format que ceux de Supabase
// (#type=recovery&access_token=…) : la page ReinitialiserMotDePasse.vue n'a
// donc pas eu besoin de changer. Le jeton est après « # » : cette partie de
// l'adresse n'est jamais envoyée au serveur, elle n'apparaît dans aucun journal.
// nom : nom du profil, pour saluer la personne (facultatif).
export function envoyerLienReinitialisation(email, jeton, nom = '') {
  const site = (process.env.SITE_URL || 'http://localhost:5173').replace(/\/+$/, '')
  const lien = `${site}/reinitialiser-mot-de-passe#type=recovery&access_token=${encodeURIComponent(jeton)}`
  const salutation = nom ? `Bonjour ${nom},` : 'Bonjour,'
  return envoyer({
    a: email,
    sujet: 'Réinitialisation de votre mot de passe',
    texte:
      `${salutation}\n\n` +
      'Vous avez demandé à changer le mot de passe de votre compte Au Fil des Âges.\n' +
      'Pour choisir un nouveau mot de passe, ouvrez ce lien (valable 1 heure, une seule fois) :\n\n' +
      `${lien}\n\n` +
      'Si vous n’êtes pas à l’origine de cette demande, ignorez simplement cet email : ' +
      'votre mot de passe ne change pas.\n\n' +
      'L’équipe Au Fil des Âges\n',
    html: gabarit({
      titre: 'Choisir un nouveau mot de passe',
      contenu: `
            <p style="margin:0 0 14px;">${echapper(salutation)}</p>
            <p style="margin:0 0 22px;">Vous avez demandé à changer le mot de passe de votre compte. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.</p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 22px;">
              <tr><td style="border-radius:999px;background:${TEAL};">
                <a href="${echapper(lien)}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:999px;">Choisir un nouveau mot de passe</a>
              </td></tr>
            </table>
            <p style="margin:0 0 14px;padding:12px 14px;background:${CREME};border-left:4px solid ${OR};border-radius:6px;font-size:14px;">
              Ce lien est valable <strong>1 heure</strong> et ne fonctionne <strong>qu'une seule fois</strong>.
            </p>
            <p style="margin:0 0 14px;font-size:14px;">Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email : votre mot de passe ne change pas.</p>
            <p style="margin:0 0 6px;font-size:13px;color:${GRIS};">Le bouton ne fonctionne pas ? Copiez cette adresse dans votre navigateur :</p>
            <p style="margin:0 0 18px;font-size:12px;word-break:break-all;"><a href="${echapper(lien)}" style="color:${TEAL};">${echapper(lien)}</a></p>
            <p style="margin:0;">L'équipe Au Fil des Âges</p>`,
    }),
  })
}

// Alerte envoyée à l'administrateur quand un message arrive par le bouton SOS.
export async function alerterNouveauMessage({ nom, message }) {
  if (!process.env.EMAIL_ADMIN) return
  const auteur = nom || 'Visiteur non connecté'
  await envoyer({
    a: process.env.EMAIL_ADMIN,
    sujet: `Nouveau message SOS de ${auteur}`,
    texte: `De : ${auteur}\n\n${message}\n\nÀ lire et traiter dans l’espace admin › Messages.`,
    html: gabarit({
      titre: 'Nouveau message reçu',
      contenu: `
            <p style="margin:0 0 6px;font-size:14px;color:${GRIS};">De</p>
            <p style="margin:0 0 18px;font-weight:bold;">${echapper(auteur)}</p>
            <p style="margin:0 0 6px;font-size:14px;color:${GRIS};">Message</p>
            <p style="margin:0 0 22px;padding:14px;background:${CREME};border-left:4px solid ${OR};border-radius:6px;white-space:pre-wrap;">${echapper(message)}</p>
            <p style="margin:0;font-size:14px;">À lire et traiter dans l'espace admin › <strong>Messages</strong>.</p>`,
    }),
  })
}
