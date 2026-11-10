<script setup>
// Page « Politique de confidentialité » (RGPD) : quelles données le site
// enregistre, pourquoi, qui les voit, où elles sont stockées, combien de temps,
// et comment exercer ses droits. Chaque point décrit le fonctionnement réel du
// site (voir backend/controllers/data.controller.js pour le masquage des coordonnées,
// backend/services/session.service.js pour la durée des sessions).
// Contenu statique, en français : c'est un texte juridique, il n'est pas traduit.
import BackLink from '../components/BackLink.vue'
import '../styles/PagesLegales.css'

// Tableau « quelles données, pour quoi faire ».
const DONNEES = [
  {
    quoi: 'Compte : nom, prénom, adresse e-mail, mot de passe (jamais stocké en clair), profil choisi',
    pourquoi: 'Créer votre compte et vous connecter',
  },
  {
    quoi: 'Profil : téléphone, commune, adresse, présentation, spécialité, services proposés, disponibilités, formule choisie',
    pourquoi: 'Vous présenter aux autres utilisateurs et permettre la mise en relation',
  },
  {
    quoi: 'Demandes d’aide : service, urgence, créneau souhaité, message, statut, code d’arrivée',
    pourquoi: 'Envoyer, accepter et suivre une demande entre une personne âgée et un intervenant',
  },
  {
    quoi: 'Avis publiés',
    pourquoi: 'Partager votre expérience avec les autres visiteurs',
  },
  {
    quoi: 'Messages envoyés depuis le bouton SOS',
    pourquoi: 'Répondre à un problème signalé sur le site',
  },
  {
    quoi: 'Session de connexion (identifiant de session, date d’expiration)',
    pourquoi: 'Vous garder connecté(e) de façon sécurisée',
  },
]
</script>

