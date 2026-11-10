// Règle de gestion du cycle de vie d'une demande d'aide :
// en attente → acceptée / refusée → terminée ou annulée.
// À l'acceptation, deux traitements automatiques :
// - un code d'arrivée à 4 chiffres, que l'intervenant annonce chez la personne âgée ;
// - une mise en relation (mission) entre le demandeur et l'intervenant.
import crypto from 'node:crypto'

export async function changerStatutDemande(client, id, statut) {
  const patch = { statut, date_mise_a_jour: new Date().toISOString() }
  if (statut === 'acceptee') {
    const { data: current, error: readError } = await client
      .from('demandes').select('code_arrivee').eq('id', id).single()
    // Base sans colonne code_arrivee (ancien schéma) : on accepte sans code.
    if (readError && !/code_arrivee/i.test(readError.message)) throw readError
    if (!readError && !current.code_arrivee) {
      patch.code_arrivee = String(crypto.randomInt(10000)).padStart(4, '0')
    }
  }
  const { data, error } = await client.from('demandes').update(patch).eq('id', id).select().single()
  if (error) throw error
  if (statut === 'acceptee') {
    const { data: existing, error: existingError } = await client
      .from('mises_en_relation').select('id').eq('demande_id', id).maybeSingle()
    if (existingError) throw existingError
    if (!existing) {
      const { error: insertError } = await client.from('mises_en_relation').insert({
        demande_id: id,
        demandeur_id: data.demandeur_id,
        aidant_id: data.aidant_id,
      })
      if (insertError) throw insertError
    }
  }
  return data
}
