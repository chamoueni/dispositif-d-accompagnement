// Charge le fichier .env (à la racine du projet) dans process.env.
// Importé en tout premier par app.js, et par chaque fichier de config/ qui lit
// une variable dès son chargement : ainsi les valeurs sont toujours prêtes,
// quel que soit l'ordre des imports.
import 'dotenv/config'
