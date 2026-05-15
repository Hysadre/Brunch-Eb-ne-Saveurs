# 🎫 Billeterie en ligne — Guide de déploiement

Site de billeterie 100% statique, mobile-first, prêt pour **GitHub Pages**.
Tout le parcours fonctionne en démo dès maintenant : formulaire → paiement (Revolut, Wero, virement, CB) → confirmation + billet → dashboard admin avec export Excel.

## 📁 Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Page d'accueil + formulaire de réservation |
| `paiement.html` | Page de paiement (Revolut, Wero, virement SEPA, CB) |
| `confirmation.html` | Confirmation + billet électronique avec QR code |
| `admin.html` | Dashboard privé (mot de passe **`1234`** — à changer !) |
| `apps-script.gs` | Code à coller dans Google Apps Script pour stocker les résa dans Google Sheets |

Tous les fichiers sont autonomes (HTML + CSS + JS inline). Pas de framework, pas de build.

---

## 🚀 Étape 1 — Mettre en ligne sur GitHub Pages (gratuit)

1. **Crée un nouveau repo** sur github.com → `billeterie` (ou le nom que tu veux)
2. **Glisse les 4 fichiers HTML** dans le repo (ou push depuis ton terminal)
3. Va dans **Settings → Pages**
4. **Source** : `Deploy from a branch` → branche `main` → dossier `/ (root)` → Save
5. Au bout de 30 secondes, ton site est en ligne sur :
   `https://<ton-username>.github.io/billeterie/`

Pour un nom de domaine perso (ex. `mes-soirees.fr`), ajoute-le dans **Settings → Pages → Custom domain** et configure le DNS (CNAME vers `<username>.github.io`).

---

## 🗂️ Étape 2 — Brancher Google Sheets (stockage des réservations)

Pour que les vraies réservations soient automatiquement enregistrées dans un Google Sheets que **toi seul** peux voir :

### 2.1 — Créer le Google Sheets
1. Va sur [sheets.google.com](https://sheets.google.com) → nouveau classeur
2. Nomme la première feuille `Réservations`
3. Mets ces colonnes en ligne 1 :
   ```
   N° Résa | Date | Prénom | Nom | Email | Téléphone | Billet | Qté | Total | Paiement | Message | Statut
   ```

### 2.2 — Créer le webhook Apps Script
1. Dans le Sheets : **Extensions → Apps Script**
2. Colle le contenu de `apps-script.gs` (fourni)
3. **Déployer → Nouveau déploiement**
   - Type : `Application Web`
   - Exécuter en tant que : **Moi**
   - Accès : **Tout le monde** (anonyme)
4. Copie l'URL de déploiement (ressemble à `https://script.google.com/macros/s/AKf.../exec`)

### 2.3 — Connecter le site
Dans `paiement.html`, cherche la ligne :
```js
// En prod : appel API vers Apps Script pour enregistrer + déclencher email
```
Remplace-la par :
```js
fetch('TON_URL_APPS_SCRIPT_ICI', {
  method: 'POST',
  mode: 'no-cors',
  body: JSON.stringify(booking)
});
```

Désormais, chaque réservation payée arrive en temps réel dans ton Sheets. 🎉

---

## 💳 Étape 3 — Brancher les vrais paiements

### Option A — Revolut Pay (recommandé pour Revolut)
- Compte **Revolut Business** requis
- [developer.revolut.com](https://developer.revolut.com) → Merchant API
- Génère un lien de paiement par réservation côté Apps Script
- Redirige l'utilisateur vers ce lien

### Option B — Wero
- Wero ne propose pas encore d'API publique pour e-commerce (mai 2026)
- En attendant : afficher ton numéro Wero + référence (comme dans la démo)
- Vérifier manuellement les paiements reçus

### Option C — Stripe (carte bancaire + Apple/Google Pay)
- Le plus simple pour la CB
- Crée un compte sur [stripe.com](https://stripe.com)
- Utilise **Stripe Checkout** (juste un lien à générer côté Apps Script)
- Stripe gère tout : 3D Secure, reçu, remboursements

### Option D — Lydia / PayPal
- Liens de paiement simples à coller
- Pas d'API à intégrer, mais validation manuelle

### Option E — Le plus simple pour démarrer : virement + Wero manuels
Garde la page de paiement telle quelle, vérifie les paiements reçus le matin, et mets à jour le statut dans le Sheets. Suffisant pour des soirées privées avec <500 invités.

---

## ✉️ Étape 4 — Envoi automatique de l'email de confirmation

Dans `apps-script.gs`, la fonction `doPost` envoie déjà un email avec **GmailApp** à chaque nouvelle réservation. C'est gratuit (limite : 100 emails/jour avec un compte Gmail perso, 1500/jour avec Google Workspace).

L'email contient :
- Récap de la résa
- Numéro de réservation
- Infos pratiques de l'événement

Pour ajouter un QR code dans l'email : utilise `https://api.qrserver.com/v1/create-qr-code/?data=XXX&size=200x200`

---

## 🔒 Étape 5 — Sécuriser l'admin

Le mot de passe `1234` dans `admin.html` est **côté client** = visible par n'importe qui inspectant le code. C'est OK pour une démo, **PAS pour la prod**.

**Pour la prod**, deux options :

**Option simple** — Ne pas mettre `admin.html` sur GitHub Pages. Garde-le local sur ton ordi, et change la source de données pour qu'il pointe vers ton Google Sheets via Apps Script (avec auth Google).

**Option robuste** — Utilise [Cloudflare Access](https://www.cloudflare.com/zero-trust/products/access/) (gratuit jusqu'à 50 users) : tu te connectes via ton Google perso, personne d'autre ne voit l'admin.

---

## 🎨 Personnalisation rapide

Dans `index.html` ligne ~155 → modifie :
- Le titre de l'événement (`<h1 class="hero-title">`)
- La date, le lieu, la capacité
- Les types de billets et leurs prix (data-id, data-price)

Les couleurs : cherche `#8b5cf6` (violet principal) et `#ec4899` (rose) → remplace par tes couleurs de marque.

---

## ✅ Check-list de mise en prod

- [ ] Modifier le contenu de l'événement (titre, date, lieu, billets, prix)
- [ ] Créer le Google Sheets + déployer l'Apps Script
- [ ] Remplacer l'URL Apps Script dans `paiement.html`
- [ ] Modifier le **mot de passe admin** dans `admin.html` (ligne `const ADMIN_PWD`)
- [ ] Remplacer les coordonnées de paiement (IBAN, numéro Wero, lien Revolut)
- [ ] Push sur GitHub + activer GitHub Pages
- [ ] Tester un parcours complet sur mobile et desktop

Bonne soirée ! 🎉
