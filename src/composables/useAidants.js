// Liste des aidants inscrits, partagée par la carte de l'accueil et le compteur
// "près de chez vous". L'état est au niveau du module, pas du composant : les
// deux affichent la même donnée au même moment, et une seule requête part.
//
// Sans ça, la page d'accueil interrogerait deux fois la table profiles pour le
// même contenu — inutile sur les connexions lentes visées.
//
// Rappel : la policy RLS "profiles_select_authenticated" réserve la lecture des
// profils aux comptes connectés. Un visiteur anonyme reçoit une liste vide, sans
// erreur. D'où le chargement déclenché par la session, et non au montage.
import { computed, ref, watch } from 'vue'
import { getUsers, getZoneCommune } from '../data/store'
import { useAuth } from '../stores/auth'

const aidants = ref([])
const chargement = ref(false)
let sessionChargee = null

function estAidant(profil) {
  return profil.role === 'sante' || profil.role === 'particulier'
}

export function useAidants() {
  const { user } = useAuth()

  watch(
    user,
    async (compte) => {
      if (!compte) {
        aidants.value = []
        sessionChargee = null
        return
      }
      // Déjà chargé pour ce compte : on ne relance pas la requête à chaque
      // composant qui monte.
      if (sessionChargee === compte.id) return

      sessionChargee = compte.id
      chargement.value = true
      try {
        aidants.value = (await getUsers()).filter(estAidant)
      } finally {
        chargement.value = false
      }
    },
    { immediate: true },
  )

  // Aidants de la commune de l'utilisateur. Si aucun n'y est inscrit, on élargit
  // à la zone géographique (Nord, Centre, Sud, Petite-Terre — voir
  // COMMUNES_MAYOTTE) : à Mayotte, annoncer "0 intervenant" à quelqu'un dont le
  // voisin de commune peut l'aider serait trompeur.
  const pres = computed(() => {
    const ville = user.value?.ville
    if (!ville) return { liste: aidants.value, portee: 'ile', lieu: null }

    const memeCommune = aidants.value.filter((a) => a.ville === ville)
    if (memeCommune.length) return { liste: memeCommune, portee: 'commune', lieu: ville }

    const zone = getZoneCommune(ville)
    const memeZone = zone ? aidants.value.filter((a) => getZoneCommune(a.ville) === zone) : []
    if (memeZone.length) return { liste: memeZone, portee: 'zone', lieu: zone }

    return { liste: [], portee: 'commune', lieu: ville }
  })

  return { aidants, chargement, pres }
}
