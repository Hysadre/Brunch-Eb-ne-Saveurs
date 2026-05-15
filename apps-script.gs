/**
 * Webhook Google Apps Script pour billeterie
 * -------------------------------------------
 * À coller dans Extensions → Apps Script de ton Google Sheets.
 * Puis : Déployer → Nouveau déploiement → Application Web
 *        → Exécuter en tant que : Moi
 *        → Accès : Tout le monde (anonyme)
 * Copie l'URL de déploiement et colle-la dans paiement.html.
 */

// ⚙️ CONFIGURATION
const SHEET_NAME = 'Réservations';
const ADMIN_EMAIL = 'TON_EMAIL@gmail.com';  // ← reçoit une notif à chaque résa
const EVENT_NAME  = 'Soirée Rooftop Paris';
const EVENT_DATE  = '27 juin 2026 à 22h00';
const EVENT_PLACE = 'Rooftop Skybar, 75011 Paris';

/**
 * Reçoit les réservations envoyées par paiement.html
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

    // Si le sheet n'existe pas, on le crée avec les headers
    let s = sheet;
    if (!s) {
      s = SpreadsheetApp.getActiveSpreadsheet().insertSheet(SHEET_NAME);
      s.appendRow([
        'N° Résa', 'Date résa', 'Prénom', 'Nom', 'Email', 'Téléphone',
        'Billet', 'Qté', 'Prix unitaire', 'Total', 'Paiement', 'Message', 'Statut'
      ]);
    }

    // Ajoute la ligne de réservation
    s.appendRow([
      data.bookingId,
      new Date(data.timestamp || Date.now()),
      data.prenom || '',
      data.nom || '',
      data.email || '',
      data.telephone || '',
      data.ticketName || '',
      data.qty || 0,
      data.ticketPrice || 0,
      data.total || 0,
      data.paymentMethod || '',
      data.message || '',
      data.status || 'confirmé'
    ]);

    // 📧 Email au client
    if (data.email) {
      sendClientEmail(data);
    }
    // 📧 Notification à l'admin
    sendAdminEmail(data);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, bookingId: data.bookingId }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Permet de tester le webhook depuis un navigateur
 */
function doGet() {
  return ContentService.createTextOutput('Billeterie webhook OK ✅');
}

/**
 * Envoie l'email de confirmation au client
 */
function sendClientEmail(data) {
  const subject = `✅ Ta réservation pour ${EVENT_NAME} est confirmée`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(data.bookingId)}&size=300x300`;
  const totalFmt = Number(data.total).toFixed(2).replace('.', ',');

  const html = `
  <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; background: #fff; color: #1a1a26;">
    <div style="background: linear-gradient(135deg, #8b5cf6, #ec4899); padding: 32px 24px; text-align: center; color: white; border-radius: 16px 16px 0 0;">
      <div style="font-size: 48px; margin-bottom: 8px;">🎉</div>
      <h1 style="margin: 0; font-size: 24px;">Réservation confirmée !</h1>
      <p style="margin: 8px 0 0; opacity: .95;">Merci ${data.prenom}, on a hâte de te voir</p>
    </div>

    <div style="padding: 24px; background: #fafafa;">
      <h2 style="margin: 0 0 12px; font-size: 18px;">${EVENT_NAME}</h2>
      <p style="margin: 0 0 4px;">📅 ${EVENT_DATE}</p>
      <p style="margin: 0 0 16px;">📍 ${EVENT_PLACE}</p>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
        <tr><td style="padding: 6px 0; color: #666;">Billet</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${data.ticketName}</td></tr>
        <tr><td style="padding: 6px 0; color: #666;">Quantité</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${data.qty}</td></tr>
        <tr><td style="padding: 6px 0; color: #666; border-top: 1px solid #e0e0e0;">Total payé</td><td style="padding: 6px 0; text-align: right; font-weight: 700; font-size: 18px; border-top: 1px solid #e0e0e0;">${totalFmt} €</td></tr>
      </table>

      <div style="text-align: center; padding: 20px; background: white; border-radius: 12px;">
        <img src="${qrUrl}" alt="QR code" style="max-width: 200px;">
        <p style="margin: 12px 0 0; font-family: monospace; font-size: 16px; font-weight: 700;">${data.bookingId}</p>
        <p style="margin: 4px 0 0; font-size: 12px; color: #999;">Présente ce QR code à l'entrée</p>
      </div>
    </div>

    <div style="padding: 16px 24px; text-align: center; font-size: 12px; color: #999;">
      Une question ? Réponds simplement à cet email.
    </div>
  </div>
  `;

  GmailApp.sendEmail(data.email, subject, '', { htmlBody: html });
}

/**
 * Notification à l'admin
 */
function sendAdminEmail(data) {
  if (!ADMIN_EMAIL || ADMIN_EMAIL === 'TON_EMAIL@gmail.com') return;
  const subject = `🎫 Nouvelle réservation : ${data.prenom} ${data.nom} (${data.qty}× ${data.ticketName})`;
  const body = `
Nouvelle réservation reçue :

Nom        : ${data.prenom} ${data.nom}
Email      : ${data.email}
Téléphone  : ${data.telephone}
Billet     : ${data.ticketName} × ${data.qty}
Total      : ${data.total} €
Paiement   : ${data.paymentMethod}
Message    : ${data.message || '(aucun)'}
N° Résa    : ${data.bookingId}

Voir toutes les réservations : ${SpreadsheetApp.getActiveSpreadsheet().getUrl()}
  `.trim();
  GmailApp.sendEmail(ADMIN_EMAIL, subject, body);
}
