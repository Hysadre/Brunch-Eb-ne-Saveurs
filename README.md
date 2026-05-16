# 🌴 Brunch Ébène & Saveurs — Site de réservation

Site complet de billetterie pour le **Brunch du samedi 22 août 2026 à Ronchin (Lille)**.
Capacité : **200 personnes**. Tarifs : Standard 35€, Duo 70€, Trio 105€.

## 🏗️ Architecture

```
👤 Client visite ton site
        ↓
🌐 GitHub Pages (gratuit)
   → sert les pages HTML/CSS/JS
        ↓
🔧 Render (gratuit)
   → API Node.js / Express (server.js)
   → reçoit les résa, lit/écrit, envoie les emails
        ↓
🗄️ Supabase (gratuit)
   → base Postgres persistante (toutes les résa)
        ↑
📧 Resend (gratuit jusqu'à 3000 mails/mois)
   → envoie les emails de confirmation et validation
```

## 📁 Structure des fichiers

```
brunch-ebene-saveurs/
├── index.html          # Accueil + formulaire de réservation
├── paiement.html       # Page de paiement (Revolut, Wero, Virement)
├── confirmation.html   # Confirmation + billet PNG téléchargeable
├── ticket.html         # Page publique du billet (statut en temps réel)
├── admin.html          # Dashboard organisateur (tableau + analyse)
├── scan.html           # Scanner QR pour les entrées le jour J
├── README.md           # Ce fichier
└── backend/
    ├── server.js       # API Express (Supabase + Resend + check-in)
    ├── package.json    # Dépendances Node
    └── .env.example    # Modèle de variables d'env
```

## 🎯 Comment ça marche (le parcours client)

```
1. Le client va sur https://hysadre.github.io/Brunch-Eb-ne-Saveurs/
2. Choisit sa formule (Standard 1 place / Duo 2 places / Trio 3 places)
3. Remplit le formulaire (nom, email, téléphone, allergies)
4. Continue vers le paiement
5. Choisit Revolut / Wero / Virement
6. Copie la grosse référence orange "EBENE-NOM-XXXX"
7. Fait son paiement avec la référence en note
8. Revient sur la page, clique "✓ J'ai payé"
9. → Voit sa page de confirmation + reçoit un mail
10. La résa apparaît dans ton admin avec statut "⏳ En attente"
11. Tu vois le paiement reçu, tu cliques "✓ Valider"
12. Le client reçoit un 2ème mail "Paiement confirmé !"
13. Le jour J, tu scannes son QR à l'entrée → "✓ ENTRER"
```

## 🚀 Mise en place (déjà faite, pour mémoire)

### 1. GitHub Pages (frontend)
- Repo : `Hysadre/Brunch-Eb-ne-Saveurs`
- Branche `main`, dossier `/`
- URL publique : `https://hysadre.github.io/Brunch-Eb-ne-Saveurs/`

### 2. Render (backend)
- Service : `brunch-eb-ne-saveurs`
- URL API : `https://brunch-eb-ne-saveurs.onrender.com`
- Root directory : `backend/`
- Build : `npm install` · Start : `npm start`
- ⚠️ Le plan **Free spin down après 15 min d'inactivité** : la première résa après une pause peut prendre 30-50s à arriver. Pour éviter, passer au plan Starter ($7/mois) ou utiliser un cron qui ping le service toutes les 10 min.

### 3. Supabase (base de données)
- Projet : `brunch-ebene`
- URL : `https://xwujdlkxzhxpkjzqqvhw.supabase.co`
- Table `reservations` avec colonnes :
  - `bookingId` (text, PK), `prenom`, `nom`, `email`, `telephone`, `message`
  - `ticketId`, `ticketName`, `ticketPrice`, `qty`, `total`, `paymentMethod`
  - `status` (default 'en attente vérification')
  - `timestamp`, `paidAt`, `serverReceivedAt`
  - `entered` (boolean), `enteredAt` (timestamptz)
- RLS activée → backend accède via la `service_role` key (env var)

### 4. Resend (emails)
- Compte : abayoassi@gmail.com
- Sender : `onboarding@resend.dev` (par défaut, suffisant)
- Pour utiliser un domaine perso : acheter un domaine + vérifier dans Resend (optionnel)

## 🔐 Variables d'environnement Render

| Clé | Valeur |
|---|---|
| `SUPABASE_URL` | `https://xwujdlkxzhxpkjzqqvhw.supabase.co` |
| `SUPABASE_SERVICE_KEY` | clé service_role (Supabase → Settings → API) |
| `RESEND_API_KEY` | clé `re_...` (Resend → API Keys) |
| `ADMIN_TOKEN` | `BrunchEbene2026!` (= `ADMIN_PWD` dans admin.html et scan.html) |
| `ORGANIZER_EMAIL` | `abayoassi@gmail.com` |
| `SITE_URL` | `https://hysadre.github.io/Brunch-Eb-ne-Saveurs` (optionnel, défaut OK) |
| `FROM_EMAIL` | (optionnel) `Brunch Ébène & Saveurs <onboarding@resend.dev>` |

## 👨‍💼 Dashboard organisateur

Accès : `https://hysadre.github.io/Brunch-Eb-ne-Saveurs/admin.html`
Code : **`BrunchEbene2026!`** (à mettre en favori)

