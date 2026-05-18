/**
 * Backend Brunch Ébène & Saveurs — Supabase + Resend
 * ----------------------------------------------------
 * Stockage : Supabase (Postgres) → persistant, gratuit
 * Emails   : Resend (HTTPS, compatible Render Free)
 *
 * Variables d'environnement requises (Render → Environment) :
 *   SUPABASE_URL          ex: https://xxxxx.supabase.co
 *   SUPABASE_SERVICE_KEY  clé service_role (secrète)
 *   RESEND_API_KEY        ex: re_xxxx
 *   ADMIN_TOKEN           mot de passe admin (= ADMIN_PWD dans admin.html)
 *   ORGANIZER_EMAIL       abayoassi@gmail.com
 *   SITE_URL              https://hysadre.github.io/Brunch-Eb-ne-Saveurs
 */

import express from 'express';
import cors from 'cors';

// ----- Config -----
const ADMIN_TOKEN      = process.env.ADMIN_TOKEN || 'BrunchEbene2026!';
const PORT             = process.env.PORT || 3000;
const SUPABASE_URL     = process.env.SUPABASE_URL || '';
const SUPABASE_KEY     = process.env.SUPABASE_SERVICE_KEY || '';
const BREVO_API_KEY    = process.env.BREVO_API_KEY || '';
const RESEND_API_KEY   = process.env.RESEND_API_KEY || ''; // fallback
const ORGANIZER_EMAIL  = process.env.ORGANIZER_EMAIL || 'abayoassi@gmail.com';
const FROM_EMAIL_NAME  = process.env.FROM_EMAIL_NAME || 'Brunch Ébène & Saveurs';
const FROM_EMAIL_ADDR  = process.env.FROM_EMAIL_ADDR || 'abayoassi@gmail.com';
const SITE_URL         = (process.env.SITE_URL || 'https://hysadre.github.io/Brunch-Eb-ne-Saveurs').replace(/\/$/, '');
const SHEET_WEBHOOK    = process.env.SHEET_WEBHOOK || ''; // URL Google Apps Script (sync auto sheet)
const WHATSAPP_NUMBER  = '33668295077';
const WHATSAPP_DISPLAY = '+33 6 68 29 50 77';

const EVENT = {
  name: 'Brunch Ébène & Saveurs',
  date: 'Samedi 22 août 2026',
  time: '13h00',
  place: 'Salle de Ronchin, 59790 Ronchin (Lille)'
};

const app = express();
app.use(cors());
app.use(express.json({ limit: '50kb' }));

// ----- Supabase helpers -----
async function supa(path, opts = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Supabase non configurée (SUPABASE_URL/SUPABASE_SERVICE_KEY manquants)');
  }
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    ...opts.headers
  };
  const r = await fetch(url, { ...opts, headers });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`Supabase ${r.status} ${r.statusText}: ${txt}`);
  }
  // DELETE/PATCH avec Prefer:return=minimal renvoient un body vide
  const ct = r.headers.get('content-type') || '';
  if (!ct.includes('application/json')) return null;
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}

async function listReservations() {
  return await supa('reservations?select=*&order=timestamp.desc');
}
async function findReservation(bookingId) {
  const list = await supa(`reservations?select=*&"bookingId"=eq.${encodeURIComponent(bookingId)}`);
  return (list && list[0]) || null;
}
async function insertReservation(b) {
  await supa('reservations', {
    method: 'POST',
    headers: { 'Prefer': 'return=minimal' },
    body: JSON.stringify(b)
  });
}
async function patchReservation(bookingId, patch) {
  await supa(`reservations?"bookingId"=eq.${encodeURIComponent(bookingId)}`, {
    method: 'PATCH',
    headers: { 'Prefer': 'return=minimal' },
    body: JSON.stringify(patch)
  });
}
async function removeReservation(bookingId) {
  console.log(`🗑️ removeReservation appelée pour : ${bookingId}`);
  try {
    await supa(`reservations?"bookingId"=eq.${encodeURIComponent(bookingId)}`, {
      method: 'DELETE',
      headers: { 'Prefer': 'return=minimal' }
    });
    console.log(`✅ ${bookingId} supprimé de Supabase`);
  } catch(e) {
    console.error(`❌ removeReservation ${bookingId} ÉCHEC : ${e.message}`);
    throw e;
  }
}

// 🆕 Normalise le nom de famille pour le bookingId
//   "Abayo Déborah Assi" → "ASSI" (dernier mot, sans accent, sans caractère spécial)
function normalizeLastName(nom) {
  if (!nom) return 'INCONNU';
  const cleaned = String(nom).normalize('NFD').replace(/[̀-ͯ]/g, '');  // retire accents
  // On prend le DERNIER mot (souvent le vrai nom de famille)
  const parts = cleaned.split(/[\s-]+/).filter(p => p.length > 0);
  const last = parts.length > 0 ? parts[parts.length - 1] : cleaned;
  const upper = last.toUpperCase().replace(/[^A-Z]/g, '');
  return (upper.slice(0, 10) || 'INCONNU');
}

// 🆕 Compte les résa existantes pour générer le prochain numéro séquentiel
async function countReservations() {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/reservations?select=bookingId`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'count=exact'
    }
  });
  // Le header Content-Range contient "0-N/total"
  const range = r.headers.get('content-range') || '';
  const m = range.match(/\/(\d+)$/);
  if (m) return parseInt(m[1], 10);
  // Fallback : récupère et compte
  const list = await r.json();
  return Array.isArray(list) ? list.length : 0;
}

// 🆕 Génère un bookingId séquentiel — EBENE-NOM-Y{NNN}
// Si collision (très rare race condition) → incrémente jusqu'à trouver libre
async function generateBookingId(nom) {
  const lastName = normalizeLastName(nom);
  let n = (await countReservations()) + 1;
  for (let attempt = 0; attempt < 20; attempt++) {
    const padded = String(n).padStart(3, '0');
    const candidate = `EBENE-${lastName}-Y${padded}`;
    const existing = await findReservation(candidate);
    if (!existing) return candidate;
    n++;  // collision → essaie le suivant
  }
  // Sécurité ultime : suffixe aléatoire
  return `EBENE-${lastName}-Y${String(n).padStart(3, '0')}X${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

// ----- Auth middleware -----
function requireAdmin(req, res, next) {
  const token = req.header('X-Admin-Token');
  if (token !== ADMIN_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  next();
}

// ====================================================
// 📊 TRACKING — pageviews + événements par résa
// ====================================================
async function insertPageview(row) {
  try {
    await supa('pageviews', {
      method: 'POST',
      headers: { 'Prefer': 'return=minimal' },
      body: JSON.stringify(row)
    });
    console.log(`📊 pageview enregistrée : ${row.page} (session=${row.sessionId.slice(0,12)}…)`);
  } catch(e) {
    console.warn(`⚠️  pageview insert ÉCHEC pour ${row.page} : ${e.message}`);
  }
}

async function appendEvent(bookingId, evt) {
  try {
    const r = await findReservation(bookingId);
    if (!r) return;
    const prev = Array.isArray(r.events) ? r.events : [];
    const next = [...prev, { ...evt, at: new Date().toISOString() }];
    await patchReservation(bookingId, { events: next });
  } catch(e) {
    // Si la colonne events n'existe pas, on log mais on ne casse pas
    if (!e.message?.includes('events')) console.warn('event append error:', e.message);
  }
}

// ----- Email — Resend (primaire, domaine vérifié) ou Brevo (fallback) -----
async function sendEmail({ to, subject, html, text }) {
  const recipients = (Array.isArray(to) ? to : [to]);
  console.log(`📧 sendEmail → to=${recipients.join(',')} | subject="${subject}" | from="${FROM_EMAIL_NAME} <${FROM_EMAIL_ADDR}>"`);

  // 1️⃣ Resend (primaire) — domaine cosmakit.com vérifié
  if (RESEND_API_KEY) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `${FROM_EMAIL_NAME} <${FROM_EMAIL_ADDR}>`,
          to: recipients,
          subject,
          html,
          text
        })
      });
      if (r.ok) {
        const data = await r.json();
        console.log(`✅ Resend OK → id=${data.id || '?'} pour ${recipients.join(',')}`);
        return data;
      }
      const errText = await r.text();
      console.warn(`⚠️  Resend ${r.status} ÉCHEC pour ${recipients.join(',')}: ${errText}`);
    } catch(e) {
      console.warn(`⚠️  Resend exception pour ${recipients.join(',')}: ${e.message}`);
    }
  } else {
    console.warn('⚠️  RESEND_API_KEY manquante');
  }

  // 2️⃣ Fallback Brevo (si Resend foire)
  if (BREVO_API_KEY) {
    const body = {
      sender: { name: FROM_EMAIL_NAME, email: FROM_EMAIL_ADDR },
      to: recipients.map(e => ({ email: e })),
      subject,
      htmlContent: html
    };
    if (text) body.textContent = text;
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
        'accept': 'application/json'
      },
      body: JSON.stringify(body)
    });
    if (!r.ok) {
      const err = await r.text();
      throw new Error(`Brevo ${r.status}: ${err}`);
    }
    return r.json();
  }

  console.warn('⚠️  Aucune clé email configurée (RESEND_API_KEY ou BREVO_API_KEY) — email non envoyé');
}

