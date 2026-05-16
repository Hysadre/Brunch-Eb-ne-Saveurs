const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, LevelFormat, AlignmentType, BorderStyle, WidthType,
  ShadingType, PageBreak, ExternalHyperlink, PageOrientation
} = require('docx');

// === Helpers ===
function p(opts) { return new Paragraph(opts); }
function t(text, opts = {}) { return new TextRun({ text, ...opts }); }

function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [t(text)] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [t(text)] });
}
function h3(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_3, children: [t(text)] });
}
function para(text) {
  return new Paragraph({ children: [t(text)], spacing: { after: 120 } });
}
function richPara(runs) {
  return new Paragraph({ children: runs, spacing: { after: 120 } });
}
function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: 'bullets', level },
    children: [t(text)],
  });
}
function numbered(text) {
  return new Paragraph({
    numbering: { reference: 'numbers', level: 0 },
    children: [t(text)],
  });
}

// Placeholder pour capture — gros encadré gris clair, visible
function placeholder(description) {
  const border = { style: BorderStyle.DASHED, size: 6, color: 'F97316' };
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: { top: border, bottom: border, left: border, right: border },
            width: { size: 9360, type: WidthType.DXA },
            shading: { fill: 'FFF7ED', type: ShadingType.CLEAR },
            margins: { top: 240, bottom: 240, left: 240, right: 240 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [t('📷 [INSÉRER CAPTURE]', { bold: true, color: 'EA580C', size: 22 })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [t(description, { italics: true, color: '7C2D12', size: 20 })],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function spacer() {
  return new Paragraph({ children: [t('')], spacing: { after: 200 } });
}

function callout(emoji, text, color = 'FBBF24') {
  return new Paragraph({
    children: [
      t(emoji + '  ', { bold: true, size: 22 }),
      t(text, { color: '1A1108' }),
    ],
    shading: { fill: 'FEF3C7', type: ShadingType.CLEAR },
    border: {
      left: { style: BorderStyle.SINGLE, size: 18, color: color, space: 8 },
    },
    spacing: { after: 200, before: 100 },
  });
}

// === Construction du document ===
const children = [];

// COUVERTURE
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  children: [t('🌴', { size: 80 })],
  spacing: { before: 800, after: 400 },
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  children: [t('Guide d’utilisation', { bold: true, size: 56, color: 'F97316' })],
  spacing: { after: 100 },
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  children: [t('Brunch ', { bold: true, size: 36 }), t('Ébène & Saveurs', { bold: true, size: 36, italics: true, color: 'FBBF24' })],
  spacing: { after: 600 },
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  children: [t('Comment utiliser le site de réservation, de la résa au check-in le jour J.', { italics: true, color: '6B6B80', size: 24 })],
  spacing: { after: 400 },
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  children: [t('📅 Samedi 22 août 2026 — 12h00 — Salle de Ronchin, Lille', { size: 22, color: 'EA580C' })],
  spacing: { after: 200 },
}));
children.push(new Paragraph({ children: [new PageBreak()] }));

// === SECTION ACCÈS RAPIDE ===
children.push(h1('🔗 Vos 3 accès'));
children.push(para('Tous les liens nécessaires pour utiliser le site. Pense à les mettre en favoris dans ton navigateur (ou en raccourci sur l’écran d’accueil de ton téléphone).'));
children.push(spacer());

// Card 1 — Client
children.push(new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [9360],
  rows: [new TableRow({ children: [new TableCell({
    borders: { top: { style: BorderStyle.SINGLE, size: 8, color: '16A34A' }, bottom: { style: BorderStyle.SINGLE, size: 8, color: '16A34A' }, left: { style: BorderStyle.SINGLE, size: 16, color: '16A34A' }, right: { style: BorderStyle.SINGLE, size: 8, color: '16A34A' } },
    width: { size: 9360, type: WidthType.DXA },
    shading: { fill: 'F0FDF4', type: ShadingType.CLEAR },
    margins: { top: 200, bottom: 200, left: 300, right: 300 },
    children: [
      new Paragraph({ children: [t('🧍 Accès client', { bold: true, size: 28, color: '16A34A' })], spacing: { after: 100 } }),
      new Paragraph({ children: [t('La page de réservation publique — à partager avec tes invités.', { color: '1A1108', italics: true })], spacing: { after: 120 } }),
      new Paragraph({ children: [new ExternalHyperlink({
        children: [t('https://hysadre.github.io/Brunch-Eb-ne-Saveurs/', { color: '2563EB', bold: true, font: 'Courier New', size: 22, underline: {} })],
        link: 'https://hysadre.github.io/Brunch-Eb-ne-Saveurs/',
      })] }),
    ],
  })] })],
}));
children.push(spacer());

