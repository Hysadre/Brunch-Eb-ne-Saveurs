# 🌴 Brunch Ébène & Saveurs — Site de réservation complet

Site de billetterie pour le **Brunch du samedi 22 août 2026 à Ronchin (Lille)**.
Capacité : **200 personnes**. Tarifs : Standard 35€, Duo 70€, Trio 105€.

> ✅ **Prod** : [https://hysadre.github.io/Brunch-Eb-ne-Saveurs/](https://hysadre.github.io/Brunch-Eb-ne-Saveurs/)
> 💰 **Coût total** : 0€ (tout est hébergé sur des plans gratuits)

---

## 🏗️ Architecture

```
        👤 Client
           ↓
   🌐 GitHub Pages (frontend)
   • index.html · paiement.html · confirmation.html · ticket.html
           ↓ ↑ API calls
   🔧 Render (backend Node.js)
   • server.js (Express)
           ↓ ↑
   🗄️ Supabase                    📧 Resend
   • Base Postgres                • Domaine cosmakit.com vérifié
   • Données persistantes         • Envoi vers n'importe quel email
```

**Pourquoi 4 services ?**
- **GitHub Pages** héberge les fichiers HTML/CSS/JS (statique)
- **Render** est nécessaire pour les opérations serveur sécurisées (gestion des clés API, envoi des mails)
- **Supabase** est la base de données persistante (gratuite, sans risque de perdre les données)
- **Resend** envoie les emails (gratuit jusqu'à 3000/mois, domaine perso pour la délivrabilité)

---

## 📁 Structure des fichiers

```
brunch-ebene-saveurs/
├── index.html          # Accueil + formulaire de réservation
├── paiement.html       # Page de paiement (Revolut / Wero / Virement)
├── confirmation.html   # Confirmation après paiement (PDF + lien billet)
├── ticket.html         # Page publique du billet (QR + statut temps réel)
├── admin.html          # 🔒 Dashboard organisateur (tableau + analyse)
├── scan.html           # 🔒 Scanner QR pour les entrées le jour J
├── README.md           # Ce fichier
└── backend/
    ├── server.js       # API Express (Supabase + Resend + check-in)
    ├── package.json
    └── .env.example
```

---

## 🎯 Le parcours complet

### 🧍 Côté client (avant l'événement)

1. Le client va sur **index.html** (https://hysadre.github.io/Brunch-Eb-ne-Saveurs/)
2. Il voit l'événement, la capacité actuelle, et choisit sa formule (Standard / Duo / Trio)
3. Le badge **🔥 "Le + populaire"** apparaît dynamiquement sur la formule la plus choisie
4. Il remplit ses infos (prénom, nom, email, téléphone, allergies)
5. Il **clique sur "Conditions générales"** → la popup CGU s'ouvre (avec politique de remboursement)
6. Il coche les CGU (la case devient **verte avec ✓ animé**)
7. Il continue vers **paiement.html**
8. La référence unique de sa réservation est affichée en GROS sur fond orange (ex: `EBENE-NOM-XXXX`)
9. Il choisit son moyen de paiement : **Revolut** (lien direct), **Wero** (numéro à copier), ou **Virement** (IBAN à copier)
10. Il copie la référence et fait son paiement avec la référence en note
11. Il revient sur le site et clique **"✓ J'ai payé"**
12. Sa réservation est enregistrée dans Supabase avec statut "⏳ En attente"
13. Il arrive sur **confirmation.html** :
    - QR code scannable
    - Bouton **"🎫 Voir ma réservation en ligne"** → ouvre **ticket.html**
    - Bouton **"📥 Télécharger mon billet (image)"** → enregistre en PNG dans Photos (mobile) ou téléchargement direct (desktop)
14. Il reçoit un **mail automatique** depuis `brunchebenesaveurs@cosmakit.com` :
    - Gros QR sur fond blanc
    - Numéro de réservation
    - Lien direct vers ticket.html
    - Boutons WhatsApp / Appeler

### 🧍 Côté client (après validation organisateur)

15. L'organisateur reçoit la résa dans son dashboard et clique **"✓ Valider"** quand il voit le paiement reçu
16. Le client reçoit un **2e mail** : "✅ Paiement confirmé !" avec le QR mis à jour
17. Sa page ticket.html montre maintenant "✅ BILLET VALIDÉ" en vert

### 👔 Côté organisateur

L'organisateur accède à **admin.html** (mot de passe : `BrunchEbene2026!`).

**Onglet 📋 Réservations :**
- **Compte à rebours** en temps réel jusqu'au 22 août 2026
- **5 stats globales** : Réservations · Places confirmées · 🚪 Présents · Recettes · En attente
- **Filtres** : recherche · paiement · statut · formule · archivées
- **Tableau** avec actions par ligne :
  - 👁️ **Voir** : ouvre la page publique du billet
  - ✓ **Valider** : marque comme payé + envoie le mail de validation auto au client
  - 🗃️ **Annuler** : ouvre une modale → choisis le motif → archive la résa (n'est plus visible par défaut)
  - 🗑️ **Supprimer** : suppression définitive (avec confirmation)
- **Ligne TOTAL** en bas avec sommes : places, recettes, présents
- **N° de résa cliquable** → ouvre la page publique
- **Auto-refresh toutes les 10s** + refresh quand on revient sur l'onglet
- **Notif toast** "🎫 +X nouvelle réservation"
- **Export Excel** en CSV

**Onglet 📊 Analyse :**
- 5 stats détaillées : recettes confirmées · potentielles · panier moyen · remplissage · conversion
- 📈 Évolution cumulée (places + recettes)
- 🎫 Répartition par formule (donut)
- 💳 Moyens de paiement (donut)
- ✅ Taux de paiement (donut)
- 📅 Réservations par jour (barres)

### 📸 Le jour J

L'organisateur ouvre **scan.html** (même mot de passe).
Accessible aussi via le gros bouton **"📸 Scanner entrées"** dans l'admin.

**Le déroulé :**
1. Tu cliques **"🎥 Démarrer la caméra"** (iOS exige un clic pour autoriser)
2. La caméra s'allume → tu scannes le QR du client
3. **Bip + vibration** automatique :
   - ✅ **Bip aigu joyeux** = billet valide → tu cliques "FAIRE ENTRER" → le compteur s'incrémente
   - 🔵 **Mélodie descendante** = déjà entré (anti-fraude)
   - 🟠 **Tons hésitants** = paiement en attente (à vérifier)
   - 🔴 **Bzzz grave** = introuvable ou résa archivée
4. **Multi-scan** : un Trio (3 places) peut être scanné 3 fois :
   - 1er scan → "1/3 ENTRÉ" + bouton "✓ FAIRE ENTRER UNE PLACE DE PLUS"
   - 2e scan → "2/3 ENTRÉ"
   - 3e scan → "3/3 COMPLET"
   - 4e scan → "TOUS DÉJÀ ENTRÉS"
5. Compteur **"DERNIERS SCANS"** + log persistant des entrées
6. Mode **"📝 Entrée manuelle"** si la caméra plante

---

## 🚀 Configuration (déjà faite, pour mémoire)

### 1. GitHub Pages (frontend)
- Repo : `Hysadre/Brunch-Eb-ne-Saveurs`
- Branche `main` · dossier `/`
- URL : `https://hysadre.github.io/Brunch-Eb-ne-Saveurs/`

### 2. Render (backend)
- Service Web : `brunch-eb-ne-saveurs`
- URL API : `https://brunch-eb-ne-saveurs.onrender.com`
- Root directory : `backend/`
- Build : `npm install` · Start : `npm start`
- ⚠️ Le plan **Free** spin down après 15 min d'inactivité → le 1er appel après pause prend 30-50s (cold start)

### 3. Supabase (base de données)
- Projet : `brunch-ebene`
- URL : `https://xwujdlkxzhxpkjzqqvhw.supabase.co`
- Table `reservations` avec colonnes :
  - Réservation : `bookingId` (PK), `prenom`, `nom`, `email`, `telephone`, `message`
  - Billet : `ticketId`, `ticketName`, `ticketPrice`, `qty`, `total`
  - Paiement : `paymentMethod`, `status`, `paidAt`
  - Check-in : `entered`, `enteredAt`, `enteredCount`
  - Archive : `archived`, `archivedAt`, `cancelReason`
  - Accompagnants : `accompagnants`
  - Timestamps : `timestamp`, `serverReceivedAt`
- RLS activée → backend accède via la `service_role` key

### 4. Resend (emails)
- Compte créé · domaine `cosmakit.com` vérifié
- Sender : `brunchebenesaveurs@cosmakit.com`
- Free tier : 3000 emails/mois

---

## 🔐 Variables d'environnement Render

| Clé | Valeur |
|---|---|
| `ADMIN_TOKEN` | `BrunchEbene2026!` (= `ADMIN_PWD` dans admin.html et scan.html) |
| `SUPABASE_URL` | `https://xwujdlkxzhxpkjzqqvhw.supabase.co` |
| `SUPABASE_SERVICE_KEY` | clé service_role (Supabase → Settings → API) |
| `RESEND_API_KEY` | clé `re_...` (Resend → API Keys) |
| `FROM_EMAIL_NAME` | `Brunch Ébène & Saveurs` |
| `FROM_EMAIL_ADDR` | `brunchebenesaveurs@cosmakit.com` |
| `ORGANIZER_EMAIL` | `abayo.contact@gmail.com` *(reçoit les notifs)* |
| `SITE_URL` | `https://hysadre.github.io/Brunch-Eb-ne-Saveurs` *(optionnel)* |

---

## ✉️ Les 2 emails automatiques

**📧 Mail 1 — À la création de la résa** : "🌴 Ta réservation pour Brunch Ébène & Saveurs"
- Gros QR sur fond blanc + numéro
- Récap (formule, places, total)
- Lien vers la page publique du billet
- Mention "⏳ Tu recevras un autre mail dès vérification du paiement"

**📧 Mail 2 — À la validation par l'organisateur** : "✅ Paiement confirmé !"
- Gros QR sur fond blanc + numéro (mis à jour)
- Statut validé
- Lien vers la page publique du billet
- Boutons WhatsApp / Appeler

**📧 Mail organisateur** (sur `abayo.contact@gmail.com`)
- Sujet : "🎫 [Prénom] [Nom] · X× [Formule] (Y €)"
- Toutes les infos client (mail, tel cliquables)
- Bouton **"✓ Voir & valider dans le dashboard"** → ouvre admin.html avec la résa pré-filtrée
- Boutons WhatsApp / Appeler le client

---

## 🎨 Personnalisation

### Couleurs (en haut de chaque CSS)
- `#f97316` orange principal
- `#fbbf24` jaune / or
- `#16a34a` vert (badge payé)
- `#0f0a06` fond noir-marron
- `#d4a574` beige texte secondaire

### Modifier l'événement
Cherche et remplace dans `index.html`, `paiement.html`, `confirmation.html`, `ticket.html`, `server.js` :
- Date, heure, lieu
- `CAPACITY = 200` dans index.html et admin.html
- `UNIT_PRICE = 35` dans index.html
- `REVENUE_TARGET = 7000` dans admin.html
- Numéro WhatsApp (cherche `+33 6 68 29 50 77`)

### Changer le mot de passe admin
1. Modifier `const ADMIN_PWD = '...'` dans `admin.html` ET `scan.html`
2. Mettre la même valeur dans `ADMIN_TOKEN` sur Render
3. Push + redéployer

---

## 🆘 Troubleshooting

### "Cannot GET /admin" en cliquant sur le lien dans le mail organisateur
→ La variable `SITE_URL` n'est pas correcte sur Render (doit pointer vers GitHub Pages, pas Render)

### Le client ne reçoit pas son mail
1. Vérifier les **logs Render** → tu dois voir `POST /api/reservations` puis pas d'erreur
2. Si erreur Resend `403 "domain not verified"` → vérifier que `FROM_EMAIL_ADDR=brunchebenesaveurs@cosmakit.com` (pas un Gmail)
3. Vérifier le **dossier spam** du destinataire
4. Vérifier le **dashboard Resend** (Emails section) pour voir le statut d'envoi

### Une résa n'apparaît pas dans le dashboard
1. Si mode "DÉMO (localStorage)" en haut → l'API Render est inaccessible → check Render Logs
2. Si mode "LIVE" mais vide → Render est probablement en cold start (50s) → clique Actualiser après 1 min
3. Vérifier que `SUPABASE_URL` et `SUPABASE_SERVICE_KEY` sont bien sur Render

### Render lent au démarrage
- Plan Free spin down après 15 min d'inactivité
- 1ère résa après pause → attend 30-50s
- Solutions : upgrade Render Starter ($7/mois) OU cron externe (cron-job.org) qui ping `/` toutes les 10 min

### Le scan ne se synchronise pas avec le dashboard
- Le dashboard refresh toutes les 10s + refresh auto au focus de l'onglet
- Si toujours pas synchro : clique "Actualiser" manuellement
- Vérifier les colonnes Supabase : `enteredCount` doit exister

---

## 📊 Coûts récap

| Service | Coût |
|---|---|
| GitHub Pages | 0€ |
| Render (Free) | 0€ |
| Supabase (Free) | 0€ |
| Resend (3000 mails/mois) | 0€ |
| Domaine cosmakit.com | Déjà payé |
| **TOTAL** | **0€** 🎉 |

---

## 📞 Contact organisateur

**+33 6 68 29 50 77** (WhatsApp + appel)
**abayo.contact@gmail.com** (notifs de résa)

---

Bon brunch ! 🍽️🌴🎉