// Wrapper rétro-compatible
const resendSend = sendEmail;

// ----- ✏️ Email de modification (retrait d'une place sans tout annuler) -----
async function sendModificationEmail(booking, removedName, newQty, oldQty) {
  if (!booking.email) return;
  const totalFmt = Number(booking.total).toFixed(2).replace('.', ',');
  const ticketUrl = `${SITE_URL}/ticket.html?id=${encodeURIComponent(booking.bookingId)}`;
  const waLink = `https://wa.me/${WHATSAPP_NUMBER}`;
  const telLink = `tel:+${WHATSAPP_NUMBER}`;

  const html = `
  <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; background: #0f0a06; color: #ede5d1; border-radius: 16px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #b86a45, #c79270); padding: 28px 24px; text-align: center; color: white;">
      <div style="font-size: 40px; margin-bottom: 6px;">✏️</div>
      <h1 style="margin: 0; font-size: 22px;">Réservation modifiée</h1>
      <p style="margin: 6px 0 0; opacity: .95;">Une place a été retirée de votre réservation</p>
    </div>

    <div style="padding: 24px; background: #1a1108;">
      <p style="margin: 0 0 16px; font-size: 15px; color: #ede5d1; line-height: 1.6;">
        Bonjour <strong>${booking.prenom}</strong>,<br><br>
        Nous vous informons qu'une modification a été apportée à votre réservation : <strong style="color:#c79270;">${removedName}</strong> a été retiré(e) de la liste.
      </p>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; color: #ede5d1; background: #14100a; border-radius: 10px;">
        <tr><td style="padding: 10px 14px; color: #d4a574;">Nombre de places</td><td style="padding: 10px 14px; text-align: right; font-weight: 700;"><span style="text-decoration:line-through; color:#8a6648;">${oldQty}</span> → <strong style="color:#c79270;">${newQty}</strong></td></tr>
        <tr><td style="padding: 10px 14px; color: #d4a574; border-top: 1px solid #3a2818;">Formule</td><td style="padding: 10px 14px; text-align: right; font-weight: 700; border-top: 1px solid #3a2818;">${booking.ticketName}</td></tr>
        <tr><td style="padding: 10px 14px; color: #d4a574; border-top: 1px solid #3a2818;">Nouveau total</td><td style="padding: 10px 14px; text-align: right; font-weight: 700; border-top: 1px solid #3a2818; color: #c79270;">${totalFmt} €</td></tr>
      </table>

      <a href="${ticketUrl}" style="display:block; margin-top: 16px; background: linear-gradient(135deg, #b86a45, #8a4a2e); color: white; text-decoration: none; padding: 14px; border-radius: 12px; font-weight: 700; text-align: center;">🔎 Voir ma réservation à jour</a>

      <div style="background: rgba(199, 146, 112, 0.10); border: 1px solid rgba(199, 146, 112, 0.3); border-radius: 12px; padding: 14px; margin-top: 16px; font-size: 13px; color: #ede5d1; line-height: 1.6;">
        💡 Si cette modification vous semble erronée, n'hésitez pas à nous contacter rapidement.
      </div>
    </div>
    <div style="padding: 18px 24px; text-align: center; background: #14100a; border-top: 1px solid #3a2818;">
      <a href="${waLink}" style="display: inline-block; background: #16a34a; color: white; text-decoration: none; padding: 10px 18px; border-radius: 99px; font-weight: 700; font-size: 14px; margin: 4px;">💬 WhatsApp</a>
      <a href="${telLink}" style="display: inline-block; background: #c79270; color: #1a1108; text-decoration: none; padding: 10px 18px; border-radius: 99px; font-weight: 700; font-size: 14px; margin: 4px;">📞 ${WHATSAPP_DISPLAY}</a>
    </div>
  </div>`;

  await resendSend({
    to: booking.email,
    subject: `✏️ Votre réservation pour ${EVENT.name} a été modifiée`,
    html
  });
}