// Card 2 — Admin
children.push(new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [9360],
  rows: [new TableRow({ children: [new TableCell({
    borders: { top: { style: BorderStyle.SINGLE, size: 8, color: 'F97316' }, bottom: { style: BorderStyle.SINGLE, size: 8, color: 'F97316' }, left: { style: BorderStyle.SINGLE, size: 16, color: 'F97316' }, right: { style: BorderStyle.SINGLE, size: 8, color: 'F97316' } },
    width: { size: 9360, type: WidthType.DXA },
    shading: { fill: 'FFF7ED', type: ShadingType.CLEAR },
    margins: { top: 200, bottom: 200, left: 300, right: 300 },
    children: [
      new Paragraph({ children: [t('👔 Accès administrateur', { bold: true, size: 28, color: 'EA580C' })], spacing: { after: 100 } }),
      new Paragraph({ children: [t('Le dashboard pour voir, valider, archiver les réservations + analyse.', { color: '1A1108', italics: true })], spacing: { after: 120 } }),
      new Paragraph({ children: [new ExternalHyperlink({
        children: [t('https://hysadre.github.io/Brunch-Eb-ne-Saveurs/admin.html', { color: '2563EB', bold: true, font: 'Courier New', size: 22, underline: {} })],
        link: 'https://hysadre.github.io/Brunch-Eb-ne-Saveurs/admin.html',
      })], spacing: { after: 100 } }),
      new Paragraph({ children: [t('🔐 Code : ', { bold: true }), t('BrunchEbene2026!', { font: 'Courier New', bold: true, color: 'EA580C' })] }),
    ],
  })] })],
}));
children.push(spacer());

// Card 3 — Scanner
children.push(new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [9360],
  rows: [new TableRow({ children: [new TableCell({
    borders: { top: { style: BorderStyle.SINGLE, size: 8, color: '06B6D4' }, bottom: { style: BorderStyle.SINGLE, size: 8, color: '06B6D4' }, left: { style: BorderStyle.SINGLE, size: 16, color: '06B6D4' }, right: { style: BorderStyle.SINGLE, size: 8, color: '06B6D4' } },
    width: { size: 9360, type: WidthType.DXA },
    shading: { fill: 'ECFEFF', type: ShadingType.CLEAR },
    margins: { top: 200, bottom: 200, left: 300, right: 300 },
    children: [
      new Paragraph({ children: [t('📸 Scanner Pass (jour J)', { bold: true, size: 28, color: '0891B2' })], spacing: { after: 100 } }),
      new Paragraph({ children: [t('La page scanner QR à utiliser le jour du brunch pour valider les entrées.', { color: '1A1108', italics: true })], spacing: { after: 120 } }),
      new Paragraph({ children: [new ExternalHyperlink({
        children: [t('https://hysadre.github.io/Brunch-Eb-ne-Saveurs/scan.html', { color: '2563EB', bold: true, font: 'Courier New', size: 22, underline: {} })],
        link: 'https://hysadre.github.io/Brunch-Eb-ne-Saveurs/scan.html',
      })], spacing: { after: 100 } }),
      new Paragraph({ children: [t('🔐 Code : ', { bold: true }), t('BrunchEbene2026!', { font: 'Courier New', bold: true, color: '0891B2' }), t(' (même code que l’admin)', { italics: true, color: '6B6B80' })] }),
    ],
  })] })],
}));
children.push(spacer());

children.push(callout('💡', 'Sur ton téléphone, ouvre chacun de ces liens, puis ajoute-le à l’écran d’accueil. Tu auras 3 "applis" directement accessibles.'));
children.push(new Paragraph({ children: [new PageBreak()] }));

