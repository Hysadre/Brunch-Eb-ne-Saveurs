# 🌴 Brunch Ébène & Saveurs — Site de réservation

Site de billeterie dynamique pour le Brunch du **samedi 22 août 2026 à Ronchin (Lille)**.
Capacité : **200 personnes**. Tarifs : Standard 35€, Duo 70€, Trio 105€.

## 📁 Structure du projet

```
.
├── index.html         # Page d'accueil + formulaire (mobile-first, fond noir)
├── paiement.html      # 4 moyens de paiement : Revolut, Wero, virement, CB
├── confirmation.html  # Billet électronique avec QR code
├── admin.html         # Dashboard privé (auto-refresh toutes les 30s)
├── apps-script.gs     # Option B : webhook Google Sheets (sans Node)
└── backend/           # Option A : API Node.js Express
    ├── server.js
    ├── package.json
    └── .env.example
```

---

## 🎯 Comment ça marche (le flux complet)

```
1. Le client va sur ton site (index.html)
2. Il remplit le formulaire → clique "Continuer vers le paiement"
3. Sur paiement.html, il choisit son moyen de paiement :
   - Revolut → cliquer ouvre https://revolut.me/abayoa
   - Wero    → afficher numéro +33 6 68 29 50 77 + référence
   - Virement → afficher IBAN + référence
   - CB      → lien Stripe (à configurer)
4. Il clique "J'ai payé" → la résa est envoyée :
   - À ton API Node.js (mode LIVE) → fichier reservations.json
   - Email auto au client + à toi
5. Tu vas sur admin.html (en favori)
   → tu vois toutes les résa, stats, et tu peux exporter en Excel
```

**Mode DÉMO vs LIVE :**
- Sans backend configuré → les résa sont stockées dans le navigateur (localStorage). Pratique pour tester, mais tu ne vois pas les vraies résa des clients.
- Avec backend configuré → toutes les résa sont centralisées sur ton serveur, visibles dans admin.html en temps réel.

---

## 🚀 Étape 1 — Mettre le site (frontend) sur GitHub Pages

1. Crée un repo GitHub : `brunch-ebene-saveurs`
2. Push `index.html`, `paiement.html`, `confirmation.html`, `admin.html` à la racine
3. **Settings → Pages** → Source : `Deploy from a branch` → branche `main` → `/ (root)` → **Save**
4. Au bout de ~30s, ton site est en ligne sur `https://<ton-pseudo>.github.io/brunch-ebene-saveurs/`

Pour ton admin : mets `https://<ton-pseudo>.github.io/brunch-ebene-saveurs/admin.html` en favori dans ton navigateur. Code admin actuel : **`ebene2026`** (à changer ligne `ADMIN_PWD` dans `admin.html`).

---

## 🛠️ Étape 2 — Déployer le backend Node.js (rend le site dynamique)

### Choisis ton hébergeur (gratuits) :

**Option A — Render.com (le plus simple)**
1. Crée un compte sur [render.com](https://render.com)
2. New → Web Service → Connecte ton repo GitHub
3. Settings :
   - Root directory : `backend`
   - Build command : `npm install`
   - Start command : `npm start`
4. Environment Variables (onglet Environment) :
   - `ADMIN_TOKEN` = ton mot de passe admin
   - `ORGANIZER_EMAIL` = abayoassi@gmail.com
   - `SMTP_USER` + `SMTP_PASS` (voir étape 3)
5. Deploy → tu obtiens une URL type `https://brunch-ebene.onrender.com`

**Option B — Vercel**
1. [vercel.com](https://vercel.com) → New Project → Import ton repo
2. Root directory : `backend`
3. Ajoute les mêmes variables d'env
4. Deploy

**Option C — Tester en local d'abord**
```bash
cd backend
cp .env.example .env   # remplis le fichier
npm install
npm start
# → écoute sur http://localhost:3000
```

### Brancher le frontend au backend

Dans `index.html`, `paiement.html` ET `admin.html`, cherche cette ligne (en haut du `<script>`) :
```js
const API_URL = ''; // ex: 'https://brunch-ebene.onrender.com/api'
```
Remplace par :
```js
const API_URL = 'https://brunch-ebene.onrender.com/api';
```

Push sur GitHub → en quelques secondes, GitHub Pages se met à jour et le site est en mode LIVE.

---

## ✉️ Étape 3 — Activer les emails automatiques

1. Va sur [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. (Active la 2FA si pas déjà fait)
3. Crée un mot de passe d'application → nomme-le "Brunch API"
4. Copie le mot de passe (16 caractères)
5. Dans les variables d'env de ton backend :
   - `SMTP_USER` = ton.email@gmail.com
   - `SMTP_PASS` = le mot de passe à 16 caractères

Désormais, chaque résa déclenche :
- ✉️ Un email au client (avec QR code)
- ✉️ Une notification à abayoassi@gmail.com

---

## 💳 Étape 4 — Brancher les vrais paiements

Pour l'instant, les paiements sont **semi-manuels** : le client fait son virement/Revolut/Wero et clique "J'ai payé". Tu vérifies dans admin.html et passes le statut à "Payé".

C'est largement suffisant pour démarrer. Pour automatiser :

**Revolut Pay** — Tu as déjà ton lien `revolut.me/abayoa` ✅. Pour avoir une auto-validation, il te faut un compte **Revolut Business** + Merchant API. Sinon, vérification manuelle.

**Stripe (CB)** — Crée un compte sur [stripe.com](https://stripe.com), va dans **Payment Links**, crée un lien pour 35€/70€/105€. Remplace le bouton CB dans `paiement.html` par `window.location.href = 'https://buy.stripe.com/...'`.

**Wero** — Pas d'API publique pour l'instant (mai 2026). Vérification manuelle.

**Virement** — Remplace l'IBAN factice dans `paiement.html` par ton vrai IBAN.

---

## 🔒 Avant la mise en ligne — Check-list sécurité

- [ ] Changer `ADMIN_PWD` dans `admin.html` (mettre un mot de passe fort)
- [ ] Définir `ADMIN_TOKEN` côté backend (même valeur que `ADMIN_PWD` pour l'instant)
- [ ] Remplacer l'IBAN factice dans `paiement.html`
- [ ] Tester un parcours complet sur mobile + desktop
- [ ] Mettre `admin.html` en favori dans ton navigateur

---

## 📊 Le dashboard admin

Accès : `tonsite.com/admin.html` (mets-le en favori)

Tu peux :
- Voir toutes les résa en temps réel (refresh auto toutes les 30s en mode LIVE)
- Filtrer par statut (✓ Payé / ⏳ En attente), moyen de paiement, formule
- Rechercher par nom/email/téléphone
- Cliquer sur le statut d'une résa pour la basculer Payé/En attente (mode démo)
- Exporter en CSV/Excel (ouvre directement dans Excel/Numbers)
- Voir les stats : nb résa, places vendues, recettes, taux de remplissage

---

## 🎨 Personnaliser

Les couleurs sont définies en haut de chaque fichier CSS :
- `#f97316` orange principal
- `#fbbf24` jaune/or
- `#16a34a` vert (badges payé, etc.)
- `#0f0a06` fond noir-marron
- `#d4a574` beige texte secondaire

Pour changer la capacité (actuellement 200), cherche `CAPACITY = 200` dans `index.html` et `admin.html`.

---

## 🆘 Besoin d'aide ?

Le site fonctionne déjà tel quel en mode démo — tu peux le mettre sur GitHub Pages maintenant et brancher le backend plus tard. Les vraies résa s'accumuleront dès que tu mettras `API_URL` à jour.

Bon brunch ! 🍽️🌴
