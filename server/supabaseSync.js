// Miroir Supabase facultatif : le fichier JSON reste la source locale de secours.
import { supabaseAdmin } from './supabaseAdmin.js'

export async function synchroniserAdherent(adherent, operation) {
  if (!supabaseAdmin) return

  const table = supabaseAdmin.from('adherents')
  if (operation === 'supprimer') {
    const { error } = await table.delete().eq('id', adherent.id)
    if (error) throw error
    return
  }

  const { error } = await table.upsert(adherent)
  if (error) throw error
}
