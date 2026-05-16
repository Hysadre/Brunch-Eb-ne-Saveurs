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
const WHATSAPP_NUMBER  = '33668295077';
const WHATSAPP_DISPLAY = '+33 6 68 29 50 77';

const EVENT = {
  name: 'Brunch Ébène & Saveurs',
  date: 'Samedi 22 août 2026',
  time: '12h00',
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
  await supa(`reservations?"bookingId"=eq.${encodeURIComponent(bookingId)}`, {
    method: 'DELETE',
    headers: { 'Prefer': 'return=minimal' }
  });
}

// ----- Auth middleware -----
function requireAdmin(req, res, next) {
  const token = req.header('X-Admin-Token');
  if (token !== ADMIN_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  next();
}

// ----- Email — Resend (primaire, domaine vérifié) ou Brevo (fallback) -----
async function sendEmail({ to, subject, html, text }) {
  const recipients = (Array.isArray(to) ? to : [to]);

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
      if (r.ok) return await r.json();
      const errText = await r.text();
      console.warn('Resend failed, trying Brevo:', errText);
    } catch(e) {
      console.warn('Resend error, trying Brevo:', e.message);
    }
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

async function sendConfirmationEmails(booking) {
  if (!booking.email) return;
  const totalFmt = Number(booking.total).toFixed(2).replace('.', ',');
  const ticketUrl = `${SITE_URL}/ticket.html?id=${encodeURIComponent(booking.bookingId)}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(ticketUrl)}&size=300x300`;
  const waLink = `https://wa.me/${WHATSAPP_NUMBER}`;
  const telLink = `tel:+${WHATSAPP_NUMBER}`;
  const adminLink = `${SITE_URL}/admin.html?id=${encodeURIComponent(booking.bookingId)}`;
  const clientWa = `https://wa.me/${(booking.telephone || '').replace(/[^0-9]/g,'').replace(/^0/, '33')}`;

  // ===== EMAIL CLIENT =====
  // Le QR est PROMINENT, en gros, sur fond blanc — clientpeut le présenter direct
  const bigQrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(ticketUrl)}&size=600x600&margin=20`;
  const clientHtml = `
  <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; background: #0f0a06; color: #f5ede1; border-radius: 16px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #16a34a, #22c55e); padding: 28px 24px; text-align: center; color: white;">
      <div style="font-size: 40px; margin-bottom: 6px;">🌴</div>
      <h1 style="margin: 0; font-size: 22px;">Réservation enregistrée !</h1>
      <p style="margin: 6px 0 0; opacity: .95;">Merci ${booking.prenom}, on a hâte de te voir 🎉</p>
    </div>

    <!-- 🎫 QR Code BIEN VISIBLE -->
    <div style="background: white; padding: 28px 24px; text-align: center;">
      <p style="margin: 0 0 4px; font-size: 11px; color: #8a6648; letter-spacing: 3px; text-transform: uppercase; font-weight: 700;">🎫 TON BILLET</p>
      <p style="margin: 0 0 18px; font-size: 13px; color: #6b6b80;">À présenter à l'entrée du brunch</p>
      <img src="${bigQrUrl}" alt="QR code de réservation" style="width: 100%; max-width: 280px; height: auto;">
      <p style="margin: 16px 0 0; font-family: 'Courier New', monospace; font-size: 18px; font-weight: 800; color: #1a1108; letter-spacing: 1px;">${booking.bookingId}</p>
      <p style="margin: 4px 0 0; font-size: 11px; color: #8a6648; letter-spacing: 2px; text-transform: uppercase; font-weight: 600;">N° de réservation</p>
    </div>

    <div style="padding: 24px; background: #1a1108;">
      <h2 style="margin: 0 0 12px; font-size: 18px; color: #fbbf24;">${EVENT.name}</h2>
      <p style="margin: 0 0 4px; color: #d4a574;">📅 ${EVENT.date} · ${EVENT.time}</p>
      <p style="margin: 0 0 16px; color: #d4a574;">📍 ${EVENT.place}</p>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; color: #f5ede1;">
        <tr><td style="padding: 6px 0; color: #d4a574;">Formule</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${booking.ticketName}</td></tr>
        <tr><td style="padding: 6px 0; color: #d4a574;">Places</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${booking.qty}</td></tr>
        <tr><td style="padding: 6px 0; color: #d4a574; border-top: 1px solid #3a2818;">Paiement</td><td style="padding: 6px 0; text-align: right; font-weight: 600; border-top: 1px solid #3a2818;">${booking.paymentMethod}</td></tr>
        <tr><td style="padding: 6px 0; color: #d4a574;">Total</td><td style="padding: 6px 0; text-align: right; font-weight: 700; font-size: 18px; color: #fbbf24;">${totalFmt} €</td></tr>
      </table>
      <a href="${ticketUrl}" style="display:block; background: linear-gradient(135deg, #f97316, #ea580c); color: white; text-decoration: none; padding: 14px; border-radius: 12px; font-weight: 700; text-align: center; font-size: 15px;">🎫 Voir mon billet en ligne</a>
      <p style="margin: 14px 0 0; font-size: 13px; color: #d4a574; text-align: center; line-height: 1.5;">
        💡 <strong style="color:#fbbf24;">Garde ce mail précieusement</strong> — il contient ton QR et ton numéro pour entrer.<br>
        ⏳ Tu recevras un 2e mail dès vérification du paiement.
      </p>
    </div>
    <div style="padding: 18px 24px; text-align: center; background: #14100a; border-top: 1px solid #3a2818;">
      <p style="margin: 0 0 10px; font-size: 11px; color: #8a6648; letter-spacing: 2px; text-transform: uppercase; font-weight: 700;">Une question ?</p>
      <a href="${waLink}" style="display: inline-block; background: #16a34a; color: white; text-decoration: none; padding: 10px 18px; border-radius: 99px; font-weight: 700; font-size: 14px; margin: 4px;">💬 WhatsApp</a>
      <a href="${telLink}" style="display: inline-block; background: #fbbf24; color: #1a1108; text-decoration: none; padding: 10px 18px; border-radius: 99px; font-weight: 700; font-size: 14px; margin: 4px;">📞 ${WHATSAPP_DISPLAY}</a>
    </div>
  </div>`;

  await resendSend({ to: booking.email, subject: `🌴 Ta réservation pour ${EVENT.name}`, html: clientHtml });

  // ===== EMAIL ADMIN =====
  const adminHtml = `
  <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; background: #0f0a06; color: #f5ede1; border-radius: 16px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #f97316, #fbbf24); padding: 24px; text-align: center; color: #1a1108;">
      <div style="font-size: 36px; margin-bottom: 6px;">🎫</div>
      <h1 style="margin: 0; font-size: 22px;">Nouvelle réservation</h1>
      <p style="margin: 6px 0 0; font-weight: 700;">${booking.prenom} ${booking.nom} · ${booking.qty} place${booking.qty>1?'s':''} · ${totalFmt} €</p>
    </div>
    <div style="padding: 24px; background: #1a1108;">
      <table style="width: 100%; border-collapse: collapse; color: #f5ede1; font-size: 14px;">
        <tr><td style="padding: 8px 0; color: #d4a574; width: 38%;">Nom complet</td><td style="padding: 8px 0; font-weight: 700;">${booking.prenom} ${booking.nom}</td></tr>
        <tr><td style="padding: 8px 0; color: #d4a574;">Email</td><td style="padding: 8px 0;"><a href="mailto:${booking.email}" style="color: #fbbf24; text-decoration: none;">${booking.email}</a></td></tr>
        <tr><td style="padding: 8px 0; color: #d4a574;">Téléphone</td><td style="padding: 8px 0;"><a href="tel:${booking.telephone}" style="color: #fbbf24; text-decoration: none;">${booking.telephone}</a> · <a href="${clientWa}" style="color: #22c55e; text-decoration: none;">WhatsApp</a></td></tr>
        <tr><td style="padding: 8px 0; color: #d4a574; border-top: 1px solid #3a2818;">Formule</td><td style="padding: 8px 0; border-top: 1px solid #3a2818; font-weight: 700;">${booking.ticketName}</td></tr>
        <tr><td style="padding: 8px 0; color: #d4a574;">Places</td><td style="padding: 8px 0; font-weight: 700;">${booking.qty}</td></tr>
        <tr><td style="padding: 8px 0; color: #d4a574;">Paiement</td><td style="padding: 8px 0; font-weight: 700; text-transform: capitalize;">${booking.paymentMethod}</td></tr>
        <tr><td style="padding: 8px 0; color: #d4a574;">Total</td><td style="padding: 8px 0; font-weight: 800; font-size: 17px; color: #fbbf24;">${totalFmt} €</td></tr>
        <tr><td style="padding: 8px 0; color: #d4a574; border-top: 1px solid #3a2818;">N° Référence</td><td style="padding: 8px 0; border-top: 1px solid #3a2818; font-family: monospace; font-weight: 700; color: #fbbf24;">${booking.bookingId}</td></tr>
        ${booking.message ? `<tr><td style="padding: 8px 0; color: #d4a574; vertical-align: top;">Allergies / Note</td><td style="padding: 8px 0; font-style: italic;">${booking.message}</td></tr>` : ''}
      </table>

      <div style="margin-top: 20px; padding: 14px; background: rgba(251, 191, 36, 0.08); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 12px; text-align: center;">
        <p style="margin: 0 0 8px; color: #fbbf24; font-weight: 700; font-size: 14px;">⏳ À vérifier dans ton app ${booking.paymentMethod || ''}</p>
        <p style="margin: 0; color: #d4a574; font-size: 12px;">Cherche la référence <strong style="color: #fbbf24;">${booking.bookingId}</strong></p>
      </div>

      <a href="${adminLink}" style="display: block; margin-top: 16px; background: linear-gradient(135deg, #f97316, #ea580c); color: white; text-decoration: none; padding: 16px; border-radius: 14px; font-weight: 800; font-size: 16px; text-align: center; box-shadow: 0 4px 12px rgba(249,115,22,0.3);">
        ✓ Voir & valider dans le dashboard →
      </a>

      <div style="margin-top: 14px; text-align: center;">
        <a href="${clientWa}" style="display: inline-block; background: #16a34a; color: white; text-decoration: none; padding: 10px 16px; border-radius: 99px; font-weight: 700; font-size: 13px; margin: 4px;">💬 WhatsApp le client</a>
        <a href="tel:${booking.telephone}" style="display: inline-block; background: #1a1108; color: #fbbf24; text-decoration: none; padding: 10px 16px; border-radius: 99px; font-weight: 700; font-size: 13px; margin: 4px; border: 1px solid #3a2818;">📞 Appeler</a>
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
  <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; background: #0f0a06; color: #f5ede1; border-radius: 16px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #16a34a, #22c55e); padding: 32px 24px; text-align: center; color: white;">
      <div style="display:inline-block; width:70px; height:70px; background:white; border-radius:50%; line-height:70px; font-size:42px; color:#16a34a; margin-bottom:10px;">✓</div>
      <h1 style="margin: 0; font-size: 24px;">Paiement confirmé !</h1>
      <p style="margin: 6px 0 0; opacity: .95; font-size:15px;">Ta place est officiellement réservée 🎉</p>
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
      <p style="margin: 0 0 16px; font-size: 15px; color: #f5ede1; line-height: 1.6;">
        Hello <strong>${booking.prenom}</strong>,<br><br>
        On vient de valider ton paiement de <strong style="color: #fbbf24;">${totalFmt} €</strong>. Tu peux désormais venir tranquille le <strong>${EVENT.date}</strong> 🌴
      </p>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; color: #f5ede1; background: #14100a; border-radius: 10px;">
        <tr><td style="padding: 10px 14px; color: #d4a574;">📅 Date</td><td style="padding: 10px 14px; text-align: right; font-weight: 700;">${EVENT.date} · ${EVENT.time}</td></tr>
        <tr><td style="padding: 10px 14px; color: #d4a574; border-top: 1px solid #3a2818;">📍 Lieu</td><td style="padding: 10px 14px; text-align: right; font-weight: 700; border-top: 1px solid #3a2818;">${EVENT.place}</td></tr>
        <tr><td style="padding: 10px 14px; color: #d4a574; border-top: 1px solid #3a2818;">🎫 Formule</td><td style="padding: 10px 14px; text-align: right; font-weight: 700; border-top: 1px solid #3a2818;">${booking.ticketName}</td></tr>
        <tr><td style="padding: 10px 14px; color: #d4a574; border-top: 1px solid #3a2818;">👥 Places</td><td style="padding: 10px 14px; text-align: right; font-weight: 700; border-top: 1px solid #3a2818;">${booking.qty}</td></tr>
      </table>

      <a href="${ticketUrl}" style="display:block; background: linear-gradient(135deg, #16a34a, #22c55e); color: white; text-decoration: none; padding: 16px; border-radius: 14px; font-weight: 800; font-size: 16px; text-align: center; box-shadow: 0 4px 12px rgba(22,163,74,0.3);">
        🎫 Voir mon billet en ligne
      </a>

      <p style="margin: 20px 0 0; font-size: 13px; color: #d4a574; text-align: center; line-height: 1.6;">
        💡 <strong style="color:#fbbf24;">Garde ce mail</strong> ou bookmark le lien ci-dessus — tout est là pour entrer.
      </p>
    </div>
    <div style="padding: 18px 24px; text-align: center; background: #14100a; border-top: 1px solid #3a2818;">
      <p style="margin: 0 0 10px; font-size: 11px; color: #8a6648; letter-spacing: 2px; text-transform: uppercase; font-weight: 700;">Une question ?</p>
      <a href="${waLink}" style="display: inline-block; background: #16a34a; color: white; text-decoration: none; padding: 10px 18px; border-radius: 99px; font-weight: 700; font-size: 14px; margin: 4px;">💬 WhatsApp</a>
      <a href="${telLink}" style="display: inline-block; background: #fbbf24; color: #1a1108; text-decoration: none; padding: 10px 18px; border-radius: 99px; font-weight: 700; font-size: 14px; margin: 4px;">📞 ${WHATSAPP_DISPLAY}</a>
    </div>
  </div>`;

  await resendSend({
    to: booking.email,
    subject: `✅ Paiement confirmé — Ta place est réservée !`,
    html
  });
}

// ============ ROUTES ============

app.get('/', (req, res) => res.send('Brunch Ébène & Saveurs API ✅'));

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
      status: r.status
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

// Créer une réservation
app.post('/api/reservations', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.bookingId || !b.email || !b.qty) {
      return res.status(400).json({ error: 'missing fields' });
    }
    // anti-doublon
    const existing = await findReservation(b.bookingId);
    if (existing) return res.json({ ok: true, duplicate: true });

    b.serverReceivedAt = new Date().toISOString();
    await insertReservation(b);

    // email async (n'attend pas)
    sendConfirmationEmails(b).catch(err => console.error('email error', err));

    res.json({ ok: true, bookingId: b.bookingId });
  } catch (e) {
    console.error('insert error:', e.message);
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

    await patchReservation(id, patch);

    // 🎉 Si passage à "confirmé" → envoie le mail de validation au client
    const wasNotConfirmed = before.status !== 'confirmé';
    const isNowConfirmed  = req.body.status === 'confirmé';
    if (wasNotConfirmed && isNowConfirmed) {
      const updated = { ...before, ...patch };
      sendValidationEmail(updated).catch(err => console.error('validation email error', err));
    }

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
    const patch = {
      enteredCount: newCount,
      entered: newCount >= qty,  // rétro-compat : entered = true quand tout le monde est entré
      enteredAt: r.enteredAt || new Date().toISOString()  // 1ère arrivée
    };
    await patchReservation(id, patch);

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
    await patchReservation(id, {
      enteredCount: newCount,
      entered: false,
      enteredAt: newCount === 0 ? null : r.enteredAt
    });
    res.json({ ok: true, enteredCount: newCount, qty: r.qty });
  } catch (e) {
    console.error('undo checkin error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Supprimer une réservation (admin)
app.delete('/api/reservations/:id', requireAdmin, async (req, res) => {
  try {
    await removeReservation(req.params.id);
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
