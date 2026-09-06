# KIMBO — Café & Restaurant

Site vitrine pour **Kimbo**, café & restaurant situé à l'Arribat Center, à Rabat.

---

## 1. Informations Kimbo

| Élément | Détail |
|---|---|
| **Nom** | KIMBO |
| **Type** | Café & Restaurant |
| **Localisation** | Arribat Center, Rabat |
| **Adresse** | 2534+99M, Av. Inaouin, Rabat |
| **Téléphone** | 05 37 77 26 77 |
| **Commande en ligne** | [Glovo](https://glovoapp.com/ma/fr/rabat/kimbo-rbt) |

### Palette de couleurs

| Rôle | Couleur | Code |
|---|---|---|
| Fond principal | Espresso très sombre | `#1c130d` |
| Surface (cartes) | Brun torréfié | `#2c2015` |
| Accent principal | Or torréfié | `#d1a355` |
| Accent secondaire | Terracotta | `#c1552c` |
| Texte clair | Crème | `#f7f1e4` |
| Texte atténué | Beige atténué | `#c9b699` |

### Typographies (Google Fonts)

- **Fraunces** — titres, grands formats, serif chaleureuse et premium.
- **Inter** — texte courant, lisible et moderne.

---

## 2. Structure du projet

```
smash-demo/
├── index.html          → la page unique du site
├── css/
│   └── style.css       → tous les styles (variables de marque en haut du fichier)
├── js/
│   └── main.js         → GSAP + ScrollTrigger : chargement, reveals, choreographie du scroll
├── assets/
│   └── icons/
│       └── kimbo-mark.svg  → petit logo vectoriel (tasse) utilisé dans la navbar
└── README.md            → ce fichier
```

Aucune installation n'est nécessaire : c'est du HTML / CSS / JavaScript « pur »,
sans framework ni étape de build. GSAP et ScrollTrigger sont chargés depuis un
CDN (jsDelivr).

---

## 3. Comment voir le site

```bash
cd smash-demo
python3 -m http.server 8000
```

Puis ouvre `http://localhost:8000` dans ton navigateur.

---

## 4. Les images

Toutes les images sont pour l'instant des **photos de démonstration** (Unsplash),
en attendant les vrais visuels de Kimbo (plats, boissons, intérieur). Pour les
remplacer :

1. Déposer les vraies photos dans `assets/images/` (dossier à créer).
2. Mettre à jour les `src="..."` correspondants dans `index.html`.

Aucune autre modification n'est nécessaire : les images sont affichées en
`object-fit: cover` dans des cadres déjà prévus (hero, cartes, galerie).

---

## 5. Le menu

La section **Menu** est volontairement construite comme une structure prête à
recevoir la vraie carte de Kimbo (catégories : Crêpes, Gaufres, Sandwichs,
Boissons, Desserts). Aucun plat ni prix n'a été inventé : les lignes affichées
sont des emplacements à compléter (`Nom du produit` / `—`).

---

## 6. Animations (GSAP + ScrollTrigger)

Le principe technique repris de la base du projet : un **élément visuel
principal** (grande photo, dans `.hero-visual-wrapper`) est épinglé (`pin`) au
fil du scroll et choréographié à travers plusieurs sections — il se déplace,
change d'échelle et de rotation, puis s'efface avant la section Menu.

Le reste du site s'anime avec les mêmes briques : reveals au scroll, stagger
sur les cartes (« Nos incontournables », galerie), un léger parallax sur les
images (section Expérience, galerie), et un bandeau défilant (marquee).

Sur mobile, la choreographie de la photo épinglée est désactivée
(`ScrollTrigger.matchMedia`) au profit d'un simple fondu, pour garder un
scroll fluide et performant sur téléphone.

---

*Site vitrine — projet de refonte pour Kimbo. Images de démonstration en
attendant les visuels officiels.*