// SOMMAIRE
children.push(h1('📑 Sommaire'));
children.push(numbered('Le parcours client'));
children.push(numbered('Côté organisateur — Dashboard admin'));
children.push(numbered('Le jour J — Scanner les entrées'));
children.push(numbered('Annuler / archiver une réservation'));
children.push(numbered('Exporter en Excel'));
children.push(numbered('FAQ et dépannage'));
children.push(new Paragraph({ children: [new PageBreak()] }));

// ============================
// SECTION 1 — PARCOURS CLIENT
// ============================
children.push(h1('1. Le parcours client'));

children.push(h2('1.1 Arrivée sur le site'));
children.push(richPara([
  t('Le client arrive sur '),
  new ExternalHyperlink({
    children: [t('hysadre.github.io/Brunch-Eb-ne-Saveurs', { color: '2563EB', underline: {} })],
    link: 'https://hysadre.github.io/Brunch-Eb-ne-Saveurs/',
  }),
  t('. Il voit la page d’accueil avec l’événement (date, lieu, capacité).'),
]));
children.push(placeholder('Page d’accueil sur mobile — hero avec titre, date, lieu'));
children.push(spacer());

children.push(h2('1.2 Choix de la formule'));
children.push(para('3 formules possibles :'));
children.push(bullet('🎫 Standard — 35€ pour 1 place'));
children.push(bullet('👥 Duo — 70€ pour 2 places'));
children.push(bullet('👨‍👩‍👧 Trio — 105€ pour 3 places'));
children.push(richPara([
  t('Le badge '), t('🔥 « Le + populaire »', { bold: true, color: 'EA580C' }),
  t(' apparaît automatiquement sur la formule la plus choisie (basé sur la base de données en temps réel).'),
]));
children.push(placeholder('Section « Choisis ta formule » avec les 3 cards'));
children.push(spacer());

children.push(h2('1.3 Le formulaire'));
children.push(para('Le client remplit prénom, nom, email, téléphone, et éventuellement ses allergies / régime alimentaire.'));
children.push(placeholder('Formulaire rempli'));
children.push(spacer());

children.push(h2('1.4 Conditions générales'));
children.push(richPara([
  t('Avant de continuer, le client doit cocher les CGU. En cliquant sur '),
  t('« conditions générales »', { bold: true }),
  t(', une popup s’ouvre avec toutes les conditions (notamment la politique de remboursement jusqu’à 10j avant l’événement).'),
]));
children.push(placeholder('Popup CGU ouverte'));
children.push(para('Une fois acceptées, la case devient verte avec ✓ animé.'));
children.push(placeholder('Checkbox cochée (état vert avec ✓)'));
children.push(spacer());

children.push(h2('1.5 La page de paiement'));
children.push(richPara([
  t('Le client arrive sur la page de paiement. '),
  t('Une grosse référence orange unique', { bold: true, color: 'EA580C' }),
  t(' est affichée en haut (format : '),
  t('EBENE-NOM-XXXX', { font: 'Courier New', bold: true }),
  t(').'),
]));
children.push(placeholder('Page paiement avec grosse référence orange en haut'));
children.push(para('3 moyens de paiement :'));
children.push(bullet('💳 Revolut (lien direct + référence à indiquer)'));
children.push(bullet('📱 Wero (numéro à copier + référence)'));
children.push(bullet('🏦 Virement SEPA (IBAN à copier + référence)'));
children.push(placeholder('Les 3 options de paiement'));
children.push(richPara([
  t('Le client copie sa référence, fait son paiement, puis revient cliquer '),
  t('« ✓ J’ai payé »', { bold: true }), t('.'),
]));
children.push(spacer());

children.push(h2('1.6 La confirmation'));
children.push(para('Après validation, le client arrive sur la page de confirmation avec :'));
children.push(bullet('✓ Statut « Réservation enregistrée »'));
children.push(bullet('📷 QR code à présenter à l’entrée'));
children.push(bullet('🎫 Bouton « Voir ma réservation en ligne » (vert)'));
children.push(bullet('📥 Bouton « Télécharger mon billet (image) » (orange)'));
children.push(placeholder('Page confirmation avec billet électronique + QR + boutons'));
children.push(spacer());

