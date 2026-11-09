import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'
import 'dotenv/config'

// Racine du dépôt (ce script est dans frontend/scripts/) : le build y écrit
// dist/, voir frontend/vite.config.js.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const dist = path.join(root, 'dist')
const configuredSiteUrl = (process.env.VITE_SITE_URL || '').trim()
let siteUrl = ''
if (configuredSiteUrl) {
  const parsedSiteUrl = new URL(configuredSiteUrl)
  if (!['http:', 'https:'].includes(parsedSiteUrl.protocol) ||
      parsedSiteUrl.pathname !== '/' || parsedSiteUrl.search || parsedSiteUrl.hash) {
    throw new Error('VITE_SITE_URL doit être une URL de site sans chemin, paramètres ni fragment.')
  }
  siteUrl = parsedSiteUrl.origin
}
const pages = [
  {
    path: '/',
    title: 'Aide à domicile à Mayotte | Dispositif d’accompagnement',
    description: 'Trouvez à Mayotte un accompagnement de confiance pour les personnes âgées : soins à domicile, courses, ménage et aide du quotidien.',
    body: `<main id="contenu"><h1>Un accompagnement de confiance, en quelques clics</h1><p>Le dispositif met en relation les personnes âgées de Mayotte avec du personnel de santé, des coursiers et des aides à domicile.</p><h2>Des services près de chez vous</h2><p>Soins à domicile, courses, ménage, service de garde et soutien psychologique selon les disponibilités locales.</p><h2>Un parcours simple</h2><p>Créez un profil, indiquez vos besoins et suivez votre demande jusqu’à la mise en relation.</p><nav aria-label="Découvrir le dispositif"><a href="/services">Voir les services</a> · <a href="/pour-qui">À qui s’adresse le dispositif</a> · <a href="/pourquoi">Pourquoi ce dispositif</a> · <a href="/atouts">Nos engagements</a></nav></main>`,
  },
  {
    path: '/pourquoi',
    title: 'Pourquoi ce dispositif d’accompagnement à Mayotte',
    description: 'Découvrez comment le dispositif facilite l’accès des personnes âgées de Mayotte à une aide de proximité et à un accompagnement adapté.',
    body: `<main id="contenu"><h1>Pourquoi ce dispositif d’accompagnement</h1><p>À Mayotte, les personnes âgées peuvent avoir besoin d’aide pour les gestes du quotidien ou d’un suivi de santé régulier.</p><h2>Une aide de proximité plus simple à mobiliser</h2><p>La plateforme rassemble personnes âgées, personnel de santé et particuliers afin de faciliter les demandes d’accompagnement.</p><h2>Un parcours adapté</h2><p>Les besoins et les disponibilités sont mis en relation selon le profil, le service recherché et la commune.</p><a href="/services">Découvrir les services proposés</a></main>`,
  },
  {
    path: '/services',
    title: 'Services d’aide à domicile à Mayotte',
    description: 'Soins à domicile, courses, ménage, garde et soutien psychologique : découvrez les services d’accompagnement proposés à Mayotte.',
    body: `<main id="contenu"><h1>Services d’accompagnement à Mayotte</h1><p>Le dispositif aide à trouver des services de proximité adaptés aux besoins des personnes âgées.</p><h2>Soins et aide à domicile</h2><p>Soins par du personnel de santé, ménage, courses et présence à domicile selon les profils disponibles.</p><h2>Accompagnement humain</h2><p>Un soutien psychologique peut contribuer à rompre l’isolement. Les disponibilités dépendent des intervenants inscrits dans chaque commune.</p><a href="/assistant">Préciser votre besoin</a></main>`,
  },
  {
    path: '/pour-qui',
    title: 'À qui s’adresse le dispositif d’accompagnement',
    description: 'Personnes âgées, personnel de santé et particuliers : découvrez les profils concernés par le dispositif d’accompagnement à Mayotte.',
    body: `<main id="contenu"><h1>À qui s’adresse ce dispositif</h1><p>La plateforme accompagne trois profils dans leurs démarches de proximité à Mayotte.</p><h2>Personnes âgées</h2><p>Décrivez un besoin d’aide à domicile, de soins ou de services du quotidien.</p><h2>Personnel de santé et particuliers</h2><p>Les intervenants peuvent présenter leurs services et leurs disponibilités pour être contactés.</p><a href="/inscription">Créer un compte</a></main>`,
  },
  {
    path: '/assistant',
    title: 'Trouver une aide adaptée à Mayotte',
    description: 'Précisez votre besoin pour découvrir les solutions d’accompagnement disponibles pour les personnes âgées à Mayotte.',
    body: `<main id="contenu"><h1>Trouver une aide adaptée à votre besoin</h1><p>Le parcours vous aide à identifier le type d’accompagnement recherché et à préparer une demande.</p><h2>Des besoins du quotidien aux soins</h2><p>Précisez le service souhaité, votre commune et les informations utiles à votre demande.</p><a href="/inscription">Créer un compte pour envoyer une demande</a></main>`,
  },
  {
    path: '/atouts',
    title: 'Nos engagements pour un accompagnement de confiance',
    description: 'Sécurité, fiabilité et disponibilité : découvrez les engagements du dispositif d’accompagnement personnalisé à Mayotte.',
    body: `<main id="contenu"><h1>Nos engagements</h1><p>Le dispositif vise un accompagnement humain, de proximité et adapté aux besoins des personnes âgées.</p><h2>Sécurité et fiabilité</h2><p>Les profils présentent leurs services et leurs disponibilités pour aider chacun à préparer une mise en relation.</p><h2>Disponibilité locale</h2><p>La recherche se fait par commune à Mayotte, selon les intervenants présents sur le territoire.</p><a href="/services">Voir les services</a></main>`,
  },
]

