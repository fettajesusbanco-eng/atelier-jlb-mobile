# Atelier JLB Mobile — version 1.0 (prototype fonctionnel local)

Application web progressive (PWA) conçue pour Android, iPhone et ordinateur.

## Ce qui fonctionne dans cette première version
- Interface smartphone avec navigation basse, grandes zones tactiles, modes clair/contrasté et main droite/gauche.
- Import CSV ou JSON de catalogues de vidéos et de descriptions, avec colonnes souples : `titre`/`title`, `videoId`, `categorie`, `playlistActuelle`, `playlistCible`, `descriptionActuelle`, `descriptionNouvelle`.
- Classement préparatoire par familles (textes littéraires, dialogues avec l'IA, compositions originales, autre).
- **Protection de la playlist des compositions originales** : cible non modifiable pour une entrée catégorisée « Composition originale ».
- Simulation de modifications de playlists : strictement locale, **aucune écriture YouTube**.
- Modification manuelle des descriptions, repérage indicatif de la première personne.
- Export d'un catalogue CSV ; sauvegarde et restauration JSON complète.
- Accès rapides à GitHub, YouTube Studio, Suno et aux URL de tes outils existants (à renseigner dans Outils).
- Commandes vocales de navigation quand la reconnaissance vocale du navigateur est disponible.
- Fonctionnement hors-ligne de l'interface et des données enregistrées sur ce navigateur, après première installation HTTPS.

## Limites importantes
- Le prototype **n'est pas encore relié à ton compte YouTube, ta chaîne ou un dépôt GitHub**. Aucun chiffre affiché n'est une lecture en direct de la chaîne.
- Aucun commentaire ne peut être supprimé, aucune description publiée ni aucune playlist distante modifiée depuis cette version.
- Le module de descriptions ne produit pas de réécriture automatique par IA : il offre un éditeur local et une détection heuristique.
- Les données restent dans le navigateur, et ne se synchronisent pas entre appareils : exporte des sauvegardes JSON régulières.
- Les copies de travail CSV/JSON peuvent contenir des textes personnels : choisis soigneusement où tu les stockes.
- La reconnaissance vocale dépend du navigateur et peut impliquer les services en ligne du fournisseur du navigateur. Ne l'utilise pas pour des données sensibles.
- Le site doit être hébergé en HTTPS pour être installé comme PWA. Ouvrir le `index.html` par `file://` peut afficher l'interface mais ne permet pas d'installer la PWA et peut limiter certaines fonctions.

## Déploiement facile sur GitHub Pages
1. Ouvre le dossier après extraction du ZIP : les fichiers `index.html`, `app.js`, `styles.css`, `sw.js`, `manifest.webmanifest`, `icons/` doivent rester ensemble.
2. Crée un dépôt GitHub dédié (par exemple `atelier-jlb-mobile`) ou utilise un dépôt que tu contrôles. **Ne remplace pas les fichiers de l'atelier existant.**
3. Ajoute les fichiers du dossier à la racine du dépôt (sans placer le ZIP lui-même comme page d'accueil).
4. Dans le dépôt : **Settings → Pages → Build and deployment → Deploy from a branch → main / (root)**, puis Save (ou adapte selon tes paramètres GitHub).
5. Quand GitHub Pages donne l'URL HTTPS du site, ouvre-la avec Chrome sur Android, puis menu ⋮ → **Installer l'application** ou **Ajouter à l'écran d'accueil**.
6. Depuis l'appli, va dans **Outils** pour renseigner l'URL de ton ancien atelier et de tes outils GitHub Pages.
7. Importe tes catalogues dans **Données** ; commence avec `EXEMPLE_IMPORT.csv` pour un essai sans données personnelles.

## Import CSV conseillé
En-têtes de l'exemple : `titre;videoId;categorie;playlistActuelle;playlistCible;descriptionActuelle;descriptionNouvelle`.
Le fichier peut être séparé par `;` ou `,` et les cellules peuvent contenir des retours à la ligne entre guillemets.
Catégories reconnues : `originale`, `litteraire`, `ia`, `autre` ou des formulations proches.
Le fichier exporté par l'application peut être réimporté, mais vérifie les catégories et les descriptions avant toute action sur des services externes.

## Développement suivant : vraie intégration
- Récupérer les sources de l'atelier existant (`index.html`, `atelier.html`, `nettoyage.html`) puis intégrer le moteur réel du gestionnaire, plutôt que dupliquer ses fonctionnalités.
- Connexion YouTube Data API avec OAuth Google approprié, scopes minimaux, pas de secret client embarqué, prise en compte des quotas et de la gestion des jetons.
- Import robuste des sauvegardes JSON déjà créées le 24 octobre 2026.
- Simulation détaillée avant validation, puis publication unitaire ou groupée **sur approbation explicite** uniquement.
- Commandes vocales plus complètes et éventuellement raccourcis de tâches.

## Confidentialité
Ce prototype n'inclut aucun identifiant, mot de passe, jeton OAuth ni clé API ; ne colle jamais ces secrets dans les liens personnalisés ni dans le code public.

Version 1.0 — base de travail et non migration automatique de l'atelier existant.