// ----- ➕ Email d'ajout de places (qty augmente) -----
async function sendAdditionEmail(booking, addedCount, addedNames, oldQty) {
  if (!booking.email) return;
  const totalFmt = Number(booking.total).toFixed(2).replace('.', ',');
  const ticketUrl = `${SITE_URL}/ticket.html?id=${encodeURIComponent(booking.bookingId)}`;
  const waLink = `https://wa.me/${WHATSAPP_NUMBER}`;
  const telLink = `tel:+${WHATSAPP_NUMBER}`;
  const namesList = addedNames && addedNames.trim()
    ? `<div style="margin-top:10px; padding:10px 14px; background: rgba(34, 197, 94, 0.10); border-radius:8px; font-size:13px; color:#86efac;">Nouvelles personnes : <strong style="color:#22c55e;">${addedNames}</strong></div>`
    : '';

  const html = `
  <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; background: #0f0a06; color: #ede5d1; border-radius: 16px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #16a34a, #22c55e); padding: 28px 24px; text-align: center; color: white;">
      <div style="font-size: 40px; margin-bottom: 6px;">➕</div>
      <h1 style="margin: 0; font-size: 22px;">Places ajoutées</h1>
      <p style="margin: 6px 0 0; opacity: .95;">Votre réservation a été mise à jour</p>
    </div>

    <div style="padding: 24px; background: #1a1108;">
      <p style="margin: 0 0 16px; font-size: 15px; color: #ede5d1; line-height: 1.6;">
        Bonjour <strong>${booking.prenom}</strong>,<br><br>
        Excellente nouvelle ! Nous avons ajouté <strong style="color:#22c55e;">${addedCount} place${addedCount>1?'s':''}</strong> à votre réservation.
      </p>
      ${namesList}

      <table style="width: 100%; border-collapse: collapse; margin-top: 16px; color: #ede5d1; background: #14100a; border-radius: 10px;">
        <tr><td style="padding: 10px 14px; color: #d4a574;">Nombre de places</td><td style="padding: 10px 14px; text-align: right; font-weight: 700;"><span style="text-decoration:line-through; color:#8a6648;">${oldQty}</span> → <strong style="color:#22c55e;">${booking.qty}</strong></td></tr>
        <tr><td style="padding: 10px 14px; color: #d4a574; border-top: 1px solid #3a2818;">Formule</td><td style="padding: 10px 14px; text-align: right; font-weight: 700; border-top: 1px solid #3a2818;">${booking.ticketName}</td></tr>
        <tr><td style="padding: 10px 14px; color: #d4a574; border-top: 1px solid #3a2818;">Nouveau total</td><td style="padding: 10px 14px; text-align: right; font-weight: 700; border-top: 1px solid #3a2818; color: #c79270;">${totalFmt} €</td></tr>
      </table>

      <a href="${ticketUrl}" style="display:block; margin-top: 16px; background: linear-gradient(135deg, #16a34a, #22c55e); color: white; text-decoration: none; padding: 14px; border-radius: 12px; font-weight: 700; text-align: center;">🔎 Voir ma réservation à jour</a>
    </div>
    <div style="padding: 18px 24px; text-align: center; background: #14100a; border-top: 1px solid #3a2818;">
      <a href="${waLink}" style="display: inline-block; background: #16a34a; color: white; text-decoration: none; padding: 10px 18px; border-radius: 99px; font-weight: 700; font-size: 14px; margin: 4px;">💬 WhatsApp</a>
      <a href="${telLink}" style="display: inline-block; background: #c79270; color: #1a1108; text-decoration: none; padding: 10px 18px; border-radius: 99px; font-weight: 700; font-size: 14px; margin: 4px;">📞 ${WHATSAPP_DISPLAY}</a>
    </div>
  </div>`;

  await resendSend({
    to: booking.email,
    subject: `➕ ${addedCount} place${addedCount>1?'s':''} ajoutée${addedCount>1?'s':''} à votre réservation`,
    html
  });
}

// ----- 🚫 Email d'annulation (sans QR, ton chic et bienveillant) -----
async function sendCancellationEmail(booking, reason) {
  if (!booking.email) return;
  const totalFmt = Number(booking.total).toFixed(2).replace('.', ',');
  const waLink = `https://wa.me/${WHATSAPP_NUMBER}`;
  const telLink = `tel:+${WHATSAPP_NUMBER}`;
  const reasonText = reason || booking.cancelReason || 'annulation';

  const html = `
  <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; background: #0f0a06; color: #ede5d1; border-radius: 16px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #5a4028, #3a2818); padding: 32px 24px; text-align: center; color: white;">
      <div style="display:inline-block; width:70px; height:70px; background:#ede5d1; border-radius:50%; line-height:70px; font-size:36px; color:#8a4a2e; margin-bottom:10px;">🚫</div>
      <h1 style="margin: 0; font-size: 22px;">Réservation annulée</h1>
      <p style="margin: 6px 0 0; opacity: .9; font-size:14px;">Votre place pour le brunch a été annulée</p>
    </div>

    <div style="padding: 24px; background: #1a1108;">
      <p style="margin: 0 0 16px; font-size: 15px; color: #ede5d1; line-height: 1.6;">
        Bonjour <strong>${booking.prenom}</strong>,<br><br>
        Nous vous confirmons que votre réservation pour le <strong>${EVENT.name}</strong> a été annulée.
      </p>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; color: #ede5d1; background: #14100a; border-radius: 10px;">
        <tr><td style="padding: 10px 14px; color: #d4a574;">📅 Événement</td><td style="padding: 10px 14px; text-align: right; font-weight: 700;">${EVENT.date}</td></tr>
        <tr><td style="padding: 10px 14px; color: #d4a574; border-top: 1px solid #3a2818;">🎫 Formule</td><td style="padding: 10px 14px; text-align: right; font-weight: 700; border-top: 1px solid #3a2818;">${booking.ticketName}</td></tr>
        <tr><td style="padding: 10px 14px; color: #d4a574; border-top: 1px solid #3a2818;">👥 Places</td><td style="padding: 10px 14px; text-align: right; font-weight: 700; border-top: 1px solid #3a2818;">${booking.qty}</td></tr>
        <tr><td style="padding: 10px 14px; color: #d4a574; border-top: 1px solid #3a2818;">💰 Montant</td><td style="padding: 10px 14px; text-align: right; font-weight: 700; border-top: 1px solid #3a2818;">${totalFmt} €</td></tr>
        <tr><td style="padding: 10px 14px; color: #d4a574; border-top: 1px solid #3a2818;">📝 Motif</td><td style="padding: 10px 14px; text-align: right; font-weight: 700; border-top: 1px solid #3a2818; font-style: italic;">${reasonText}</td></tr>
      </table>

      <div style="background: rgba(199, 146, 112, 0.10); border: 1px solid rgba(199, 146, 112, 0.3); border-radius: 12px; padding: 14px 16px; font-size: 13px; color: #ede5d1; line-height: 1.6;">
        💡 Si cette annulation vous semble erronée ou si vous souhaitez en discuter, n'hésitez pas à nous contacter via WhatsApp. Nous restons disponibles.
      </div>

      <p style="margin: 20px 0 0; font-size: 13px; color: #d4a574; text-align: center; line-height: 1.6;">
        Au plaisir de vous accueillir à l'une de nos prochaines éditions 🌴
      </p>
    </div>
    <div style="padding: 18px 24px; text-align: center; background: #14100a; border-top: 1px solid #3a2818;">
      <p style="margin: 0 0 10px; font-size: 11px; color: #8a6648; letter-spacing: 2px; text-transform: uppercase; font-weight: 700;">Une question ?</p>
      <a href="${waLink}" style="display: inline-block; background: #16a34a; color: white; text-decoration: none; padding: 10px 18px; border-radius: 99px; font-weight: 700; font-size: 14px; margin: 4px;">💬 WhatsApp</a>
      <a href="${telLink}" style="display: inline-block; background: #c79270; color: #1a1108; text-decoration: none; padding: 10px 18px; border-radius: 99px; font-weight: 700; font-size: 14px; margin: 4px;">📞 ${WHATSAPP_DISPLAY}</a>
    </div>
  </div>`;

  await resendSend({
    to: booking.email,
    subject: `🚫 Votre réservation pour ${EVENT.name} a été annulée`,
    html
  });
}