children.push(h2('1.7 Le mail de confirmation'));
children.push(richPara([
  t('Le client reçoit dans la minute un email depuis '),
  t('brunchebenesaveurs@cosmakit.com', { font: 'Courier New' }),
  t(' avec :'),
]));
children.push(bullet('Le QR sur fond blanc (énorme, visible direct)'));
children.push(bullet('Le numéro de réservation'));
children.push(bullet('Le lien vers sa page billet'));
children.push(bullet('Les boutons WhatsApp et Appel'));
children.push(placeholder('Mail de confirmation reçu'));
children.push(spacer());

children.push(h2('1.8 La page publique du billet'));
children.push(richPara([
  t('À tout moment, le client peut revenir sur sa page billet en cliquant le lien du mail. Cette page affiche '),
  t('le statut en temps réel', { bold: true }),
  t(' :'),
]));
children.push(bullet('⏳ Orange = paiement en attente de validation'));
children.push(bullet('✅ Vert = paiement confirmé'));
children.push(placeholder('Page ticket.html — version « en attente »'));
children.push(placeholder('Page ticket.html — version « validé »'));
children.push(new Paragraph({ children: [new PageBreak()] }));

// ============================
// SECTION 2 — DASHBOARD ADMIN
// ============================
children.push(h1('2. Côté organisateur — Dashboard admin'));

children.push(h2('2.1 Connexion'));
children.push(richPara([
  t('Accède au dashboard via '),
  new ExternalHyperlink({
    children: [t('hysadre.github.io/Brunch-Eb-ne-Saveurs/admin.html', { color: '2563EB', underline: {} })],
    link: 'https://hysadre.github.io/Brunch-Eb-ne-Saveurs/admin.html',
  }),
]));
children.push(richPara([
  t('Mot de passe : '),
  t('BrunchEbene2026!', { font: 'Courier New', bold: true, color: 'EA580C' }),
]));
children.push(placeholder('Écran de login admin'));
children.push(spacer());

children.push(h2('2.2 Vue d’ensemble'));
children.push(para('Une fois connecté, tu vois :'));
children.push(bullet('Le compte à rebours en haut (J-X jours jusqu’au 22 août 2026)'));
children.push(bullet('5 stats globales (Réservations · Places confirmées · Présents · Recettes · En attente)'));
children.push(bullet('Les onglets Réservations / Analyse'));
children.push(bullet('Le tableau détaillé avec toutes les résa'));
children.push(placeholder('Vue complète du dashboard avec données'));
children.push(spacer());

children.push(h2('2.3 Les stats en détail'));
children.push(placeholder('Zoom sur les 5 cartes de stats'));
children.push(bullet('Réservations : nombre total + combien aujourd’hui'));
children.push(bullet('Places confirmées : nombre / capacité (200) + restantes'));
children.push(bullet('🚪 Présents : combien sont déjà entrés / combien sont attendus (à utiliser le jour J)'));
children.push(bullet('Recettes : total encaissé / objectif (7000€)'));
children.push(bullet('En attente : nombre de résa en attente de validation paiement'));
children.push(spacer());

children.push(h2('2.4 Les filtres'));
children.push(para('Tu peux filtrer le tableau par :'));
children.push(bullet('🔍 Recherche (nom, email, n° résa)'));
children.push(bullet('💳 Moyen de paiement'));
children.push(bullet('⏳ Statut (payé / en attente)'));
children.push(bullet('🎫 Formule (Standard / Duo / Trio / Groupe)'));
children.push(bullet('📦 Archivées (par défaut cachées)'));
children.push(placeholder('Barre des filtres'));
children.push(spacer());

children.push(h2('2.5 Valider une réservation'));
children.push(para('Quand tu reçois le paiement Revolut/Wero/Virement :'));
children.push(numbered('Tu vas dans ton app bancaire'));
children.push(numbered('Tu identifies la référence (ex: EBENE-DUPONT-XXX)'));
children.push(numbered('Sur le dashboard, tu cliques « ✓ Valider » sur la ligne correspondante'));
children.push(numbered('→ Le client reçoit AUTOMATIQUEMENT un mail « ✅ Paiement confirmé »'));
children.push(numbered('→ Sa page billet passe en vert'));
children.push(placeholder('Bouton « ✓ Valider » mis en évidence sur une ligne'));
children.push(placeholder('Mail « ✅ Paiement confirmé » reçu par le client'));
children.push(spacer());

