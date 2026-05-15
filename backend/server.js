/**
 * Backend Brunch Ébène & Saveurs
 * --------------------------------
 * API Express simple pour stocker et lire les réservations.
 * Stockage : fichier JSON local (dev) OU base SQLite (prod).
 *
 * Démarrer en local :
 *   npm install
 *   node server.js
 * → écoute sur http://localhost:3000
 *
 * Endpoints :
 *   GET  /api/stats          → { places, count, revenue }
 *   GET  /api/reservations   → liste complète (header X-Admin-Token requis)
 *   POST /api/reservations   → enregistre une nouvelle résa
 *   PATCH /api/reservations/:id → modifie le statut (X-Admin-Token requis)
 */

import express from 'express';
import cors from 'cors';
import fs from 'node:fs/promises';
import path from 'node:path';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, 'reservations.json');

// 🔧 CONFIG — à mettre dans les variables d'environnement en prod
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'ebene2026';
const PORT = process.env.PORT || 3000;
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const ORGANIZER_EMAIL = process.env.ORGANIZER_EMAIL || 'abayoassi@gmail.com';
const EVENT = {
  name: 'Brunch Ébène & Saveurs',
  date: 'Samedi 22 août 2026',
  time: '12h00',
  place: 'Salle de Ronchin, 59790 Ronchin (Lille)'
};

const app = express();
app.use(cors());                        // autorise les appels depuis GitHub Pages
app.use(express.json({ limit: '50kb' }));

// ----- Storage helpers -----
async function readAll() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
async function writeAll(list) {
  await fs.writeFile(DATA_FILE, JSON.stringify(list, null, 2));
}

// ----- Auth middleware -----
function requireAdmin(req, res, next) {
  const token = req.header('X-Admin-Token');
  if (token !== ADMIN_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  next();
}

// ----- Email -----
let transporter = null;
if (SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
}

async function sendConfirmationEmail(booking) {
  if (!transporter || !booking.email) return;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(booking.bookingId)}&size=300x300`;
  const totalFmt = Number(booking.total).toFixed(2).replace('.', ',');

  const html = `
  <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; background: #0f0a06; color: #f5ede1; border-radius: 16px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #16a34a, #22c55e); padding: 32px 24px; text-align: center; color: white;">
      <div style="font-size: 48px; margin-bottom: 8px;">🌴</div>
      <h1 style="margin: 0; font-size: 24px;">Réservation enregistrée !</h1>
      <p style="margin: 8px 0 0; opacity: .95;">Merci ${booking.prenom}, on a hâte de te voir 🎉</p>
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
      <div style="text-align: center; padding: 20px; background: white; border-radius: 12px;">
        <img src="${qrUrl}" alt="QR" style="max-width: 200px;">
        <p style="margin: 12px 0 0; font-family: monospace; font-size: 16px; font-weight: 700; color: #1a1108;">${booking.bookingId}</p>
      </div>
      <p style="margin: 16px 0 0; font-size: 13px; color: #d4a574; text-align: center;">
        ⏳ Tu recevras un second mail dès vérification du paiement.
      </p>
    </div>
    <div style="padding: 16px 24px; text-align: center; font-size: 12px; color: #8a6648;">
      Une question ? Réponds simplement à cet email.
    </div>
  </div>`;

  await transporter.sendMail({
    from: `Brunch Ébène & Saveurs <${SMTP_USER}>`,
    to: booking.email,
    subject: `🌴 Ta réservation pour ${EVENT.name}`,
    html
  });

  // Notif admin
  await transporter.sendMail({
    from: `Réservations <${SMTP_USER}>`,
    to: ORGANIZER_EMAIL,
    subject: `🎫 +${booking.qty} (${booking.ticketName}) — ${booking.prenom} ${booking.nom}`,
    text: `Nouvelle réservation :\n\n${JSON.stringify(booking, null, 2)}`
  });
}

// ----- Routes -----
app.get('/', (req, res) => res.send('Brunch Ébène & Saveurs API ✅'));

// Stats publiques (pour le compteur de places sur la home)
app.get('/api/stats', async (req, res) => {
  const list = await readAll();
  const places = list.reduce((s, r) => s + (r.qty || 0), 0);
  const count = list.length;
  const revenue = list.reduce((s, r) => s + (r.total || 0), 0);
  res.json({ places, count, revenue });
});

// Liste complète (admin)
app.get('/api/reservations', requireAdmin, async (req, res) => {
  const list = await readAll();
  res.json(list);
});

// Nouvelle réservation
app.post('/api/reservations', async (req, res) => {
  const b = req.body || {};
  if (!b.bookingId || !b.email || !b.qty) {
    return res.status(400).json({ error: 'missing fields' });
  }
  const list = await readAll();
  // anti-doublon
  if (list.find(x => x.bookingId === b.bookingId)) {
    return res.json({ ok: true, duplicate: true });
  }
  b.serverReceivedAt = new Date().toISOString();
  list.push(b);
  await writeAll(list);

  // email async (n'attend pas)
  sendConfirmationEmail(b).catch(err => console.error('email error', err));

  res.json({ ok: true, bookingId: b.bookingId });
});

// Modifier le statut (admin)
app.patch('/api/reservations/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const list = await readAll();
  const r = list.find(x => x.bookingId === id);
  if (!r) return res.status(404).json({ error: 'not found' });
  r.status = status || r.status;
  await writeAll(list);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`✅ Brunch API running on http://localhost:${PORT}`);
});
