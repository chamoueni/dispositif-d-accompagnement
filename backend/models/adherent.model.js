// Modèle « adhérent » : lecture et écriture de la table PostgreSQL « adherents »
// (Supabase), la même base que les profils, demandes et missions.
//
// Chaque fonction reçoit le client Supabase de l'administrateur connecté
// (req.supabase) : la base applique alors ses règles RLS, qui réservent cette
// table à l'administrateur (voir supabase/schema.sql). C'est une seconde
// protection, en plus du contrôle verifierAdmin fait par la route.
import crypto from 'node:crypto'

// Copie les champs modifiables saisis dans le formulaire admin, nettoyés.
// L'email est mis en minuscules : l'index unique sur l'email (voir la
// migration 20261112_adherents_sans_mongodb.sql) compare alors des valeurs
// homogènes.
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

// Liste des adhérents, du plus ancien au plus récent.
export async function obtenirAdherents(client) {
  const { data, error } = await client.from('adherents').select('*').order('created_at', { ascending: true })
  if (error) throw error
  return data
}

// Ajoute un adhérent avec un nouvel identifiant (UUID) ; la base remplit ses dates.
export async function ajouterAdherent(client, donnees) {
  const { data, error } = await client
    .from('adherents')
    .insert({ id: crypto.randomUUID(), ...champsAdherent(donnees) })
    .select()
    .single()
  if (error) throw error
  return data
}

// Modifie un adhérent. Renvoie null si aucun adhérent ne porte cet id
// (=> 404 dans le contrôleur) ; "id" et "created_at" ne changent jamais.
export async function modifierAdherent(client, id, donnees) {
  const { data, error } = await client
    .from('adherents')
    .update({ ...champsAdherent(donnees), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .maybeSingle()
  if (error) throw error
  return data
}

// Supprime un adhérent. Renvoie false si aucun adhérent ne portait cet id.
export async function supprimerAdherent(client, id) {
  const { data, error } = await client.from('adherents').delete().eq('id', id).select('id')
  if (error) throw error
  return data.length === 1
}