children.push(h2('2.6 L’onglet Analyse'));
children.push(richPara([
  t('Clique sur '), t('📊 Analyse', { bold: true }), t(' pour voir :'),
]));
children.push(bullet('📈 Évolution cumulée (places + recettes)'));
children.push(bullet('🎫 Répartition par formule (donut)'));
children.push(bullet('💳 Répartition par moyen de paiement'));
children.push(bullet('✅ Taux de paiement'));
children.push(bullet('📅 Réservations par jour'));
children.push(placeholder('Onglet Analyse avec les graphiques'));
children.push(spacer());

children.push(h2('2.7 Le mail de notification organisateur'));
children.push(richPara([
  t('À chaque nouvelle résa, tu reçois un mail sur '),
  t('abayo.contact@gmail.com', { font: 'Courier New' }), t(' avec :'),
]));
children.push(bullet('Toutes les infos client'));
children.push(bullet('La référence et le montant'));
children.push(bullet('Un bouton « ✓ Voir & valider dans le dashboard »'));
children.push(bullet('Des boutons WhatsApp / Appeler pour contacter le client'));
children.push(placeholder('Mail organisateur avec bouton « Voir & valider »'));
children.push(new Paragraph({ children: [new PageBreak()] }));

// ============================
// SECTION 3 — JOUR J SCANNER
// ============================
children.push(h1('3. Le jour J — Scanner les entrées'));

children.push(h2('3.1 Accès au scanner'));
children.push(richPara([
  t('Depuis le dashboard, clique sur le gros bouton vert '),
  t('« 📸 Scanner entrées »', { bold: true, color: '16A34A' }),
  t(' en haut.'),
]));
children.push(placeholder('Bouton « Scanner entrées » dans le dashboard'));
children.push(richPara([
  t('Ou accède directement : '),
  new ExternalHyperlink({
    children: [t('hysadre.github.io/Brunch-Eb-ne-Saveurs/scan.html', { color: '2563EB', underline: {} })],
    link: 'https://hysadre.github.io/Brunch-Eb-ne-Saveurs/scan.html',
  }),
]));
children.push(callout('💡', 'Astuce : mets cette page en favori sur ton tel, ou ajoute-la à l’écran d’accueil pour avoir une « vraie app ».'));

children.push(h2('3.2 Démarrer la caméra'));
children.push(richPara([
  t('Clique sur '), t('« 🎥 Démarrer la caméra »', { bold: true }),
  t('. iOS / Android te demande l’autorisation → Oui.'),
]));
children.push(placeholder('Page scanner avant démarrage caméra'));
children.push(placeholder('Caméra active en train de scanner'));
children.push(spacer());

children.push(h2('3.3 Scanner un billet'));
children.push(richPara([
  t('Pointe la caméra vers le QR du client. '), t('Automatiquement', { bold: true }), t(' :'),
]));
children.push(bullet('🔔 Bip + 📳 vibration (différents selon le résultat)'));
children.push(bullet('Une popup s’affiche avec le résultat'));
children.push(spacer());

children.push(h3('✅ Billet valide'));
children.push(placeholder('Popup verte « BILLET VALIDE »'));
children.push(richPara([t('→ Clique '), t('« ✓ FAIRE ENTRER »', { bold: true, color: '16A34A' }), t(' pour valider l’entrée.')]));

children.push(h3('🔢 Multi-scan (Duo / Trio)'));
children.push(para('Pour un Duo (2 places), tu peux scanner 2 fois :'));
children.push(bullet('1er scan → « 1/2 ENTRÉ »'));
children.push(bullet('2e scan → « 2/2 COMPLET »'));
children.push(placeholder('Popup avec « 1/2 ENTRÉ »'));
children.push(placeholder('Popup avec « 2/2 COMPLET »'));

children.push(h3('🔵 Déjà entré'));
children.push(para('Si toutes les places sont déjà comptabilisées → la popup devient bleue « TOUS DÉJÀ ENTRÉS » (anti-fraude).'));
children.push(placeholder('Popup bleue « DÉJÀ ENTRÉ »'));

children.push(h3('🟠 Paiement en attente'));
children.push(para('Si la résa n’est pas encore validée → popup orange. Tu peux soit forcer si tu sais que c’est OK, soit fermer.'));
children.push(placeholder('Popup orange « PAIEMENT EN ATTENTE »'));

