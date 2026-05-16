/**
 * 📊 Brunch Ébène & Saveurs — Synchro auto Google Sheets
 * ---------------------------------------------------------
 * Code à coller dans Extensions → Apps Script de ton Google Sheet.
 *
 * Une fois collé, déploie en tant que "Application web" :
 *   1. Bouton Déployer (en haut à droite) → Nouveau déploiement
 *   2. Type : Application Web
 *   3. Exécuter en tant que : Moi (toi)
 *   4. Qui a accès : Tout le monde (anonyme)
 *   5. Déployer → autoriser → COPIE l'URL générée
 *
 * Puis dans Render → Environment, ajoute :
 *   SHEET_WEBHOOK = (l'URL Apps Script copiée)
 *
 * Désormais, à chaque action (création, validation, archive, check-in...)
 * la ligne est ajoutée ou mise à jour dans la feuille "Réservations".
 */

const SHEET_NAME = 'Réservations';

const HEADERS = [
  'N° Résa',
  'Date réservation',
  'Prénom',
  'Nom',
  'Email',
  'Téléphone',
  'Formule',
  'Places',
  'Total (€)',
  'Moyen paiement',
  'Statut',
  'Présents (entrés)',
  'Archivé',
  'Motif annulation',
  'Accompagnants',
  'Allergies / Message',
  'Dernière action',
  'Date dernière action'
];

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action || 'update';

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);

    // Crée la feuille + headers si elle n'existe pas
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(HEADERS);
      const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#3a3d1a'); // olive
      headerRange.setFontColor('#ede5d1'); // cream
      sheet.setFrozenRows(1);
      // Largeurs colonnes raisonnables
      sheet.setColumnWidth(1, 160); // n° résa
      sheet.setColumnWidth(5, 200); // email
      sheet.setColumnWidth(15, 220); // accompagnants
      sheet.setColumnWidth(16, 200); // message
    }

    // Action = suppression → on supprime la ligne
    if (action === 'suppression') {
      const found = findRow(sheet, data.bookingId);
      if (found > 0) sheet.deleteRow(found);
      return out({ ok: true, action: 'deleted' });
    }

    const rowData = [
      data.bookingId,
      data.timestamp ? new Date(data.timestamp) : new Date(),
      data.prenom || '',
      data.nom || '',
      data.email || '',
      data.telephone || '',
      data.ticketName || '',
      data.qty || 0,
      data.total || 0,
      data.paymentMethod || '',
      data.status || '',
      `${data.enteredCount || 0} / ${data.qty || 0}`,
      data.archived ? 'OUI' : '',
      data.cancelReason || '',
      data.accompagnants || '',
      data.message || '',
      action,
      new Date()
    ];

    const existingRow = findRow(sheet, data.bookingId);
    if (existingRow > 0) {
      // Update existing
      sheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
    } else {
      // Append new
      sheet.appendRow(rowData);
    }

    // Colorisation selon statut
    const lastRow = existingRow > 0 ? existingRow : sheet.getLastRow();
    const range = sheet.getRange(lastRow, 1, 1, HEADERS.length);
    if (data.archived) {
      range.setBackground('#5a4028'); // marron foncé (archivé)
      range.setFontColor('#8a6648');
    } else if (data.status === 'confirmé') {
      range.setBackground('#1a2818'); // vert très foncé
      range.setFontColor('#22c55e');
    } else {
      range.setBackground('#2a1810'); // marron orange (en attente)
      range.setFontColor('#c79270');
    }

    return out({ ok: true, action, bookingId: data.bookingId, row: lastRow });

  } catch (err) {
    return out({ ok: false, error: err.toString() });
  }
}

function findRow(sheet, bookingId) {
  if (!bookingId) return -1;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (ids[i][0] === bookingId) return i + 2;
  }
  return -1;
}

function out(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Test rapide depuis l'éditeur Apps Script
function test() {
  const e = {
    postData: {
      contents: JSON.stringify({
        action: 'création',
        bookingId: 'EBENE-TEST-XXXX',
        prenom: 'Test',
        nom: 'Démo',
        email: 'test@example.com',
        telephone: '0612345678',
        ticketName: 'Standard',
        qty: 1,
        total: 35,
        paymentMethod: 'revolut',
        status: 'en attente vérification',
        timestamp: new Date().toISOString()
      })
    }
  };
  Logger.log(doPost(e).getContent());
}
