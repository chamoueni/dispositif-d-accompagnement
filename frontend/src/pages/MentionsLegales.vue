<script setup>
// Page « Mentions légales » : informations obligatoires sur l'éditeur et les
// hébergeurs du site (loi pour la confiance dans l'économie numérique, art. 6).
// Contenu statique, en français : c'est un texte juridique, il n'est pas traduit.
import BackLink from '../components/BackLink.vue'
import '../styles/PagesLegales.css'
</script>

<template>
  <section class="legal-page">
    <div class="container">
      <BackLink />
      <p class="legal-surtitre">
        Informations légales
      </p>
      <h1 class="h2">
        Mentions légales
      </h1>
      <p class="legal-maj">
        Dernière mise à jour : novembre 2026
      </p>

      <nav
        class="legal-sommaire"
        aria-label="Sommaire des mentions légales"
      >
        <p>Sur cette page</p>
        <ol>
          <li><a href="#editeur">Éditeur du site</a></li>
          <li><a href="#hebergement">Hébergement</a></li>
          <li><a href="#nature">Nature du site</a></li>
          <li><a href="#propriete">Propriété intellectuelle</a></li>
          <li><a href="#responsabilite">Responsabilité</a></li>
          <li><a href="#contact">Nous contacter</a></li>
        </ol>
      </nav>

      <article
        id="editeur"
        class="legal-bloc"
      >
        <h2>1. Éditeur du site</h2>
        <p>
          Le site <strong>Dispositif d’accompagnement personnalisé</strong> est édité par
          <strong>Moustakim SININA</strong>, dans le cadre de la formation
          « Développeur Web et Web Mobile » (promotion 2026).
        </p>
        <p>
          Directrice de la publication : Moustakim SININA.
        </p>
      </article>

      <article
        id="hebergement"
        class="legal-bloc"
      >
        <h2>2. Hébergement</h2>
        <p>Le site s’appuie sur les prestataires suivants :</p>
        <ul>
          <li>
            <strong>Render Services, Inc.</strong> (San Francisco, États-Unis) — hébergement du site
            et de son serveur — <a
              href="https://render.com"
              target="_blank"
              rel="noopener"
            >render.com</a>
          </li>
          <li>
            <strong>Supabase, Inc.</strong> — base de données et comptes utilisateurs, stockés
            dans l’Union européenne (Francfort, Allemagne) — <a
              href="https://supabase.com"
              target="_blank"
              rel="noopener"
            >supabase.com</a>
          </li>
          <li>
            <strong>MongoDB, Inc.</strong> (service MongoDB Atlas) — liste des adhérents gérée
            par l’administration — <a
              href="https://www.mongodb.com"
              target="_blank"
              rel="noopener"
            >mongodb.com</a>
          </li>
        </ul>
      </article>

      <article
        id="nature"
        class="legal-bloc"
      >
        <h2>3. Nature du site</h2>
        <p>
          Ce site est un projet réalisé en formation. Il met en relation des personnes âgées de
          Mayotte avec du personnel de santé et des particuliers pour des soins, des courses, du
          ménage ou une présence. Il ne remplace ni un avis médical, ni les services d’urgence :
          <strong>en cas d’urgence, appelez le 112</strong> (ou le 15 pour le SAMU).
        </p>
        <p>
          Les formules d’accompagnement présentées sont une simulation : aucun paiement réel n’est
          demandé ni encaissé sur le site.
        </p>
      </article>

      <article
        id="propriete"
        class="legal-bloc"
      >
        <h2>4. Propriété intellectuelle</h2>
        <p>
          Les textes, le logo et la mise en page du site sont la propriété de leur autrice. Toute
          reproduction sans autorisation est interdite.
        </p>
        <p>
          Les photographies de la page « Pour qui » proviennent du site
          <a
            href="https://unsplash.com"
            target="_blank"
            rel="noopener"
          >Unsplash</a>, sous la licence Unsplash. La carte de Mayotte utilise les fonds de carte de
          l’<a
            href="https://www.ign.fr"
            target="_blank"
            rel="noopener"
          >IGN</a> (Géoplateforme) et la bibliothèque libre Leaflet.
        </p>
      </article>

      <article
        id="responsabilite"
        class="legal-bloc"
      >
        <h2>5. Responsabilité</h2>
        <p>
          Les profils et les disponibilités sont renseignés par les intervenants eux-mêmes.
          L’éditrice veille au bon fonctionnement du site mais ne peut pas garantir l’exactitude de
          toutes les informations publiées par les utilisateurs, ni la qualité des prestations
          réalisées à la suite d’une mise en relation.
        </p>
        <p>
          Pour la manière dont vos données sont utilisées, consultez la
          <router-link to="/confidentialite">politique de confidentialité</router-link>
          et la page
          <router-link to="/cookies">cookies</router-link>.
        </p>
      </article>

      <article
        id="contact"
        class="legal-bloc"
      >
        <h2>6. Nous contacter</h2>
        <p>
          Pour toute question sur le site, utilisez le bouton <strong>SOS</strong> en bas de l’écran,
          puis « Un problème avec le site » : votre message est transmis directement à l’équipe.
        </p>
      </article>
    </div>
  </section>
</template>