function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')
}

function replaceHead(html, page, url) {
  const canonical = url || page.path
  const metadata = [
    `<title>${escapeHtml(page.title)}</title>`,
    `<meta name="description" content="${escapeHtml(page.description)}">`,
    '<meta name="robots" content="index, follow">',
    `<link rel="canonical" href="${escapeHtml(canonical)}">`,
    `<meta property="og:title" content="${escapeHtml(page.title)}">`,
    `<meta property="og:description" content="${escapeHtml(page.description)}">`,
    '<meta property="og:type" content="website">',
    `<meta property="og:url" content="${escapeHtml(canonical)}">`,
    '<meta property="og:locale" content="fr_FR">',
    '<meta name="twitter:card" content="summary">',
  ].join('\n    ')
  return html
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta name="description"[^>]*>/gi, '')
    .replace(/<meta name="robots"[^>]*>/gi, '')
    .replace(/<meta property="og:[^"]*"[^>]*>/gi, '')
    .replace(/<meta name="twitter:[^"]*"[^>]*>/gi, '')
    .replace(/<link rel="canonical"[^>]*>/gi, '')
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/gi, '')
    .replace('</head>', `    ${metadata}\n  </head>`)
}

const template = (await readFile(path.join(dist, 'index.html'), 'utf8'))
  .replace(/<div id="app">[\s\S]*?<\/div>/i, '<div id="app"></div>')
for (const page of pages) {
  const url = siteUrl ? `${siteUrl}${page.path === '/' ? '/' : page.path}` : ''
  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': page.path === '/' ? 'Organization' : 'WebPage',
    name: page.title,
    description: page.description,
    ...(url ? { url } : {}),
    ...(page.path === '/' ? { areaServed: 'Mayotte' } : {}),
  })
  const document = replaceHead(template, page, url)
    .replace('<div id="app"></div>', `<div id="app">${page.body}</div><script type="application/ld+json">${schema}</script>`)
  const target = page.path === '/' ? path.join(dist, 'index.html') : path.join(dist, page.path.slice(1), 'index.html')
  await mkdir(path.dirname(target), { recursive: true })
  await writeFile(target, document)
}

const sitemapEntries = siteUrl
  ? pages.map(({ path: pagePath }) => {
    const url = `${siteUrl}${pagePath === '/' ? '/' : pagePath}`
    return `  <url><loc>${escapeHtml(url)}</loc></url>`
  }).join('\n')
  : ''
await writeFile(path.join(dist, 'sitemap.xml'), [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  sitemapEntries,
  '</urlset>',
].filter(Boolean).join('\n'))

const sitemapDirective = siteUrl ? `Sitemap: ${siteUrl}/sitemap.xml\n` : ''
await writeFile(path.join(dist, 'robots.txt'), [
  'User-agent: *',
  'Allow: /',
  'Disallow: /api/',
  'Disallow: /admin',
  'Disallow: /mon-compte',
  'Disallow: /mes-demandes',
  'Disallow: /mes-accompagnements',
  'Disallow: /historique',
  'Disallow: /profil',
  'Disallow: /recherche',
  'Disallow: /formule/',
  'Disallow: /connexion',
  'Disallow: /inscription',
  'Disallow: /mot-de-passe-oublie',
  'Disallow: /reinitialiser-mot-de-passe',
  'Disallow: /nouvelle-demande',
  sitemapDirective.trim(),
].filter(Boolean).join('\n'))

const notFound = replaceHead(template, {
  path: '/404',
  title: 'Page introuvable | Dispositif d’accompagnement',
  description: 'La page demandée est introuvable.',
}, siteUrl ? `${siteUrl}/404` : '/404')
  .replace('<meta name="robots" content="index, follow">', '<meta name="robots" content="noindex, nofollow">')
  .replace('<div id="app"></div>', '<div id="app"><main id="contenu"><h1>Page introuvable (404)</h1><p>L’adresse a peut-être changé ou la page n’existe plus.</p><a href="/">Retour à l’accueil</a></main></div>')
await writeFile(path.join(dist, '404.html'), notFound)

console.log(`Pages SEO générées : ${pages.length}${siteUrl ? ` (${siteUrl})` : ' (VITE_SITE_URL à renseigner pour le sitemap de production)'}`)
