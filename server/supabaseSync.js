// Miroir Supabase facultatif : le fichier JSON reste la source locale de secours.
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const client = url && serviceRoleKey ? createClient(url, serviceRoleKey) : null

export async function synchroniserAdherent(adherent, operation) {
  if (!client) return

  const table = client.from('adherents')
  if (operation === 'supprimer') {
    const { error } = await table.delete().eq('id', adherent.id)
    if (error) throw error
    return
  }

  const { error } = await table.upsert(adherent)
  if (error) throw error
}
