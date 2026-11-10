<script setup>
// Carte « Santé du site » du tableau de bord admin : état du serveur, de la
// base Supabase et de la dernière ronde de Mlezi, le robot de maintenance
// (.github/workflows/mlezi-gardien.yml). Lecture seule, rien à configurer :
// - /api/sante : bilan public du serveur (voir backend/app.js) ;
// - l'API publique de GitHub : dernière exécution du workflow Mlezi.
import { onMounted, ref } from 'vue'
import { API_BASE_URL } from '../../lib/apiBase'
import AdminIcon from './AdminIcon.vue'

const DEPOT = 'chamoueni/dispositif-d-accompagnement'
const LIEN_MLEZI = `https://github.com/${DEPOT}/actions/workflows/mlezi-gardien.yml`

const chargement = ref(false)
const serveur = ref(null) // { ok, ms } ou null tant que non vérifié
const supabase = ref(null) // true / false / null
const mlezi = ref(null) // { ok, quand } ou null si indisponible

async function verifierServeur() {
  const debut = performance.now()
  try {
    const reponse = await fetch(`${API_BASE_URL}/api/sante`, { cache: 'no-store' })
    const corps = await reponse.json().catch(() => ({}))
    serveur.value = { ok: corps.api === 'ok', ms: Math.round(performance.now() - debut) }
    supabase.value = corps.supabase === 'ok'
  } catch {
    serveur.value = { ok: false, ms: null }
    supabase.value = null
  }
}

async function verifierMlezi() {
  try {
    const reponse = await fetch(`https://api.github.com/repos/${DEPOT}/actions/workflows/mlezi-gardien.yml/runs?per_page=1`)
    const ronde = (await reponse.json()).workflow_runs?.[0]
    mlezi.value = ronde
      ? {
          ok: ronde.conclusion === 'success',
          enCours: ronde.status !== 'completed',
          quand: new Date(ronde.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }),
        }
      : null
  } catch {
    // GitHub injoignable (limite de requêtes, hors ligne) : on l'indique simplement.
    mlezi.value = null
  }
}

async function verifier() {
  chargement.value = true
  await Promise.all([verifierServeur(), verifierMlezi()])
  chargement.value = false
}

onMounted(verifier)
</script>

<template>
  <section class="admin-card sante-site">
    <div class="admin-card-head">
      <h2>Santé du site</h2>
      <button
        type="button"
        class="admin-btn admin-btn-outline admin-btn-sm"
        :disabled="chargement"
        @click="verifier"
      >
        {{ chargement ? 'Vérification…' : 'Vérifier maintenant' }}
      </button>
    </div>
    <p class="sante-site-note">
      Surveillé en continu par Mlezi, le robot de maintenance. En cas de panne, un ticket GitHub
      est ouvert et vous recevez un email.
    </p>

    <div class="sante-site-grille">
      <div class="sante-site-item">
        <span class="sante-site-libelle">Serveur (API)</span>
        <span :class="['sante-site-etat', serveur ? (serveur.ok ? 'est-ok' : 'est-ko') : '']">
          ● {{ serveur ? (serveur.ok ? 'Opérationnel' : 'En panne') : '…' }}
        </span>
        <span
          v-if="serveur?.ms"
          class="sante-site-detail"
        ><strong>{{ serveur.ms }} ms</strong> de temps de réponse</span>
      </div>

      <div class="sante-site-item">
        <span class="sante-site-libelle">Base de données (Supabase)</span>
        <span :class="['sante-site-etat', supabase === null ? '' : supabase ? 'est-ok' : 'est-ko']">
          ● {{ supabase === null ? '…' : supabase ? 'Opérationnelle' : 'Injoignable' }}
        </span>
        <span class="sante-site-detail">Lue régulièrement : plus de mise en pause</span>
      </div>

      <div class="sante-site-item">
        <span class="sante-site-libelle">Dernière ronde de Mlezi</span>
        <span
          v-if="mlezi"
          :class="['sante-site-etat', mlezi.enCours ? '' : mlezi.ok ? 'est-ok' : 'est-ko']"
        >
          ● {{ mlezi.enCours ? 'En cours' : mlezi.ok ? 'Tout va bien' : 'Problème détecté' }}
        </span>
        <span
          v-else
          class="sante-site-etat"
        >● Indisponible</span>
        <a
          :href="LIEN_MLEZI"
          target="_blank"
          rel="noopener"
          class="admin-link"
        >
          {{ mlezi ? mlezi.quand : 'Voir sur GitHub' }}
          <AdminIcon nom="chevron-right" />
        </a>
      </div>
    </div>
  </section>
</template>

<style scoped>
.sante-site {
  margin-bottom: 20px;
}

.sante-site-note {
  margin: 0 0 14px;
  color: var(--muted);
  font-size: 13px;
}

.sante-site-grille {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.sante-site-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface-2);
}

.sante-site-libelle {
  color: var(--muted);
  font-size: 13px;
}

.sante-site-etat {
  font-weight: 700;
  color: var(--muted);
}

.sante-site-etat.est-ok {
  color: var(--green);
}

.sante-site-etat.est-ko {
  color: var(--coral-text);
}

.sante-site-detail {
  font-size: 13px;
  color: var(--muted);
}

.sante-site-detail strong {
  color: var(--ink);
}

@media (max-width: 900px) {
  .sante-site-grille {
    grid-template-columns: 1fr;
  }
}
</style>