// ----- 📊 Google Sheets sync (via Apps Script webhook) -----
// Règles :
//   - On ne crée une ligne dans le Sheet QUE quand la résa est VALIDÉE (status="confirmé")
//   - Après création, on met à jour la colonne "Statut actuel" pour refléter
//     les modifications (modifiée / annulée / restaurée / supprimée)
async function syncToSheet(action, booking) {
  if (!SHEET_WEBHOOK) return;  // pas configuré → on skip silencieusement

  const isConfirmed = booking.status === 'confirmé';
  const isArchived  = booking.archived === true;

  // Calcul du "statut actuel" lisible dans le Sheet
  let statusLabel;
  if (action === 'suppression')      statusLabel = '🗑️ Supprimée définitivement';
  else if (isArchived)               statusLabel = `🚫 Annulée${booking.cancelReason ? ` (${booking.cancelReason})` : ''}`;
  else if (action === 'modification') statusLabel = '✏️ Modifiée';
  else if (action === 'restauration') statusLabel = '↩️ Restaurée';
  else if (action === 'check-in')    statusLabel = booking.entered ? '✅ Présent · entrée(s) complète(s)' : `🚪 Présent · ${booking.enteredCount}/${booking.qty}`;
  else if (isConfirmed)              statusLabel = '✓ Validée';
  else                                statusLabel = '⏳ En attente';

  // ⛔ Filtre : ne JAMAIS pousser une résa qui n'a jamais été validée
  // Sauf si c'est une suppression (pour nettoyer une ligne qui aurait été créée à tort)
  // OU si elle a déjà été dans le sheet (archived = true implique qu'elle a été validée avant)
  const everConfirmed = isConfirmed || isArchived || booking.paidAt;
  if (!everConfirmed && action !== 'suppression') {
    console.log(`📊 Sheet sync SKIP ${booking.bookingId} — pas encore validée (status="${booking.status}")`);
    return;
  }

  try {
    const payload = { action, statusLabel, ...booking };
    fetch(SHEET_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(r => {
      if (r.ok) console.log(`📊 Sheet sync OK [${action}/${statusLabel}] ${booking.bookingId}`);
      else console.warn(`📊 Sheet sync ${r.status} pour ${booking.bookingId}`);
    }).catch(e => console.warn(`📊 Sheet sync erreur: ${e.message}`));
  } catch(e) {
    console.warn(`📊 Sheet sync exception: ${e.message}`);
  }
}

async function sendConfirmationEmails(booking) {
  if (!booking.email) return;
  const totalFmt = Number(booking.total).toFixed(2).replace('.', ',');
  const ticketUrl = `${SITE_URL}/ticket.html?id=${encodeURIComponent(booking.bookingId)}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(ticketUrl)}&size=300x300`;
  const waLink = `https://wa.me/${WHATSAPP_NUMBER}`;
  const telLink = `tel:+${WHATSAPP_NUMBER}`;
  const adminLink = `${SITE_URL}/admin.html?id=${encodeURIComponent(booking.bookingId)}`;
  const clientWa = `https://wa.me/${(booking.telephone || '').replace(/[^0-9]/g,'').replace(/^0/, '33')}`;

  // ===== EMAIL CLIENT (résa enregistrée, EN ATTENTE de paiement) =====
  // ⚠️ PAS DE QR à ce stade — le QR n'est envoyé qu'après validation du paiement
  const clientHtml = `
  <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; background: #0f0a06; color: #ede5d1; border-radius: 16px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #b86a45, #c79270); padding: 28px 24px; text-align: center; color: white;">
      <div style="font-size: 40px; margin-bottom: 6px;">⏳</div>
      <h1 style="margin: 0; font-size: 22px;">Réservation enregistrée !</h1>
      <p style="margin: 6px 0 0; opacity: .95;">Merci ${booking.prenom}, nous avons bien reçu votre demande</p>
    </div>

    <div style="padding: 24px; background: #1a1108;">
      <h2 style="margin: 0 0 12px; font-size: 18px; color: #c79270;">${EVENT.name}</h2>
      <p style="margin: 0 0 4px; color: #d4a574;">📅 ${EVENT.date} · ${EVENT.time}</p>
      <p style="margin: 0 0 16px; color: #d4a574;">📍 ${EVENT.place}</p>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; color: #ede5d1;">
        <tr><td style="padding: 6px 0; color: #d4a574;">Formule</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${booking.ticketName}</td></tr>
        <tr><td style="padding: 6px 0; color: #d4a574;">Places</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${booking.qty}</td></tr>
        <tr><td style="padding: 6px 0; color: #d4a574; border-top: 1px solid #3a2818;">Paiement</td><td style="padding: 6px 0; text-align: right; font-weight: 600; border-top: 1px solid #3a2818; text-transform: capitalize;">${booking.paymentMethod}</td></tr>
        <tr><td style="padding: 6px 0; color: #d4a574;">Total</td><td style="padding: 6px 0; text-align: right; font-weight: 700; font-size: 18px; color: #c79270;">${totalFmt} €</td></tr>
        <tr><td style="padding: 6px 0; color: #d4a574; border-top: 1px solid #3a2818;">N° de référence</td><td style="padding: 6px 0; text-align: right; font-weight: 700; border-top: 1px solid #3a2818; font-family: 'Courier New', monospace; color: #c79270;">${booking.bookingId}</td></tr>
      </table>

      <!-- ⏳ Bandeau d'attente paiement -->
      <div style="background: rgba(251, 191, 36, 0.10); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 12px; padding: 18px; margin-top: 12px;">
        <p style="margin: 0 0 10px; font-size: 14px; color: #c79270; font-weight: 700;">⏳ En attente de validation du paiement</p>
        <p style="margin: 0; font-size: 13px; color: #ede5d1; line-height: 1.6;">
          Nous vérifions votre paiement (${booking.paymentMethod}) sous 24h. Dès que c'est fait, vous recevrez un <strong style="color:#22c55e;">deuxième mail de confirmation avec votre QR code unique</strong> à présenter à l'entrée du brunch.
        </p>
      </div>

      <a href="${ticketUrl}" style="display:block; margin-top: 16px; background: linear-gradient(135deg, #b86a45, #8a4a2e); color: white; text-decoration: none; padding: 14px; border-radius: 12px; font-weight: 700; text-align: center; font-size: 15px;">🔎 Voir le statut de ma réservation</a>

      <p style="margin: 16px 0 0; font-size: 13px; color: #d4a574; text-align: center; line-height: 1.5;">
        💡 Vous pouvez suivre l'état de votre réservation à tout moment via le lien ci-dessus.
      </p>
    </div>
    <div style="padding: 18px 24px; text-align: center; background: #14100a; border-top: 1px solid #3a2818;">
      <p style="margin: 0 0 10px; font-size: 11px; color: #8a6648; letter-spacing: 2px; text-transform: uppercase; font-weight: 700;">Une question ?</p>
      <a href="${waLink}" style="display: inline-block; background: #16a34a; color: white; text-decoration: none; padding: 10px 18px; border-radius: 99px; font-weight: 700; font-size: 14px; margin: 4px;">💬 WhatsApp</a>
      <a href="${telLink}" style="display: inline-block; background: #c79270; color: #1a1108; text-decoration: none; padding: 10px 18px; border-radius: 99px; font-weight: 700; font-size: 14px; margin: 4px;">📞 ${WHATSAPP_DISPLAY}</a>
    </div>
  </div>`;

  await resendSend({ to: booking.email, subject: `🌴 Ta réservation pour ${EVENT.name}`, html: clientHtml });

  // ===== EMAIL ADMIN =====
  const adminHtml = `
  <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; background: #0f0a06; color: #ede5d1; border-radius: 16px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #b86a45, #c79270); padding: 24px; text-align: center; color: #1a1108;">
      <div style="font-size: 36px; margin-bottom: 6px;">🎫</div>
      <h1 style="margin: 0; font-size: 22px;">Nouvelle réservation</h1>
      <p style="margin: 6px 0 0; font-weight: 700;">${booking.prenom} ${booking.nom} · ${booking.qty} place${booking.qty>1?'s':''} · ${totalFmt} €</p>
    </div>
    <div style="padding: 24px; background: #1a1108;">
      <table style="width: 100%; border-collapse: collapse; color: #ede5d1; font-size: 14px;">
        <tr><td style="padding: 8px 0; color: #d4a574; width: 38%;">Nom complet</td><td style="padding: 8px 0; font-weight: 700;">${booking.prenom} ${booking.nom}</td></tr>
        <tr><td style="padding: 8px 0; color: #d4a574;">Email</td><td style="padding: 8px 0;"><a href="mailto:${booking.email}" style="color: #c79270; text-decoration: none;">${booking.email}</a></td></tr>
        <tr><td style="padding: 8px 0; color: #d4a574;">Téléphone</td><td style="padding: 8px 0;"><a href="tel:${booking.telephone}" style="color: #c79270; text-decoration: none;">${booking.telephone}</a> · <a href="${clientWa}" style="color: #22c55e; text-decoration: none;">WhatsApp</a></td></tr>
        <tr><td style="padding: 8px 0; color: #d4a574; border-top: 1px solid #3a2818;">Formule</td><td style="padding: 8px 0; border-top: 1px solid #3a2818; font-weight: 700;">${booking.ticketName}</td></tr>
        <tr><td style="padding: 8px 0; color: #d4a574;">Places</td><td style="padding: 8px 0; font-weight: 700;">${booking.qty}</td></tr>
        <tr><td style="padding: 8px 0; color: #d4a574;">Paiement</td><td style="padding: 8px 0; font-weight: 700; text-transform: capitalize;">${booking.paymentMethod}</td></tr>
        <tr><td style="padding: 8px 0; color: #d4a574;">Total</td><td style="padding: 8px 0; font-weight: 800; font-size: 17px; color: #c79270;">${totalFmt} €</td></tr>
        <tr><td style="padding: 8px 0; color: #d4a574; border-top: 1px solid #3a2818;">N° Référence</td><td style="padding: 8px 0; border-top: 1px solid #3a2818; font-family: monospace; font-weight: 700; color: #c79270;">${booking.bookingId}</td></tr>
        ${booking.message ? `<tr><td style="padding: 8px 0; color: #d4a574; vertical-align: top;">Allergies / Note</td><td style="padding: 8px 0; font-style: italic;">${booking.message}</td></tr>` : ''}
      </table>

      <div style="margin-top: 20px; padding: 14px; background: rgba(251, 191, 36, 0.08); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 12px; text-align: center;">
        <p style="margin: 0 0 8px; color: #c79270; font-weight: 700; font-size: 14px;">⏳ À vérifier dans l'app ${booking.paymentMethod || ''}</p>
        <p style="margin: 0; color: #d4a574; font-size: 12px;">Cherche la référence <strong style="color: #c79270;">${booking.bookingId}</strong></p>
      </div>

      <a href="${adminLink}" style="display: block; margin-top: 16px; background: linear-gradient(135deg, #b86a45, #8a4a2e); color: white; text-decoration: none; padding: 16px; border-radius: 14px; font-weight: 800; font-size: 16px; text-align: center; box-shadow: 0 4px 12px rgba(249,115,22,0.3);">
        ✓ Voir & valider dans le dashboard →
      </a>

      <div style="margin-top: 14px; text-align: center;">
        <a href="${clientWa}" style="display: inline-block; background: #16a34a; color: white; text-decoration: none; padding: 10px 16px; border-radius: 99px; font-weight: 700; font-size: 13px; margin: 4px;">💬 WhatsApp le client</a>
        <a href="tel:${booking.telephone}" style="display: inline-block; background: #1a1108; color: #c79270; text-decoration: none; padding: 10px 16px; border-radius: 99px; font-weight: 700; font-size: 13px; margin: 4px; border: 1px solid #3a2818;">📞 Appeler</a>
      </div>
    </div>
  </div>`;

  await resendSend({
    to: ORGANIZER_EMAIL,
    subject: `🎫 ${booking.prenom} ${booking.nom} · ${booking.qty}× ${booking.ticketName} (${totalFmt} €)`,
    html: adminHtml
  });
}

// ===== EMAIL DE VALIDATION (quand admin marque "Payé") =====
async function sendValidationEmail(booking) {
  if (!booking.email) return;
  const totalFmt = Number(booking.total).toFixed(2).replace('.', ',');
  const ticketUrl = `${SITE_URL}/ticket.html?id=${encodeURIComponent(booking.bookingId)}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(ticketUrl)}&size=300x300`;
  const waLink = `https://wa.me/${WHATSAPP_NUMBER}`;
  const telLink = `tel:+${WHATSAPP_NUMBER}`;

  const bigQrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(ticketUrl)}&size=600x600&margin=20`;
  const html = `
  <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; background: #0f0a06; color: #ede5d1; border-radius: 16px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #16a34a, #22c55e); padding: 32px 24px; text-align: center; color: white;">
      <div style="display:inline-block; width:70px; height:70px; background:white; border-radius:50%; line-height:70px; font-size:42px; color:#16a34a; margin-bottom:10px;">✓</div>
      <h1 style="margin: 0; font-size: 24px;">Paiement confirmé !</h1>
      <p style="margin: 6px 0 0; opacity: .95; font-size:15px;">Votre place est officiellement réservée 🎉</p>
    </div>

    <!-- 🎫 QR Code EN GRAND, fond blanc, en haut -->
    <div style="background: white; padding: 28px 24px; text-align: center;">
      <p style="margin: 0 0 4px; font-size: 11px; color: #8a6648; letter-spacing: 3px; text-transform: uppercase; font-weight: 700;">🎫 TON BILLET — VALIDÉ ✓</p>
      <p style="margin: 0 0 18px; font-size: 13px; color: #6b6b80;">À présenter à l'entrée du brunch</p>
      <img src="${bigQrUrl}" alt="QR code de réservation" style="width: 100%; max-width: 280px; height: auto;">
      <p style="margin: 16px 0 0; font-family: 'Courier New', monospace; font-size: 18px; font-weight: 800; color: #1a1108; letter-spacing: 1px;">${booking.bookingId}</p>
      <p style="margin: 4px 0 0; font-size: 11px; color: #8a6648; letter-spacing: 2px; text-transform: uppercase; font-weight: 600;">N° de réservation</p>
    </div>

    <div style="padding: 24px; background: #1a1108;">
      <p style="margin: 0 0 16px; font-size: 15px; color: #ede5d1; line-height: 1.6;">
        Bonjour <strong>${booking.prenom}</strong>,<br><br>
        Nous venons de valider votre paiement de <strong style="color: #c79270;">${totalFmt} €</strong>. Vous pouvez désormais venir tranquillement le <strong>${EVENT.date}</strong> 🌴
      </p>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; color: #ede5d1; background: #14100a; border-radius: 10px;">
        <tr><td style="padding: 10px 14px; color: #d4a574;">📅 Date</td><td style="padding: 10px 14px; text-align: right; font-weight: 700;">${EVENT.date} · ${EVENT.time}</td></tr>
        <tr><td style="padding: 10px 14px; color: #d4a574; border-top: 1px solid #3a2818;">📍 Lieu</td><td style="padding: 10px 14px; text-align: right; font-weight: 700; border-top: 1px solid #3a2818;">${EVENT.place}</td></tr>
        <tr><td style="padding: 10px 14px; color: #d4a574; border-top: 1px solid #3a2818;">🎫 Formule</td><td style="padding: 10px 14px; text-align: right; font-weight: 700; border-top: 1px solid #3a2818;">${booking.ticketName}</td></tr>
        <tr><td style="padding: 10px 14px; color: #d4a574; border-top: 1px solid #3a2818;">👥 Places</td><td style="padding: 10px 14px; text-align: right; font-weight: 700; border-top: 1px solid #3a2818;">${booking.qty}</td></tr>
      </table>

      <a href="${ticketUrl}" style="display:block; background: linear-gradient(135deg, #16a34a, #22c55e); color: white; text-decoration: none; padding: 16px; border-radius: 14px; font-weight: 800; font-size: 16px; text-align: center; box-shadow: 0 4px 12px rgba(22,163,74,0.3);">
        🎫 Voir mon billet en ligne
      </a>

      <p style="margin: 20px 0 0; font-size: 13px; color: #d4a574; text-align: center; line-height: 1.6;">
        💡 <strong style="color:#c79270;">Conservez ce mail</strong> ou ajoutez le lien à vos favoris — tout est là pour entrer.
      </p>
    </div>
    <div style="padding: 18px 24px; text-align: center; background: #14100a; border-top: 1px solid #3a2818;">
      <p style="margin: 0 0 10px; font-size: 11px; color: #8a6648; letter-spacing: 2px; text-transform: uppercase; font-weight: 700;">Une question ?</p>
      <a href="${waLink}" style="display: inline-block; background: #16a34a; color: white; text-decoration: none; padding: 10px 18px; border-radius: 99px; font-weight: 700; font-size: 14px; margin: 4px;">💬 WhatsApp</a>
      <a href="${telLink}" style="display: inline-block; background: #c79270; color: #1a1108; text-decoration: none; padding: 10px 18px; border-radius: 99px; font-weight: 700; font-size: 14px; margin: 4px;">📞 ${WHATSAPP_DISPLAY}</a>
    </div>
  </div>`;

  await resendSend({
    to: booking.email,
    subject: `✅ Paiement confirmé — Votre place est réservée !`,
    html
  });
}

// ============ ROUTES ============

app.get('/', (req, res) => res.send('Brunch Ébène & Saveurs API ✅'));

// 📊 TRACKING — vue d'une page (public) — attend l'insert pour remonter les erreurs
app.post('/api/track/pageview', async (req, res) => {
  try {
    const { page, sessionId, bookingId, referrer } = req.body || {};
    if (!page || !sessionId) return res.status(400).json({ error: 'missing page or sessionId' });
    const row = {
      page,
      sessionId,
      bookingId: bookingId || null,
      referrer: referrer || null,
      userAgent: (req.headers['user-agent'] || '').slice(0, 200),
      timestamp: new Date().toISOString()
    };
    try {
      await supa('pageviews', {
        method: 'POST',
        headers: { 'Prefer': 'return=minimal' },
        body: JSON.stringify(row)
      });
      console.log(`📊 pageview OK : ${page} (session=${sessionId.slice(0,14)}…)`);
      return res.json({ ok: true });
    } catch(e) {
      console.error(`❌ pageview INSERT FAIL pour "${page}" : ${e.message}`);
      return res.status(500).json({ ok: false, error: e.message });
    }
  } catch(e) {
    console.error('pageview route error:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 📊 TRACKING — événement lié à une résa (public)
//   ex: ref_copied, method_picked, payment_link_clicked, paid_clicked, payment_failed
app.post('/api/track/event/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { type, data } = req.body || {};
    if (!type) return res.status(400).json({ error: 'missing type' });
    // Fire-and-forget
    appendEvent(id, { type, data: data || null });
    res.json({ ok: true });
  } catch(e) { res.json({ ok: false }); }
});

// 📊 FUNNEL (admin) — stats des pages + conversion
//   ?from=ISO&to=ISO → filtre les pageviews sur cette période
app.get('/api/track/funnel', requireAdmin, async (req, res) => {
  try {
    const { from, to } = req.query;
    let qParts = ['select=page,sessionId,bookingId,timestamp', 'order=timestamp.desc'];
    if (from) qParts.push(`timestamp=gte.${encodeURIComponent(from)}`);
    if (to)   qParts.push(`timestamp=lt.${encodeURIComponent(to)}`);
    const path = `pageviews?${qParts.join('&')}`;
    let data = [];
    try {
      data = await supa(path) || [];
    } catch(e) {
      // Si la table n'existe pas → on retourne des stats vides + un message d'aide
      const msg = e.message || '';
      const tableMissing = msg.includes('does not exist') || msg.includes('PGRST205') || msg.includes('42P01') || msg.includes('Could not find the table');
      if (tableMissing) {
        return res.json({
          pages: {},
          totalViews: 0,
          lastViews: [],
          warning: 'TABLE_MISSING',
          message: 'La table "pageviews" n\'existe pas encore dans Supabase. Crée-la pour activer le tracking.'
        });
      }
      throw e;
    }
    const byPage = {};
    const sessionsByPage = {};
    data.forEach(v => {
      if (!byPage[v.page]) { byPage[v.page] = 0; sessionsByPage[v.page] = new Set(); }
      byPage[v.page]++;
      sessionsByPage[v.page].add(v.sessionId);
    });
    const result = {};
    Object.keys(byPage).forEach(p => {
      result[p] = { views: byPage[p], uniqueVisitors: sessionsByPage[p].size };
    });

    // 🔁 Rebond : sessions qui ont vu l'accueil mais n'ont JAMAIS continué (pas de paiement ni confirmation)
    const accueilSessions = sessionsByPage['accueil'] || new Set();
    const paiementSessions = sessionsByPage['paiement'] || new Set();
    const confirmSessions  = sessionsByPage['confirmation'] || new Set();
    let bouncedCount = 0;
    for (const sid of accueilSessions) {
      if (!paiementSessions.has(sid) && !confirmSessions.has(sid)) bouncedCount++;
    }
    const bounceRate = accueilSessions.size > 0 ? Math.round((bouncedCount / accueilSessions.size) * 100) : 0;

    res.json({
      pages: result,
      bounce: {
        count: bouncedCount,
        rate: bounceRate,
        totalAccueil: accueilSessions.size
      },
      totalViews: data.length,
      lastViews: data.slice(0, 30)
    });
  } catch(e) {
    console.error('funnel error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Stats publiques (compteur de places sur la home + formule la plus populaire)
app.get('/api/stats', async (req, res) => {
  try {
    const list = await listReservations();
    const paid = list.filter(r => r.status === 'confirmé');
    // Compte par formule (toutes résa, pas seulement payées, pour la popularité)
    const formulas = { standard: 0, duo: 0, trio: 0, groupe: 0 };
    list.forEach(r => {
      const id = (r.ticketId || 'standard').toLowerCase();
      if (formulas[id] !== undefined) formulas[id]++;
      else formulas.groupe++;
    });
    res.json({
      places: paid.reduce((s, r) => s + (r.qty || 0), 0),
      count: paid.length,
      revenue: paid.reduce((s, r) => s + (r.total || 0), 0),
      formulas
    });
  } catch (e) {
    console.error('stats error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// 🔍 Vérifie si un email a déjà une résa active (anti-doublon, public)
app.get('/api/check-email/:email', async (req, res) => {
  try {
    const email = (req.params.email || '').toLowerCase();
    if (!email.includes('@')) return res.json({ exists: false, count: 0 });
    const list = await supa(`reservations?select=bookingId,prenom,nom,status,archived&email=ilike.${encodeURIComponent(email)}`);
    const active = (list || []).filter(r => !r.archived);
    res.json({ exists: active.length > 0, count: active.length });
  } catch (e) {
    console.error('check-email error:', e.message);
    res.json({ exists: false, count: 0 });  // fail-safe : on n'empêche pas la résa
  }
});

// Vérification publique d'un billet (pour ticket.html) — infos limitées, pas d'email/tel
app.get('/api/verify/:id', async (req, res) => {
  try {
    const r = await findReservation(req.params.id);
    if (!r) return res.status(404).json({ error: 'not found' });
    res.json({
      bookingId: r.bookingId,
      prenom: r.prenom,
      nom: r.nom,
      ticketName: r.ticketName,
      ticketId: r.ticketId,
      qty: r.qty,
      status: r.status,
      archived: r.archived === true,
      cancelReason: r.cancelReason || null,
      accompagnants: r.accompagnants || null
    });
  } catch (e) {
    console.error('verify error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Liste complète (admin)
app.get('/api/reservations', requireAdmin, async (req, res) => {
  try {
    const list = await listReservations();
    res.json(list || []);
  } catch (e) {
    console.error('list error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Créer une réservation — l'ID est TOUJOURS généré côté serveur (séquentiel)
// ⚠️ AUCUN email envoyé à ce stade — le client n'a pas encore cliqué "J'ai payé"
//    Les emails partent dans POST /api/payment-method/:id (étape suivante)
app.post('/api/reservations', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.email || !b.qty || !b.nom) {
      return res.status(400).json({ error: 'missing fields (nom, email, qty)' });
    }

    // 🆕 ID séquentiel généré server-side — ignore tout bookingId envoyé par le client
    b.bookingId = await generateBookingId(b.nom);
    b.serverReceivedAt = new Date().toISOString();
    // Marqueur : résa créée mais paiement pas encore confirmé par le client
    if (!b.status) b.status = 'paiement non confirmé';

    await insertReservation(b);

    // 📭 PAS d'email ici — uniquement quand le client clique "J'ai payé"
    // 📊 PAS de sync Sheet ici — on attend la validation du paiement

    res.json({ ok: true, bookingId: b.bookingId });
  } catch (e) {
    console.error('insert error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// 🆕 Met à jour le moyen de paiement choisi par le client (public, pas d'auth)
//    Appelé depuis paiement.html quand le client clique "J'ai payé"
//    👉 C'EST ICI qu'on envoie les emails client + admin
app.post('/api/payment-method/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { method } = req.body || {};
    if (!method) return res.status(400).json({ error: 'missing method' });
    const r = await findReservation(id);
    if (!r) return res.status(404).json({ error: 'not found' });

    const patch = {
      paymentMethod: method,
      paidAt: new Date().toISOString(),
      status: 'en attente vérification'  // déclenche le bon statut visible côté admin
    };
    await patchReservation(id, patch);

    // 📧 Envoi des emails (client confirmation + admin notification)
    const updated = { ...r, ...patch };
    sendConfirmationEmails(updated).catch(err => console.error('email error', err));

    res.json({ ok: true });
  } catch(e) {
    console.error('payment-method error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Modifier le statut OU le check-in OU archivage (admin)
app.patch('/api/reservations/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const before = await findReservation(id);
    if (!before) return res.status(404).json({ error: 'not found' });

    const patch = {};
    if (req.body.status) patch.status = req.body.status;
    if (req.body.status === 'confirmé') patch.paidAt = new Date().toISOString();

    // Check-in à l'entrée (rétro-compat)
    if (typeof req.body.entered === 'boolean') {
      patch.entered = req.body.entered;
      patch.enteredAt = req.body.entered ? (req.body.enteredAt || new Date().toISOString()) : null;
    }

    // 🆕 Archivage avec motif
    if (typeof req.body.archived === 'boolean') {
      patch.archived = req.body.archived;
      patch.archivedAt = req.body.archived ? new Date().toISOString() : null;
      if (req.body.cancelReason !== undefined) patch.cancelReason = req.body.cancelReason || null;
    }

    // 🆕 Suppression partielle d'un accompagnant (réduit qty + total + accompagnants)
    if (typeof req.body.qty === 'number') patch.qty = req.body.qty;
    if (typeof req.body.total === 'number') patch.total = req.body.total;
    if (req.body.accompagnants !== undefined) patch.accompagnants = req.body.accompagnants;
    if (req.body.ticketName) patch.ticketName = req.body.ticketName;
    if (req.body.ticketId) patch.ticketId = req.body.ticketId;

    // 📝 Note admin (texte libre, jamais visible côté client)
    if (req.body.adminNote !== undefined) patch.adminNote = req.body.adminNote || null;

    await patchReservation(id, patch);

    // 🎉 Si passage à "confirmé" → envoie le mail de validation au client
    const wasNotConfirmed = before.status !== 'confirmé';
    const isNowConfirmed  = req.body.status === 'confirmé';
    console.log(`🔎 PATCH ${id} → before="${before.status}" / new="${req.body.status}" → trigger mail validation? ${wasNotConfirmed && isNowConfirmed}`);
    if (wasNotConfirmed && isNowConfirmed) {
      const updated = { ...before, ...patch };
      console.log(`📤 Envoi mail validation à ${updated.email} pour ${id}`);
      sendValidationEmail(updated)
        .then(() => console.log(`✅ Mail validation envoyé à ${updated.email}`))
        .catch(err => console.error(`❌ Mail validation ÉCHEC pour ${updated.email}:`, err.message));
    }

    // 🚫 Si passage à archivé → envoie le mail d'annulation au client
    const wasNotArchived = !before.archived;
    const isNowArchived  = req.body.archived === true;
    if (wasNotArchived && isNowArchived) {
      const updated = { ...before, ...patch };
      console.log(`📤 Envoi mail annulation à ${updated.email} pour ${id} (motif: ${req.body.cancelReason})`);
      sendCancellationEmail(updated, req.body.cancelReason)
        .then(() => console.log(`✅ Mail annulation envoyé à ${updated.email}`))
        .catch(err => console.error(`❌ Mail annulation ÉCHEC pour ${updated.email}:`, err.message));
    }

    // ✏️ Si la qty diminue (retrait d'un accompagnant) sans archivage → mail de modification
    const isQtyDecrease = typeof req.body.qty === 'number'
                        && req.body.qty < before.qty
                        && !isNowArchived;
    if (isQtyDecrease && before.email) {
      const updated = { ...before, ...patch };
      const removedName = req.body.removedName || 'Un accompagnant';
      console.log(`📤 Envoi mail modification à ${updated.email} pour ${id} (retiré: ${removedName}, ${before.qty} → ${req.body.qty})`);
      sendModificationEmail(updated, removedName, req.body.qty, before.qty)
        .then(() => console.log(`✅ Mail modification envoyé à ${updated.email}`))
        .catch(err => console.error(`❌ Mail modification ÉCHEC pour ${updated.email}:`, err.message));
    }

    // ➕ Si la qty augmente (ajout de places) → mail d'ajout
    const isQtyIncrease = typeof req.body.qty === 'number'
                        && req.body.qty > before.qty
                        && !isNowArchived;
    if (isQtyIncrease && before.email) {
      const updated = { ...before, ...patch };
      const addedCount = req.body.qty - before.qty;
      const addedNames = req.body.addedNames || '';
      console.log(`📤 Envoi mail ajout à ${updated.email} pour ${id} (+${addedCount} places, ${before.qty} → ${req.body.qty})`);
      sendAdditionEmail(updated, addedCount, addedNames, before.qty)
        .then(() => console.log(`✅ Mail ajout envoyé à ${updated.email}`))
        .catch(err => console.error(`❌ Mail ajout ÉCHEC pour ${updated.email}:`, err.message));
    }

    // 📊 Sync Google Sheet à chaque mise à jour pertinente
    const final = { ...before, ...patch };
    let action = 'update';
    if (isNowConfirmed && wasNotConfirmed) action = 'validation';      // crée la ligne dans le Sheet
    else if (req.body.archived === true)    action = 'archivage';      // marque "Annulée"
    else if (req.body.archived === false)   action = 'restauration';   // marque "Restaurée"
    else if (typeof req.body.qty === 'number' && req.body.qty !== before.qty) action = 'modification';  // marque "Modifiée"
    syncToSheet(action, final);

    res.json({ ok: true });
  } catch (e) {
    console.error('patch error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// 🆕 Check-in (incrémente enteredCount) — utilisé par scan.html
app.post('/api/checkin/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const r = await findReservation(id);
    if (!r) return res.status(404).json({ error: 'not found' });

    const currentCount = r.enteredCount || 0;
    const qty = r.qty || 1;

    if (currentCount >= qty) {
      return res.json({
        ok: false,
        full: true,
        enteredCount: currentCount,
        qty,
        message: `Déjà ${currentCount}/${qty} entré(s)`
      });
    }

    const newCount = currentCount + 1;
    const nowIso = new Date().toISOString();
    // 📝 Journal détaillé des scans (1 entrée par scan, avec timestamp)
    const prevLog = Array.isArray(r.scanLog) ? r.scanLog : [];
    const newScanLog = [...prevLog, { at: nowIso, n: newCount }];
    const patch = {
      enteredCount: newCount,
      entered: newCount >= qty,                  // rétro-compat
      enteredAt: r.enteredAt || nowIso,           // 1ère arrivée
      scanLog: newScanLog                          // 🆕 historique scan par scan
    };
    try {
      await patchReservation(id, patch);
    } catch(e) {
      // Si la colonne scanLog n'existe pas encore en BDD → retombe sur l'ancien comportement
      if (e.message && e.message.includes('scanLog')) {
        console.warn('⚠️  Colonne scanLog manquante, fallback sans journal :', e.message);
        delete patch.scanLog;
        await patchReservation(id, patch);
      } else { throw e; }
    }
    syncToSheet('check-in', { ...r, ...patch });

    res.json({
      ok: true,
      enteredCount: newCount,
      qty,
      full: newCount >= qty
    });
  } catch (e) {
    console.error('checkin error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// 🆕 Annuler le dernier check-in (decrement)
app.post('/api/checkin/:id/undo', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const r = await findReservation(id);
    if (!r) return res.status(404).json({ error: 'not found' });
    const currentCount = r.enteredCount || 0;
    if (currentCount === 0) return res.json({ ok: false, enteredCount: 0 });
    const newCount = currentCount - 1;
    const prevLog = Array.isArray(r.scanLog) ? r.scanLog : [];
    const trimmedLog = prevLog.slice(0, -1);  // retire le dernier scan
    const patch = {
      enteredCount: newCount,
      entered: false,
      enteredAt: newCount === 0 ? null : r.enteredAt,
      scanLog: trimmedLog
    };
    try {
      await patchReservation(id, patch);
    } catch(e) {
      if (e.message && e.message.includes('scanLog')) {
        delete patch.scanLog;
        await patchReservation(id, patch);
      } else { throw e; }
    }
    res.json({ ok: true, enteredCount: newCount, qty: r.qty });
  } catch (e) {
    console.error('undo checkin error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// 📧 Renvoyer le mail de validation (avec QR) au client (admin)
// Refuse si la résa n'est pas encore confirmée
app.post('/api/resend/:id', requireAdmin, async (req, res) => {
  try {
    console.log(`🔄 RESEND demandé pour ${req.params.id}`);
    const r = await findReservation(req.params.id);
    if (!r) { console.warn(`❌ Résa introuvable: ${req.params.id}`); return res.status(404).json({ error: 'not found' }); }
    if (!r.email) { console.warn(`❌ Pas d'email pour ${req.params.id}`); return res.status(400).json({ error: 'no email' }); }
    if (r.status !== 'confirmé') {
      console.warn(`❌ Résa non confirmée (status="${r.status}") pour ${req.params.id}`);
      return res.status(400).json({ error: 'Réservation non confirmée — valide d\'abord le paiement.' });
    }

    console.log(`📤 Envoi mail validation (resend manuel) à ${r.email}`);
    await sendValidationEmail(r);
    console.log(`✅ Mail validation (resend) envoyé à ${r.email}`);
    res.json({ ok: true, sent: r.email, type: 'validation' });
  } catch (e) {
    console.error(`❌ Resend ÉCHEC pour ${req.params.id}: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

// Supprimer une réservation (admin)
app.delete('/api/reservations/:id', requireAdmin, async (req, res) => {
  try {
    const before = await findReservation(req.params.id);
    if (!before) return res.status(404).json({ error: 'not found' });

    // 🚫 Envoie le mail d'annulation AVANT de supprimer (sauf si déjà archivée avec mail envoyé)
    // Si on supprime directement (sans archiver d'abord) → on prévient le client
    if (before.email && !before.archived) {
      console.log(`📤 Envoi mail annulation (suppression directe) à ${before.email} pour ${req.params.id}`);
      sendCancellationEmail(before, 'Suppression de la réservation')
        .then(() => console.log(`✅ Mail annulation (suppression) envoyé à ${before.email}`))
        .catch(err => console.error(`❌ Mail annulation (suppression) ÉCHEC:`, err.message));
    }

    await removeReservation(req.params.id);
    syncToSheet('suppression', before);
    res.json({ ok: true });
  } catch (e) {
    console.error('delete error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Brunch API running on http://localhost:${PORT}`);
  console.log(`   Supabase  : ${SUPABASE_URL ? '✓ configuré' : '✗ MANQUANT'}`);
  console.log(`   Resend    : ${RESEND_API_KEY ? '✓ configuré' : '✗ MANQUANT'}`);
});