children.push(h3('🔴 Introuvable'));
children.push(para('Si le QR ne correspond à aucune résa → popup rouge « INTROUVABLE » (faux billet).'));
children.push(placeholder('Popup rouge « INTROUVABLE »'));
children.push(spacer());

children.push(h2('3.4 L’historique des scans'));
children.push(para('En bas de la page scanner, tu vois les derniers scans avec timestamp + nom. Le compteur en haut indique le total d’entrées validées.'));
children.push(placeholder('Section « Derniers scans » avec quelques entrées'));
children.push(spacer());

children.push(h2('3.5 Entrée manuelle (en cas de panne caméra)'));
children.push(richPara([
  t('Si la caméra plante ou le QR est abîmé, déplie '),
  t('« 📝 Entrée manuelle »', { bold: true }),
  t(' et tape le numéro de réservation (ex: '),
  t('EBENE-NOM-XXXX', { font: 'Courier New' }), t(').'),
]));
children.push(placeholder('Champ entrée manuelle'));
children.push(new Paragraph({ children: [new PageBreak()] }));

// ============================
// SECTION 4 — ARCHIVAGE
// ============================
children.push(h1('4. Annuler / archiver une réservation'));

children.push(h2('4.1 Quand utiliser ça ?'));
children.push(bullet('🚫 Le client annule sa venue'));
children.push(bullet('💸 Paiement jamais reçu'));
children.push(bullet('🔄 Doublon'));
children.push(bullet('❌ Erreur de saisie'));
children.push(spacer());

children.push(h2('4.2 Comment archiver'));
children.push(richPara([
  t('Sur le dashboard, dans la colonne '), t('Actions', { bold: true }),
  t(', clique sur '), t('« 🗃️ Annuler »', { bold: true, color: 'EA580C' }), t('.'),
]));
children.push(placeholder('Ligne avec bouton « Annuler » mis en évidence'));
children.push(richPara([
  t('Une '), t('modale s’ouvre', { bold: true }), t(' te demandant le motif :'),
]));
children.push(bullet('Désistement du client'));
children.push(bullet('Impayé / Paiement non reçu'));
children.push(bullet('Doublon'));
children.push(bullet('Erreur de saisie'));
children.push(bullet('Autre (champ libre)'));
children.push(placeholder('Modale d’archivage avec les choix de motif'));
children.push(richPara([
  t('Clique '), t('« 🗃️ Archiver »', { bold: true }), t(' → la résa disparaît du tableau actif. Elle est désormais dans les archives.'),
]));
children.push(spacer());

children.push(h2('4.3 Voir les archives'));
children.push(richPara([
  t('Change le filtre '), t('« Actives uniquement »', { bold: true }),
  t(' en '), t('« Archivées uniquement »', { bold: true }), t(' ou '), t('« Tout voir »', { bold: true }), t('.'),
]));
children.push(placeholder('Filtre « Archivées uniquement » + lignes archivées avec badge orange'));
children.push(spacer());

children.push(h2('4.4 Restaurer une résa archivée'));
children.push(richPara([
  t('Sur une ligne archivée, clique '), t('« ↩ Restaurer »', { bold: true, color: '06B6D4' }),
  t(' → elle revient dans les actives.'),
]));
children.push(placeholder('Bouton « Restaurer » sur ligne archivée'));
children.push(spacer());

children.push(h2('4.5 Supprimer définitivement'));
children.push(richPara([
  t('Si tu veux supprimer '), t('complètement', { bold: true }),
  t(' une résa (pas juste l’archiver), clique '), t('🗑️', { bold: true, color: 'EF4444' }),
  t('. Une confirmation s’ouvre, puis la résa est effacée à jamais de la base.'),
]));
children.push(callout('⚠️', 'Attention : suppression = définitive, irrécupérable. Préfère « Archiver » dans le doute.', 'EF4444'));
children.push(placeholder('Modale de suppression définitive'));
children.push(new Paragraph({ children: [new PageBreak()] }));