### Onglet "📋 Réservations"
- **Stats temps réel** : nb résa, places confirmées, recettes, en attente
- **Filtres** : recherche par nom/email/n°, moyen de paiement, statut, formule
- **Actions par ligne** :
  - 👁️ **Voir** → ouvre la page publique du billet (ticket.html)
  - ✓ **Valider** → marque comme payé + envoie le mail de confirmation auto au client
  - ↶ **Annuler** → remet en attente
  - 🗑️ **Supprimer** → suppression définitive (Supabase)
- **N° Résa cliquable** → ouvre aussi la page ticket
- **Export Excel** → télécharge un CSV de toutes les résa

### Onglet "📊 Analyse"
- 📈 Évolution cumulée (places + recettes)
- 🎫 Répartition par formule
- 💳 Répartition par moyen de paiement
- ✅ Taux de paiement (payé vs en attente)
- 📅 Réservations par jour
- Panier moyen, taux de conversion, taux de remplissage

## 📸 Scanner d'entrée (le jour J)

Accès : `https://hysadre.github.io/Brunch-Eb-ne-Saveurs/scan.html`
Aussi accessible depuis l'admin via le bouton vert **"📸 Scanner entrées"**.

### Mise en place
1. Mets-le en favori sur ton tel
2. Encore mieux : ajoute à l'écran d'accueil ("Sur l'écran d'accueil" sur iOS) → tu auras une "vraie app"
3. Le jour J, ouvre, connecte-toi, autorise la caméra

### Utilisation
1. Pointe la caméra vers le QR du client
2. Bip + vibration de confirmation
3. Écran affiche :
   - 🟢 **BILLET VALIDE** → 1 clic "✓ FAIRE ENTRER" → marque comme entré dans Supabase
   - 🔵 **DÉJÀ ENTRÉ** → personne déjà venue (anti-fraude)
   - 🟠 **PAIEMENT EN ATTENTE** → option de forcer si paiement OK entre-temps
   - 🔴 **INTROUVABLE** → faux billet, refuser
4. Log des derniers scans en bas de page (utile pour les contestations)
5. Compteur d'entrées en haut

### Mode manuel
Si la caméra plante ou que le QR est abîmé → "📝 Entrée manuelle" → taper le N° à la main.

## ✉️ Emails automatiques

Le client reçoit 2 mails (envoyés via Resend) :
1. **À la réservation** : "🌴 Ta réservation pour Brunch Ébène & Saveurs"
   - Récap, QR code, lien vers ticket.html
   - Message "⏳ Tu recevras un autre mail dès vérification du paiement"
2. **À la validation par toi** : "✅ Paiement confirmé"
   - QR code, lien vers ticket.html
   - Style vert avec ✓ XL

Toi (organisateur) reçois aussi un mail à chaque résa :
- Sujet : "🎫 Prénom Nom · Xx Formule (XX €)"
- Bouton **"✓ Voir & valider dans le dashboard"** qui ouvre admin.html avec la résa pré-filtrée
- Boutons WhatsApp + Appeler le client

## 🎨 Personnalisation

### Couleurs (en haut de chaque CSS)
- `#f97316` orange principal
- `#fbbf24` jaune / or
- `#16a34a` vert (badge payé)
- `#0f0a06` fond noir-marron
- `#d4a574` beige texte secondaire

### Modifier l'événement
Dans `index.html`, `paiement.html`, `confirmation.html`, `ticket.html`, `server.js` :
- Date, heure, lieu, capacité (`CAPACITY = 200`)
- Tarif unitaire (`UNIT_PRICE = 35`)
- Objectif recettes (`REVENUE_TARGET = 7000` dans admin.html)
- Numéro WhatsApp (cherche `+33 6 68 29 50 77`)
- Numéro Wero (cherche `+33668295077`)

### Changer le mot de passe admin
Dans `admin.html` et `scan.html` → cherche `const ADMIN_PWD = 'BrunchEbene2026!'`.
Et change aussi la variable d'env `ADMIN_TOKEN` sur Render avec la même valeur.

## 🆘 Troubleshooting

### Une résa s'affiche pas dans le dashboard
- Vérifie le mode en haut du dashboard : **LIVE** = OK, **DÉMO** = problème de connexion à Render
- Va sur Render → onglet Logs → cherche les erreurs
- Vérifie que `SUPABASE_URL` et `SUPABASE_SERVICE_KEY` sont bien remplis

### Le client ne reçoit pas son mail
- Vérifie Resend → Logs (sur resend.com)
- Le mail peut être en spam (rare au début, gmail apprend vite)
- Vérifie que `RESEND_API_KEY` est bien sur Render

### "Cannot GET /admin" ou erreur 404 sur un lien
- C'est que le lien pointe vers Render (qui n'héberge que l'API) au lieu de GitHub Pages
- Vérifier la variable `SITE_URL` sur Render

### Render lent au démarrage
- Le plan Free spin down après 15 min d'inactivité
- La première résa après une pause attend 30-50s
- Solutions :
  - Upgrade Starter ($7/mois)
  - Ou utiliser un cron externe (cron-job.org) qui ping `/` toutes les 10 min

## 📊 Stats finales attendues

- Objectif : 200 personnes × 35€ = **7000€**
- Marge sur frais Resend : 0€ (gratuit jusqu'à 3000 mails/mois)
- Marge sur frais Supabase : 0€ (500 MB free, on en utilise <1 MB)
- Marge sur frais Render : 0€ (plan Free)
- Marge sur frais GitHub Pages : 0€
- **TOTAL technique : 0€** 🎉

## 📞 Contact organisateur

**+33 6 68 29 50 77** (WhatsApp + appel) · abayoassi@gmail.com

---

Bon brunch ! 🍽️🌴🎉