<template>
  <section class="legal-page">
    <div class="container">
      <BackLink />
      <p class="legal-surtitre">
        Vos données
      </p>
      <h1 class="h2">
        Politique de confidentialité
      </h1>
      <p class="legal-maj">
        Dernière mise à jour : novembre 2026
      </p>

      <div class="legal-encadre">
        <strong>En bref :</strong> le site enregistre uniquement ce qui est nécessaire pour vous mettre
        en relation. Vos données ne sont jamais vendues, et aucune publicité ni outil de suivi n’est
        utilisé. Votre téléphone et votre adresse restent cachés tant qu’une demande n’a pas été acceptée.
      </div>

      <nav
        class="legal-sommaire"
        aria-label="Sommaire de la politique de confidentialité"
      >
        <p>Sur cette page</p>
        <ol>
          <li><a href="#responsable">Responsable du traitement</a></li>
          <li><a href="#donnees">Données enregistrées</a></li>
          <li><a href="#visibilite">Qui voit vos données</a></li>
          <li><a href="#stockage">Où sont stockées vos données</a></li>
          <li><a href="#duree">Durée de conservation</a></li>
          <li><a href="#sante">Informations de santé</a></li>
          <li><a href="#securite">Sécurité</a></li>
          <li><a href="#droits">Vos droits</a></li>
        </ol>
      </nav>

      <article
        id="responsable"
        class="legal-bloc"
      >
        <h2>1. Responsable du traitement</h2>
        <p>
          Les données sont traitées par <strong>Moustakim SININA</strong>, éditrice du site
          (voir les <router-link to="/mentions-legales">mentions légales</router-link>). Elles servent uniquement au fonctionnement du dispositif
          d’accompagnement, sur la base de votre inscription et de votre utilisation du service.
        </p>
      </article>

      <article
        id="donnees"
        class="legal-bloc"
      >
        <h2>2. Données enregistrées</h2>
        <div class="legal-tableau">
          <table>
            <thead>
              <tr>
                <th scope="col">
                  Données
                </th>
                <th scope="col">
                  Pour quoi faire
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="ligne in DONNEES"
                :key="ligne.quoi"
              >
                <td>{{ ligne.quoi }}</td>
                <td>{{ ligne.pourquoi }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          <strong>Votre position :</strong> la carte « Ma position » de votre espace utilise la
          localisation de votre appareil seulement si vous l’autorisez. Elle reste dans votre
          navigateur : elle n’est ni envoyée au serveur, ni enregistrée.
        </p>
      </article>

      <article
        id="visibilite"
        class="legal-bloc"
      >
        <h2>3. Qui voit vos données</h2>
        <ul>
          <li>
            <strong>Les autres utilisateurs connectés</strong> voient le profil public des intervenants :
            nom, commune, services, disponibilités et avis.
          </li>
          <li>
            <strong>Votre téléphone et votre adresse</strong> ne sont visibles que par vous,
            l’administration et la personne avec qui une demande a été acceptée.
          </li>
          <li>
            <strong>L’administration</strong> peut consulter les comptes, les demandes et les
            messages pour assurer le bon fonctionnement et la sécurité du service.
          </li>
        </ul>
        <p>Vos données ne sont ni vendues, ni louées, ni utilisées à des fins publicitaires.</p>
      </article>

      <article
        id="stockage"
        class="legal-bloc"
      >
        <h2>4. Où sont stockées vos données</h2>
        <ul>
          <li>
            <strong>Comptes, profils, demandes, avis et messages</strong> : base de données Supabase,
            dans l’Union européenne (Francfort, Allemagne).
          </li>
          <li>
            <strong>Site et serveur</strong> : hébergés par Render (société américaine). Les données
            y transitent pour être affichées, sans y être conservées.
          </li>
          <li>
            <strong>Liste des adhérents</strong> gérée par l’administration (nom, e-mail, téléphone,
            commune) : MongoDB Atlas, serveur situé en Afrique du Sud (Le Cap).
          </li>
          <li>
            <strong>Messages SOS</strong> : une copie est envoyée par e-mail à l’administration
            (messagerie Gmail).
          </li>
          <li>
            <strong>Polices d’écriture</strong> : chargées depuis Google Fonts ; votre navigateur
            communique alors votre adresse IP à Google.
          </li>
        </ul>
        <p>
          Certains de ces prestataires sont situés hors de l’Union européenne. Une mise en service
          réelle nécessiterait de vérifier les garanties prévues par le RGPD pour ces transferts.
        </p>
      </article>

      <article
        id="duree"
        class="legal-bloc"
      >
        <h2>5. Durée de conservation</h2>
        <ul>
          <li>
            <strong>Compte et profil</strong> : tant que votre compte existe. Ils sont effacés si vous
            demandez la suppression de votre compte.
          </li>
          <li>
            <strong>Session de connexion</strong> : 12 heures, ou 30 jours si vous cochez
            « Se souvenir de moi ». Elle prend fin dès que vous vous déconnectez.
          </li>
          <li>
            <strong>Demandes, avis et messages</strong> : tant que le service en a besoin pour le suivi
            des accompagnements, et au plus tard jusqu’à la suppression du compte concerné.
          </li>
        </ul>
      </article>

      <article
        id="sante"
        class="legal-bloc"
      >
        <h2>6. Informations de santé</h2>
        <p>
          Une demande de soins peut révéler des informations sur votre santé, qui sont des données
          sensibles. Ce site est un projet de formation : son hébergement n’est pas certifié HDS
          (Hébergeur de Données de Santé).
        </p>
        <p>
          <strong>Conseil :</strong> n’écrivez pas d’informations médicales détaillées (diagnostic,
          traitement, ordonnance) dans vos messages. Indiquez seulement le type d’aide dont vous avez besoin.
        </p>
      </article>

      <article
        id="securite"
        class="legal-bloc"
      >
        <h2>7. Sécurité</h2>
        <ul>
          <li>Tous les échanges avec le site sont chiffrés (HTTPS).</li>
          <li>Les mots de passe sont transformés (hachés) : personne ne peut les lire, pas même l’administration.</li>
          <li>Votre session est protégée par un cookie que les scripts de la page ne peuvent pas lire.</li>
          <li>Le nombre de tentatives de connexion est limité pour bloquer les attaques.</li>
          <li>Des règles dans la base de données empêchent un utilisateur de lire les données d’un autre.</li>
        </ul>
      </article>

      <article
        id="droits"
        class="legal-bloc"
      >
        <h2>8. Vos droits</h2>
        <p>Conformément au RGPD, vous pouvez à tout moment :</p>
        <ul>
          <li><strong>consulter</strong> les données qui vous concernent ;</li>
          <li><strong>les corriger</strong> — la plupart directement depuis la page « Mon profil » ;</li>
          <li><strong>demander leur suppression</strong>, avec celle de votre compte ;</li>
          <li><strong>vous opposer</strong> à leur utilisation ou en <strong>limiter</strong> l’usage ;</li>
          <li><strong>récupérer</strong> vos données dans un format lisible.</li>
        </ul>
        <p>
          Pour cela, utilisez le bouton <strong>SOS</strong> en bas de l’écran, puis
          « Un problème avec le site ». Une réponse vous sera apportée dans un délai d’un mois.
        </p>
        <p>
          Si vous estimez que vos droits ne sont pas respectés, vous pouvez adresser une réclamation à
          la CNIL :
          <a
            href="https://www.cnil.fr/fr/plaintes"
            target="_blank"
            rel="noopener"
          >cnil.fr/fr/plaintes</a>.
        </p>
        <p>
          Pour les informations enregistrées dans votre navigateur, voir la page
          <router-link to="/cookies">cookies</router-link>.
        </p>
      </article>
    </div>
  </section>
</template>
