# CINDER — Smash Burger Co.

Site vitrine (démonstration) pour **CINDER**, une marque fictive de smash burgers premium créée pour ce projet.

---

## 1. L'identité de marque

| Élément | Détail |
|---|---|
| **Nom** | CINDER *(« braise » en anglais)* |
| **Nom complet** | CINDER — Smash Burger Co. |
| **Slogan** | *Écrasé. Grillé. Inoubliable.* |
| **Positionnement** | Street food premium, sombre et intense, sans chichi. Le smash burger comme un geste brutal et précis : on écrase, on saisit, on caramélise. |
| **Ton** | Direct, un peu provocateur, jamais vulgaire. Des phrases courtes, du vocabulaire de cuisine (plancha, croûte, smashé). |

### Palette de couleurs

| Rôle | Couleur | Code |
|---|---|---|
| Fond principal | Noir charbon | `#0d0b0a` |
| Fond alterné | Brun très sombre | `#141110` |
| Surface (cartes) | Brun chaud sombre | `#1c1714` |
| Accent principal | Orange braise | `#ff5a1f` |
| Accent secondaire | Ambre doré | `#f2a93b` |
| Texte clair | Crème | `#f6efe4` |
| Texte atténué | Gris chaud | `#a89e93` |

L'accent utilise un dégradé orange → ambre (`--gradient-ember` dans le CSS), utilisé sur les boutons, les prix, les icônes et les touches de lumière.

### Typographies (Google Fonts)

- **Anton** — titres, grands formats, condensée et percutante (esprit affiche street food).
- **Inter** — texte courant, lisible et moderne.
- **JetBrains Mono** — étiquettes, prix, mentions techniques (« PLANCHA 280°C », prix des produits) : ça donne un côté « ticket de caisse / bon de commande » qui renforce l'univers cuisine.

### Direction artistique

Fond sombre quasi noir, lueurs orangées façon braises, grain photo subtil, cartes avec bordures fines et coins arrondis, gros titres en majuscules condensées, beaucoup d'air. Les animations (particules d'ember, halo qui suit le curseur, apparitions au scroll) doivent rester discrètes : l'idée est le premium, pas le clinquant.

---

## 2. Structure du projet

```
smash-demo/
├── index.html                     → la page unique du site
├── css/
│   └── style.css                  → tous les styles (variables de marque en haut du fichier)
├── js/
│   └── main.js                    → les interactions (menu mobile, animations, filtres du menu…)
├── assets/
│   ├── icons/
│   │   └── logo-mark.svg          → le logo (icône flamme) utilisé dans la navbar et le footer
│   └── images/
│       └── placeholders/          → toutes les images temporaires, à remplacer plus tard
└── README.md                      → ce fichier
```

Aucune installation n'est nécessaire : c'est du HTML / CSS / JavaScript « pur », sans framework ni étape de build.

---

## 3. Comment voir le site

**Option la plus simple :** double-clique sur le fichier `index.html`, il s'ouvrira dans ton navigateur.

**Option recommandée** (évite quelques limitations liées à l'ouverture directe d'un fichier) : lance un petit serveur local depuis le dossier du projet, par exemple avec Python déjà installé sur la plupart des machines :

```bash
cd smash-demo
python3 -m http.server 8000
```

Puis ouvre `http://localhost:8000` dans ton navigateur.

---

## 4. Les images — comment les remplacer plus tard

Toutes les images sont pour l'instant des **placeholders** (visuels temporaires) générés en SVG, avec le nom du fichier attendu et ses dimensions écrites dessus, pour que tu voies immédiatement quoi remplacer et où.

Elles se trouvent dans `assets/images/placeholders/`. Pour remplacer une image plus tard, il suffit de :

1. Préparer ta vraie photo (idéalement aux dimensions indiquées sur le placeholder).
2. La déposer dans `assets/images/` (ou un sous-dossier de ton choix, par exemple `assets/images/burgers/`).
3. Mettre à jour le `src="..."` correspondant dans `index.html` — une simple recherche du nom de fichier (ex. `hero-burger.svg`) te mènera directement à la bonne ligne.

Aucune autre modification n'est nécessaire : le CSS est déjà prévu pour des photos (recadrage automatique en `object-fit: cover`, formats carrés pour le menu, portrait pour la section Univers).

### Liste des visuels à prévoir

| Fichier placeholder | Emplacement | Format conseillé |
|---|---|---|
| `hero-burger.svg` | Visuel principal du hero | Carré, 1000×1000 |
| `menu-burger-classic.svg` | Le Classique | Carré, 600×600 |
| `menu-burger-cheese.svg` | Cheese Smash | Carré, 600×600 |
| `menu-burger-bacon.svg` | Bacon Inferno | Carré, 600×600 |
| `menu-burger-double.svg` | Double Cinder | Carré, 600×600 |
| `menu-burger-spicy.svg` | Ghost Pepper | Carré, 600×600 |
| `menu-side-fries.svg` | Frites Maison | Carré, 600×600 |
| `menu-side-onion-rings.svg` | Onion Rings | Carré, 600×600 |
| `menu-side-cheese-fries.svg` | Cheese Fries | Carré, 600×600 |
| `menu-dessert-cookie.svg` | Cookie Fondant | Carré, 600×600 |
| `menu-dessert-brownie.svg` | Brownie Brûlot | Carré, 600×600 |
| `menu-dessert-milkshake.svg` | Milkshake Cinder | Carré, 600×600 |
| `menu-extra-sauce.svg` | Sauce Cinder | Carré, 600×600 |
| `menu-extra-drink.svg` | Boisson artisanale | Carré, 600×600 |
| `menu-extra-topping.svg` | Supplément topping | Carré, 600×600 |
| `story-kitchen.svg` | Section Univers (image arrière) | Portrait, 800×1000 |
| `story-plancha.svg` | Section Univers (image avant) | Portrait, 800×1000 |
| `og-cover.svg` | Réservé pour un futur visuel de partage réseaux sociaux | 1200×630 |

Le logo (`assets/icons/logo-mark.svg`) n'est **pas** un placeholder : c'est un vrai petit logo vectoriel (flamme stylisée) déjà utilisable tel quel, ou modifiable/remplaçable plus tard si tu veux un logo différent.

---

## 5. Ce que contient déjà le site

1. **Navbar** — logo, navigation, bouton « Commander », menu mobile animé.
2. **Hero** — grand titre, slogan, présentation courte, deux boutons d'action, visuel produit flottant avec badges (« Signature », prix).
3. **Bandeau défilant (marquee)** — accroche des points forts de la marque.
4. **Menu** — 4 catégories filtrables (Burgers, Sides, Cookies & Desserts, Extras), 15 produits avec prix.
5. **L'Univers** — histoire de la marque, chiffres clés, collage de visuels.
6. **La Qualité** — 4 arguments produit avec icônes.
7. **CTA** — grande section d'incitation à la commande.
8. **Footer** — navigation, coordonnées (fictives), réseaux sociaux, newsletter.

Toutes les interactions (menu mobile, filtres de la carte, animations à l'apparition au scroll, halo qui suit le curseur, boutons « Commander » et newsletter) sont déjà fonctionnelles en JavaScript, sans backend — c'est une démonstration front-end.

---

*Marque et contenu entièrement fictifs, créés dans le cadre d'un projet de démonstration.*