// ============================
// SECTION 5 — EXPORT EXCEL
// ============================
children.push(h1('5. Exporter en Excel'));
children.push(richPara([
  t('Sur le dashboard, clique sur '), t('« 📥 Export Excel »', { bold: true }),
  t(' en haut à droite. Un fichier CSV est téléchargé avec toutes les réservations (sauf archivées si filtre actif).'),
]));
children.push(placeholder('Bouton Export Excel en haut du dashboard'));
children.push(para('Le CSV contient :'));
children.push(bullet('N° Résa · Date · Prénom · Nom · Email · Téléphone'));
children.push(bullet('Formule · Places · Prix unitaire · Total'));
children.push(bullet('Moyen de paiement · Allergies / Message · Statut'));
children.push(placeholder('Fichier CSV ouvert dans Excel/Numbers'));
children.push(new Paragraph({ children: [new PageBreak()] }));

// ============================
// SECTION 6 — FAQ
// ============================
children.push(h1('6. FAQ et dépannage'));

children.push(h2('Le client ne reçoit pas son mail'));
children.push(numbered('Vérifie le dossier spam du client'));
children.push(numbered('Va sur resend.com → Emails → cherche le mail → vérifie son statut'));
children.push(numbered('Si statut « delivered » → c’est arrivé, c’est dans les spams'));
children.push(numbered('Si statut « failed » → vérifie les logs Render'));
children.push(placeholder('Dashboard Resend avec liste des mails'));
children.push(spacer());

children.push(h2('Le dashboard est vide alors qu’il y a des résa'));
children.push(bullet('Render (le serveur) met 30-50 secondes à se réveiller s’il a dormi 15+ min'));
children.push(bullet('Patiente et clique sur « ↻ Actualiser »'));
children.push(bullet('Vérifie en haut que tu es bien en mode 🟢 LIVE (pas DÉMO)'));
children.push(placeholder('Pastille LIVE / DEMO en haut du dashboard'));
children.push(spacer());

children.push(h2('Mon QR ne scanne pas'));
children.push(bullet('Vérifie que la caméra est bien allumée (clic sur « 🎥 Démarrer la caméra »)'));
children.push(bullet('Demande au client de monter la luminosité de son écran'));
children.push(bullet('En dernier recours, entrée manuelle : tape le numéro de résa à la main'));
children.push(spacer());

children.push(h2('Une personne a perdu son mail'));
children.push(bullet('Demande-lui son email ou son nom'));
children.push(bullet('Cherche sur le dashboard → tu la trouves'));
children.push(richPara([
  t('Renvoie-lui le lien : '),
  t('hysadre.github.io/Brunch-Eb-ne-Saveurs/ticket.html?id=EBENE-XXX', { font: 'Courier New', size: 18 }),
  t(' (avec son numéro)'),
]));
children.push(placeholder('Recherche d’une résa dans le dashboard'));
children.push(new Paragraph({ children: [new PageBreak()] }));

// PIED DE PAGE
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  children: [t('📞 Besoin d’aide ?', { bold: true, size: 32, color: 'F97316' })],
  spacing: { before: 400, after: 200 },
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  children: [
    t('Numéro de support : ', { bold: true }),
    t('+33 6 68 29 50 77 (WhatsApp)', { color: '16A34A', bold: true }),
  ],
  spacing: { after: 100 },
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  children: [
    t('Mail organisateur : ', { bold: true }),
    t('abayo.contact@gmail.com', { color: '2563EB' }),
  ],
  spacing: { after: 400 },
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  children: [t('Bon brunch ! 🍽️🌴🎉', { italics: true, size: 28, color: 'EA580C' })],
  spacing: { before: 400 },
}));

// === Document final ===
const doc = new Document({
  creator: 'Brunch Ébène & Saveurs',
  title: 'Guide d\'utilisation — Brunch Ébène & Saveurs',
  styles: {
    default: { document: { run: { font: 'Calibri', size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 40, bold: true, color: 'F97316', font: 'Calibri' },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 30, bold: true, color: 'EA580C', font: 'Calibri' },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 26, bold: true, color: '1A1108', font: 'Calibri' },
        paragraph: { spacing: { before: 180, after: 100 }, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      { reference: 'bullets',
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
          { level: 1, format: LevelFormat.BULLET, text: '◦', alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 1440, hanging: 360 } } } },
        ] },
      { reference: 'numbers',
        levels: [
          { level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
        ] },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },  // US Letter
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    children: children,
  }],
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('GUIDE_UTILISATEUR.docx', buffer);
  console.log('✅ GUIDE_UTILISATEUR.docx généré');
});
