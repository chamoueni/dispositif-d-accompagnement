// Edge Function Supabase : envoie un vrai email quand un message est ajouté à
// la table messages_contact (voir components/SosButton.vue côté site, et le
// Database Webhook qui appelle cette fonction — configuré dans le dashboard,
// pas dans le code).
//
// Utilise le compte Gmail de l'admin comme expéditeur (SMTP), via un mot de
// passe d'application (pas le vrai mot de passe Gmail) stocké en secret
// Supabase — jamais en dur dans ce fichier.
//
// Secrets attendus (Project Settings > Edge Functions > Secrets) :
//   GMAIL_USER           = moustakimsinina05@gmail.com
//   GMAIL_APP_PASSWORD   = le mot de passe d'application à 16 caractères
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

const ADMIN_EMAIL = 'moustakimsinina05@gmail.com'

Deno.serve(async (req) => {
  try {
    // Un Database Webhook envoie { type, table, record, old_record, schema }.
    // record contient la ligne qui vient d'être insérée dans messages_contact.
    const payload = await req.json()
    const record = payload.record

    if (!record?.message) {
      return new Response(JSON.stringify({ error: 'Aucun message dans la requête' }), {
        status: 400,
      })
    }

    const client = new SMTPClient({
      connection: {
        hostname: 'smtp.gmail.com',
        port: 465,
        tls: true,
        auth: {
          username: Deno.env.get('GMAIL_USER')!,
          password: Deno.env.get('GMAIL_APP_PASSWORD')!,
        },
      },
    })

    // Sujet volontairement fixe, court et sans accents/tirets spéciaux : un sujet
    // avec des caractères non-ASCII doit être encodé en MIME (RFC 2047), et un
    // sujet un peu long dans cet encodage a fait planter l'affichage chez Gmail
    // (montré en raw plutôt que rendu). Le nom et le message, eux, vont dans le
    // corps du mail (sans cette contrainte de longueur), pas dans l'en-tête.
    await client.send({
      from: Deno.env.get('GMAIL_USER')!,
      to: ADMIN_EMAIL,
      subject: 'Nouveau message - Dispositif d accompagnement',
      content: `De : ${record.nom || 'Visiteur non connecté'}\n\n${record.message}`,
    })

    await client.close()

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : String(error)
    return new Response(JSON.stringify({ error: message }), { status: 500 })
  }
})
