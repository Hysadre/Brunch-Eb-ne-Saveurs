# 🌴 Guide d'utilisation — Brunch Ébène & Saveurs

> **Comment utiliser le site de réservation, de la résa au check-in le jour J.**

---

## 📑 Sommaire

1. [Le parcours client](#1-le-parcours-client)
2. [Côté organisateur — Dashboard admin](#2-côté-organisateur--dashboard-admin)
3. [Le jour J — Scanner les entrées](#3-le-jour-j--scanner-les-entrées)
4. [Annuler / archiver une réservation](#4-annuler--archiver-une-réservation)
5. [Exporter en Excel](#5-exporter-en-excel)
6. [FAQ et dépannage](#6-faq-et-dépannage)

---

## 1. Le parcours client

### 1.1 Arrivée sur le site

Le client arrive sur **https://hysadre.github.io/Brunch-Eb-ne-Saveurs/**. Il voit la page d'accueil avec l'événement (date, lieu, capacité).

[INSÉRER CAPTURE : page d'accueil sur mobile — hero avec titre, date, lieu]

### 1.2 Choix de la formule

3 formules possibles :
- 🎫 **Standard** — 35€ pour 1 place
- 👥 **Duo** — 70€ pour 2 places
- 👨‍👩‍👧 **Trio** — 105€ pour 3 places

Le badge **🔥 "Le + populaire"** apparaît automatiquement sur la formule la plus choisie (basé sur la base de données en temps réel).

[INSÉRER CAPTURE : section "Choisis ta formule" avec les 3 cards]

### 1.3 Le formulaire

Le client remplit prénom, nom, email, téléphone, et éventuellement ses allergies / régime alimentaire.

[INSÉRER CAPTURE : formulaire rempli]

### 1.4 Conditions générales

Avant de continuer, le client doit cocher les CGU. En cliquant sur **"conditions générales"**, une **popup s'ouvre** avec toutes les conditions (notamment la politique de remboursement jusqu'à 10j avant l'événement).

[INSÉRER CAPTURE : popup CGU ouverte]

Une fois acceptées, la case devient verte avec ✓ animé.

[INSÉRER CAPTURE : checkbox cochée (état vert avec ✓)]

### 1.5 La page de paiement

Le client arrive sur la page de paiement. **Une grosse référence orange unique** est affichée en haut (format : `EBENE-NOM-XXXX`).

[INSÉRER CAPTURE : page paiement avec grosse référence orange en haut]

3 moyens de paiement :
- 💳 **Revolut** (lien direct + référence à indiquer)
- 📱 **Wero** (numéro à copier + référence)
- 🏦 **Virement SEPA** (IBAN à copier + référence)

[INSÉRER CAPTURE : les 3 options de paiement]

Le client copie sa référence, fait son paiement, puis revient cliquer **"✓ J'ai payé"**.

### 1.6 La confirmation

Après validation, le client arrive sur la page de confirmation avec :
- ✓ Statut "Réservation enregistrée"
- 📷 QR code à présenter à l'entrée
- 🎫 Bouton **"Voir ma réservation en ligne"** (vert)
- 📥 Bouton **"Télécharger mon billet (image)"** (orange)

[INSÉRER CAPTURE : page confirmation avec billet électronique + QR + boutons]

### 1.7 Le mail de confirmation

Le client reçoit dans la minute un email depuis `brunchebenesaveurs@cosmakit.com` avec :
- Le QR sur fond blanc (énorme, visible direct)
- Le numéro de réservation
- Le lien vers sa page billet
- Les boutons WhatsApp et Appel

[INSÉRER CAPTURE : mail de confirmation reçu]

### 1.8 La page publique du billet

À tout moment, le client peut revenir sur sa page billet en cliquant le lien du mail. Cette page affiche **le statut en temps réel** :
- ⏳ Orange = paiement en attente de validation
- ✅ Vert = paiement confirmé

[INSÉRER CAPTURE : page ticket.html — version "en attente"]

[INSÉRER CAPTURE : page ticket.html — version "validé"]

---

## 2. Côté organisateur — Dashboard admin

### 2.1 Connexion

Accède au dashboard via **https://hysadre.github.io/Brunch-Eb-ne-Saveurs/admin.html**

Mot de passe : `BrunchEbene2026!`

[INSÉRER CAPTURE : écran de login admin]

### 2.2 Vue d'ensemble

Une fois connecté, tu vois :
- Le **compte à rebours** en haut (J-X jours jusqu'au 22 août 2026)
- 5 **stats globales** (Réservations · Places confirmées · Présents · Recettes · En attente)
- Les **onglets** Réservations / Analyse
- Le **tableau** détaillé avec toutes les résa

[INSÉRER CAPTURE : vue complète du dashboard avec données]

### 2.3 Les stats en détail

[INSÉRER CAPTURE : zoom sur les 5 cartes de stats]

- **Réservations** : nombre total + combien aujourd'hui
- **Places confirmées** : nombre / capacité (200) + restantes
- **🚪 Présents** : combien sont déjà entrés / combien sont attendus (à utiliser le jour J)
- **Recettes** : total encaissé / objectif (7000€)
- **En attente** : nombre de résa en attente de validation paiement

### 2.4 Les filtres

Tu peux filtrer le tableau par :
- 🔍 Recherche (nom, email, n° résa)
- 💳 Moyen de paiement
- ⏳ Statut (payé / en attente)
- 🎫 Formule (Standard / Duo / Trio / Groupe)
- 📦 Archivées (par défaut cachées)

[INSÉRER CAPTURE : barre des filtres]

### 2.5 Valider une réservation

Quand tu reçois le paiement Revolut/Wero/Virement :
1. Tu vas dans ton app bancaire
2. Tu identifies la référence (ex: `EBENE-DUPONT-XXX`)
3. Sur le dashboard, tu cliques **"✓ Valider"** sur la ligne correspondante
4. → Le client reçoit AUTOMATIQUEMENT un mail "✅ Paiement confirmé"
5. → Sa page billet passe en vert

[INSÉRER CAPTURE : bouton "✓ Valider" mis en évidence sur une ligne]

[INSÉRER CAPTURE : mail "✅ Paiement confirmé" reçu par le client]

### 2.6 L'onglet Analyse

Cliquez sur **📊 Analyse** pour voir :
- 📈 Évolution cumulée (places + recettes)
- 🎫 Répartition par formule (donut)
- 💳 Répartition par moyen de paiement
- ✅ Taux de paiement
- 📅 Réservations par jour

[INSÉRER CAPTURE : onglet Analyse avec les graphiques]

### 2.7 Le mail de notification organisateur

À chaque nouvelle résa, tu reçois un mail sur **abayo.contact@gmail.com** avec :
- Toutes les infos client
- La référence et le montant
- Un bouton **"✓ Voir & valider dans le dashboard"** qui ouvre admin.html directement sur la résa concernée
- Des boutons WhatsApp / Appeler pour contacter le client

[INSÉRER CAPTURE : mail organisateur avec bouton "Voir & valider"]

---

## 3. Le jour J — Scanner les entrées

### 3.1 Accès au scanner

Depuis le dashboard, clique sur le **gros bouton vert "📸 Scanner entrées"** en haut.

[INSÉRER CAPTURE : bouton "Scanner entrées" dans le dashboard]

Ou accède directement : **https://hysadre.github.io/Brunch-Eb-ne-Saveurs/scan.html**

💡 **Astuce** : mets cette page en favori sur ton tel, ou ajoute-la à l'écran d'accueil pour avoir une "vraie app".

### 3.2 Démarrer la caméra

Clique sur **"🎥 Démarrer la caméra"**. iOS / Android te demande l'autorisation → Oui.

[INSÉRER CAPTURE : page scanner avant démarrage caméra]

[INSÉRER CAPTURE : caméra active en train de scanner]

### 3.3 Scanner un billet

Pointe la caméra vers le QR du client. **Automatiquement** :
- 🔔 Bip + 📳 vibration (différents selon le résultat)
- Une popup s'affiche avec le résultat

**4 cas possibles :**

#### ✅ Billet valide
[INSÉRER CAPTURE : popup verte "BILLET VALIDE"]
→ Clique **"✓ FAIRE ENTRER"** pour valider l'entrée.

#### 🔢 Multi-scan (Duo / Trio)
Pour un Duo (2 places), tu peux scanner 2 fois :
- 1er scan → "1/2 ENTRÉ"
- 2e scan → "2/2 COMPLET"

[INSÉRER CAPTURE : popup avec "1/2 ENTRÉ"]

[INSÉRER CAPTURE : popup avec "2/2 COMPLET"]

#### 🔵 Déjà entré
Si toutes les places sont déjà comptabilisées → la popup devient bleue "TOUS DÉJÀ ENTRÉS" (anti-fraude).

[INSÉRER CAPTURE : popup bleue "DÉJÀ ENTRÉ"]

#### 🟠 Paiement en attente
Si la résa n'est pas encore validée → popup orange. Tu peux soit forcer si tu sais que c'est OK, soit fermer.

[INSÉRER CAPTURE : popup orange "PAIEMENT EN ATTENTE"]

#### 🔴 Introuvable
Si le QR ne correspond à aucune résa → popup rouge "INTROUVABLE" (faux billet).

[INSÉRER CAPTURE : popup rouge "INTROUVABLE"]

### 3.4 L'historique des scans

En bas de la page scanner, tu vois les **derniers scans** avec timestamp + nom. Le compteur en haut indique le total d'entrées validées.

[INSÉRER CAPTURE : section "Derniers scans" avec quelques entrées]

### 3.5 Entrée manuelle (en cas de panne caméra)

Si la caméra plante ou le QR est abîmé, déplie **"📝 Entrée manuelle"** et tape le numéro de réservation (ex: `EBENE-NOM-XXXX`).

[INSÉRER CAPTURE : champ entrée manuelle]

---

## 4. Annuler / archiver une réservation

### 4.1 Quand utiliser ça ?

- 🚫 Le client annule sa venue
- 💸 Paiement jamais reçu
- 🔄 Doublon
- ❌ Erreur de saisie

### 4.2 Comment archiver

Sur le dashboard, dans la colonne **Actions**, clique sur **"🗃️ Annuler"**.

[INSÉRER CAPTURE : ligne avec bouton "Annuler" mis en évidence]

Une **modale s'ouvre** te demandant le motif :
- ☐ Désistement du client
- ☐ Impayé / Paiement non reçu
- ☐ Doublon
- ☐ Erreur de saisie
- ☐ Autre (champ libre)

[INSÉRER CAPTURE : modale d'archivage avec les choix de motif]

Clique **"🗃️ Archiver"** → la résa disparaît du tableau actif. Elle est désormais dans les archives.

### 4.3 Voir les archives

Change le filtre **"Actives uniquement"** en **"Archivées uniquement"** ou **"Tout voir"**.

[INSÉRER CAPTURE : filtre "Archivées uniquement" + lignes archivées avec badge orange]

### 4.4 Restaurer une résa archivée

Sur une ligne archivée, clique **"↩ Restaurer"** → elle revient dans les actives.

[INSÉRER CAPTURE : bouton "Restaurer" sur ligne archivée]

### 4.5 Supprimer définitivement

Si tu veux supprimer **complètement** une résa (pas juste l'archiver), clique **🗑️**. Une confirmation s'ouvre, puis la résa est effacée à jamais de la base.

⚠️ **Attention** : suppression = définitive, irrécupérable. Préfère "Archiver" dans le doute.

[INSÉRER CAPTURE : modale de suppression définitive]

---

## 5. Exporter en Excel

Sur le dashboard, clique sur **"📥 Export Excel"** en haut à droite. Un fichier CSV est téléchargé avec toutes les réservations (sauf archivées si filtre actif).

[INSÉRER CAPTURE : bouton Export Excel en haut du dashboard]

Le CSV contient :
- N° Résa · Date · Prénom · Nom · Email · Téléphone
- Formule · Places · Prix unitaire · Total
- Moyen de paiement · Allergies / Message · Statut

[INSÉRER CAPTURE : fichier CSV ouvert dans Excel/Numbers]

---

## 6. FAQ et dépannage

### Le client ne reçoit pas son mail
1. Vérifie le **dossier spam** du client
2. Va sur **resend.com → Emails** → cherche le mail → vérifie son statut
3. Si statut "delivered" → c'est arrivé, c'est dans les spams
4. Si statut "failed" → bouge

[INSÉRER CAPTURE : dashboard Resend avec liste des mails]

### Le dashboard est vide alors qu'il y a des résa
- Render (le serveur) met **30-50 secondes à se réveiller** s'il a dormi 15+ min
- Patiente et clique sur "↻ Actualiser"
- Vérifie en haut que tu es bien en mode **🟢 LIVE** (pas DÉMO)

[INSÉRER CAPTURE : pastille LIVE / DEMO en haut du dashboard]

### Mon QR ne scanne pas
- Vérifie que la caméra est bien allumée (clic sur "🎥 Démarrer la caméra")
- Demande au client de **monter la luminosité** de son écran
- En dernier recours, **entrée manuelle** : tape le numéro de résa à la main

### Une personne a perdu son mail
- Demande-lui son **email** ou son **nom**
- Cherche sur le dashboard → tu la trouves
- Renvoie-lui le lien : `https://hysadre.github.io/Brunch-Eb-ne-Saveurs/ticket.html?id=EBENE-XXX` (avec son numéro)

[INSÉRER CAPTURE : recherche d'une résa dans le dashboard]

---

## 📞 Besoin d'aide ?

**Numéro de support technique** : +33 6 68 29 50 77 (WhatsApp)
**Mail organisateur** : abayo.contact@gmail.com

---

Bon brunch ! 🍽️🌴🎉
