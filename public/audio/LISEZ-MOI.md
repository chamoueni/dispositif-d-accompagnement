# Enregistrements vocaux shimaoré et kibushi

Le bouton « Écouter » lit un enregistrement humain quand l'interface est en
shimaoré ou en kibushi, parce que la synthèse vocale des navigateurs ne connaît
aucune de ces deux langues : lui faire lire du shimaoré avec un moteur français
ne donne pas un accent approximatif, mais des sons faux.

## Où déposer les fichiers

    public/audio/shi/<clé>.mp3
    public/audio/kib/<clé>.mp3

La `<clé>` est la clé de traduction, points compris, telle qu'elle apparaît dans
`src/locales/fr.json`. Exemples :

    public/audio/shi/accueil.hero.chapo.mp3
    public/audio/kib/sos.urgence_texte.mp3

## Ce qui se passe si le fichier n'existe pas

Le texte **français** de la même clé est lu par la synthèse vocale. Le texte
shimaoré ou kibushi affiché à l'écran n'est jamais lu par la voix française.

Aucun fichier n'est obligatoire : déposez-les au fur et à mesure des
enregistrements, rien d'autre n'est à modifier dans le code.
