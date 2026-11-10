// Copie facultative des adhérents dans la table Supabase "adherents".
// La source de vérité est MongoDB (ou le fichier JSON de secours, voir
// models/adherent.model.js) : si cette copie échoue (table absente, Supabase
// injoignable...), l'opération de l'administrateur ne doit PAS échouer pour
// autant. On note simplement l'incident dans les journaux du serveur.
import { supabaseAdmin } from '../config/supabase.js'

export async function synchroniserAdherent(adherent, operation) {
  if (!supabaseAdmin) return

  try {
    const table = supabaseAdmin.from('adherents')
    const { error } = operation === 'supprimer'
      ? await table.delete().eq('id', adherent.id)
      : await table.upsert(adherent)
    if (error) throw error
  } catch (error) {
    // Pas de données personnelles dans le journal : l'opération et le code suffisent.
    console.warn(`Copie Supabase des adhérents ignorée (${operation}) :`, error.code || error.message)
  }
}
