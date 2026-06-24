/**
 * dev-server.cjs — Local Development Server in Node.js (CommonJS format)
 * 
 * Tanggung jawab:
 *  - Menyajikan file static (HTML, CSS, JS, Images, Audios)
 *  - Menggantikan backend PHP secara penuh dengan mock API
 *  - Berinteraksi dengan data/wedding.db secara realtime menggunakan `node:sqlite`
 *  - Menginisialisasi & seed database jika belum ada
 *  - Mendukung session auth via HTTP cookie
 *  - Mendukung input RSVP, ucapan Buku Tamu, dan pengelolaan Admin secara penuh
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');
const { DatabaseSync } = require('node:sqlite');

const PORT = 8000;
const DB_PATH = path.join(__dirname, 'data', 'wedding.db');

// Inisialisasi Database
const isNewDb = !fs.existsSync(DB_PATH);
const db = new DatabaseSync(DB_PATH);

if (isNewDb) {
  console.log('Initializing SQLite database schema from schema.sql...');
  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, 'data', 'schema.sql'), 'utf-8');
    db.exec(schemaSql);
    
    console.log('Seeding initial developer data...');
    // Seed admin (password: admin123)
    db.prepare(`
      INSERT OR IGNORE INTO admin_users (username, password_hash)
      VALUES (:username, :password_hash)
    `).run({
      ':username': 'admin',
      ':password_hash': '$2y$10$vI8aWBnW3fHY.1PG90R2O.fB2t75/g.6V2yU3W90LpM.XJz3Q4E/y' // bcrypt hash untuk admin123
    });
    
    // Seed couple
    db.prepare(`
      UPDATE couple
      SET full_name = :full_name, nickname = :nickname, father_name = :father_name, mother_name = :mother_name, updated_at = datetime('now','localtime')
      WHERE role = :role
    `).run({
      ':role': 'groom',
      ':full_name': 'Ahmad Fauzi',
      ':nickname': 'Ahmad',
      ':father_name': 'Bapak Hasan',
      ':mother_name': 'Ibu Fatimah'
    });
    
    db.prepare(`
      UPDATE couple
      SET full_name = :full_name, nickname = :nickname, father_name = :father_name, mother_name = :mother_name, updated_at = datetime('now','localtime')
      WHERE role = :role
    `).run({
      ':role': 'bride',
      ':full_name': 'Siti Rahayu',
      ':nickname': 'Siti',
      ':father_name': 'Bapak Ridwan',
      ':mother_name': 'Ibu Aminah'
    });
    
    // Seed settings
    const settings = {
      'couple_hashtag': '#AhmadSitiWedding',
      'opening_text': 'Bismillahirrahmanirrahim. Dengan memohon rahmat dan ridho Allah SWT, kami mengundang Bapak/Ibu/Saudara/i untuk hadir di hari istimewa kami.',
      'website_title': 'Undangan Pernikahan Ahmad & Siti'
    };
    const stmt = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (:key, :value)");
    for (const [key, value] of Object.entries(settings)) {
      stmt.run({ ':key': key, ':value': value });
    }

    // Seed default events dates so countdown works
    db.prepare(`
      UPDATE events
      SET event_date = :event_date, start_time = :start_time, end_time = :end_time, venue_name = :venue_name, address = :address, maps_url = :maps_url, maps_embed_url = :maps_embed_url, updated_at = datetime('now','localtime')
      WHERE type = :type
    `).run({
      ':type': 'akad',
      ':event_date': new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 hari kedepan
      ':start_time': '09:00',
      ':end_time': '11:00',
      ':venue_name': 'Masjid Raya Baiturrahman',
      ':address': 'Jl. T. Umar, Banda Aceh',
      ':maps_url': 'https://maps.google.com',
      ':maps_embed_url': 'https://www.google.com/maps/embed'
    });

    db.prepare(`
      UPDATE events
      SET event_date = :event_date, start_time = :start_time, end_time = :end_time, venue_name = :venue_name, address = :address, maps_url = :maps_url, maps_embed_url = :maps_embed_url, updated_at = datetime('now','localtime')
      WHERE type = :type
    `).run({
      ':type': 'resepsi',
      ':event_date': new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      ':start_time': '11:30',
      ':end_time': '16:00',
      ':venue_name': 'Gedung Serbaguna',
      ':address': 'Jl. Teuku Nyak Arief, Banda Aceh',
      ':maps_url': 'https://maps.google.com',
      ':maps_embed_url': 'https://www.google.com/maps/embed'
    });
    
    console.log('Database initialized and seeded successfully.');
  } catch (err) {
    console.error('Gagal menginisialisasi database:', err);
  }
}

// Session store in-memory
const activeSessions = new Set();

// Helper functions
function getSessionId(req) {
  const cookieHeader = req.headers.cookie || '';
  const cookies = {};
  cookieHeader.split(';').forEach(c => {
    const parts = c.split('=');
    if (parts.length === 2) {
      cookies[parts[0].trim()] = parts[1].trim();
    }
  });
  return cookies['session_id'] || null;
}

function checkAuth(req) {
  const sessId = getSessionId(req);
  return sessId && activeSessions.has(sessId);
}

function sendJson(res, data, code = 200) {
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=UTF-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token'
  });
  res.end(JSON.stringify(data));
}

function sendError(res, code, message) {
  sendJson(res, { success: false, error: message, code }, code);
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
  });
}

// Multipart Form-Data Parser Sederhana untuk Upload File
function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    let body = Buffer.alloc(0);
    req.on('data', chunk => {
      body = Buffer.concat([body, chunk]);
    });
    req.on('end', () => {
      const contentType = req.headers['content-type'];
      const boundaryMatch = contentType.match(/boundary=(.+)/);
      if (!boundaryMatch) {
        resolve([]);
        return;
      }
      const boundary = '--' + boundaryMatch[1];
      const boundaryBuf = Buffer.from(boundary);
      const parts = [];
      let index = body.indexOf(boundaryBuf);
      
      while (index !== -1) {
        let nextIndex = body.indexOf(boundaryBuf, index + boundaryBuf.length);
        if (nextIndex === -1) break;
        
        // Ambil part buffer (potong \r\n di awal dan \r\n di akhir)
        const partBuffer = body.subarray(index + boundaryBuf.length + 2, nextIndex - 2);
        const headerEnd = partBuffer.indexOf('\r\n\r\n');
        
        if (headerEnd !== -1) {
          const headerText = partBuffer.subarray(0, headerEnd).toString('utf-8');
          const partData = partBuffer.subarray(headerEnd + 4);
          
          const disposition = headerText.match(/Content-Disposition:\s*form-data;\s*name="([^"]+)"(?:;\s*filename="([^"]+)")?/i);
          const contentTypeHeader = headerText.match(/Content-Type:\s*([^\r\n]+)/i);
          
          if (disposition) {
            parts.push({
              name: disposition[1],
              filename: disposition[2] || null,
              contentType: contentTypeHeader ? contentTypeHeader[1] : null,
              data: partData
            });
          }
        }
        index = nextIndex;
      }
      resolve(parts);
    });
    req.on('error', err => reject(err));
  });
}

function sanitizeText(str, maxLength) {
  if (!str) return '';
  const stripped = str.replace(/<[^>]*>/g, '').trim();
  return typeof maxLength === 'number' ? stripped.slice(0, maxLength) : stripped;
}

// Mime type map
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.ico': 'image/x-icon',
  '.ics': 'text/calendar; charset=utf-8'
};

// HTTP Server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  // Tangani Preflight Options Request
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token',
      'Access-Control-Max-Age': '86400'
    });
    res.end();
    return;
  }

  // API Route /api/
  if (pathname.startsWith('/api') || pathname.startsWith('/api/')) {
    const endpoint = query.endpoint || '';
    const action = query.action || '';
    const id = parseInt(query.id) || 0;

    try {
      // ── API: AUTH ─────────────────────────────────────────────────────────
      if (endpoint === 'auth') {
        if (action === 'csrf') {
          sendJson(res, { success: true, csrf_token: 'mock-csrf-token-12345' });
          return;
        }
        
        if (action === 'login' && req.method === 'POST') {
          const body = await parseJsonBody(req);
          const username = body.username ? body.username.trim() : '';
          const password = body.password ? body.password : '';
          
          if (username === 'admin' && password === 'admin123') {
            const sessId = 'sess_' + Math.random().toString(36).substring(2) + Date.now();
            activeSessions.add(sessId);
            
            res.writeHead(200, {
              'Content-Type': 'application/json; charset=UTF-8',
              'Set-Cookie': `session_id=${sessId}; Path=/; HttpOnly; SameSite=Lax`
            });
            res.end(JSON.stringify({ success: true, message: 'Login berhasil.' }));
          } else {
            sendJson(res, { success: false, error: 'Username atau password salah.' }, 401);
          }
          return;
        }

        if (action === 'logout' && req.method === 'POST') {
          const sessId = getSessionId(req);
          if (sessId) {
            activeSessions.delete(sessId);
          }
          res.writeHead(200, {
            'Content-Type': 'application/json; charset=UTF-8',
            'Set-Cookie': `session_id=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
          });
          res.end(JSON.stringify({ success: true, message: 'Logout berhasil.' }));
          return;
        }
      }

      // ── API: CONTENT (Public GET) ──────────────────────────────────────────
      if (endpoint === 'content') {
        if (req.method !== 'GET') return sendError(res, 405, 'Method tidak diizinkan.');

        // Settings
        const settingsRows = db.prepare('SELECT key, value FROM settings').all();
        const settings = {};
        settingsRows.forEach(r => { settings[r.key] = r.value; });

        // Couple
        const coupleRows = db.prepare('SELECT id, role, full_name, nickname, father_name, mother_name, photo_path, updated_at FROM couple').all();
        const couple = { groom: null, bride: null };
        coupleRows.forEach(r => { couple[r.role] = r; });

        // Events
        const eventRows = db.prepare('SELECT id, type, event_date, start_time, end_time, venue_name, address, maps_url, maps_embed_url, updated_at FROM events').all();
        const events = { akad: null, resepsi: null };
        eventRows.forEach(r => { events[r.type] = r; });

        // Gallery
        const gallery = db.prepare('SELECT id, file_path, caption, sort_order, created_at FROM gallery ORDER BY sort_order ASC, id ASC').all();

        // Love Story
        const love_story = db.prepare('SELECT id, title, story_date, description, photo_path, sort_order, created_at FROM love_story ORDER BY story_date ASC, id ASC').all();

        // Envelope
        const envelope = db.prepare('SELECT id, bank_name, account_holder, account_number, sort_order, created_at FROM digital_envelope ORDER BY sort_order ASC, id ASC').all();

        // Music
        const musicRow = db.prepare('SELECT id, file_path, original_name, is_active, uploaded_at FROM music WHERE is_active = 1 ORDER BY uploaded_at DESC, id DESC LIMIT 1').get();
        const music = musicRow || null;

        sendJson(res, {
          success: true,
          data: { settings, couple, events, gallery, love_story, digital_envelope: envelope, music }
        });
        return;
      }

      // ── API: GUESTBOOK (Public GET & POST, Admin DELETE) ───────────────────
      if (endpoint === 'guestbook') {
        if (req.method === 'GET') {
          let page = parseInt(query.page) || 1;
          let limit = parseInt(query.limit) || 20;
          if (page < 1) page = 1;
          if (limit < 1) limit = 1;
          if (limit > 100) limit = 100;
          const offset = (page - 1) * limit;

          const totalRow = db.prepare('SELECT COUNT(*) AS total FROM guestbook').get();
          const total = totalRow.total;
          const total_pages = Math.ceil(total / limit);

          const items = db.prepare(`
            SELECT id, sender_name, message, submitted_at
            FROM guestbook
            ORDER BY submitted_at DESC
            LIMIT :limit OFFSET :offset
          `).all({ ':limit': limit, ':offset': offset });

          sendJson(res, {
            success: true,
            data: { items, pagination: { page, limit, total, total_pages } }
          });
          return;
        }

        if (req.method === 'POST') {
          const body = await parseJsonBody(req);
          const sender_name = sanitizeText(body.sender_name, 100);
          const message = sanitizeText(body.message, 500);

          if (!sender_name) return sendJson(res, { success: false, error: 'Validasi gagal.', fields: { sender_name: 'Nama pengirim tidak boleh kosong.' } }, 422);
          if (!message) return sendJson(res, { success: false, error: 'Validasi gagal.', fields: { message: 'Pesan tidak boleh kosong.' } }, 422);

          const r = db.prepare(`
            INSERT INTO guestbook (sender_name, message, submitted_at)
            VALUES (:sender_name, :message, datetime('now','localtime'))
          `).run({ ':sender_name': sender_name, ':message': message });

          const newId = r.lastInsertRowid;
          const newItem = db.prepare('SELECT * FROM guestbook WHERE id = ?').get(newId);

          sendJson(res, {
            success: true,
            message: 'Ucapan berhasil dikirim.',
            data: newItem
          }, 201);
          return;
        }

        if (req.method === 'DELETE') {
          if (!checkAuth(req)) return sendError(res, 401, 'Unauthorized');
          if (id <= 0) return sendError(res, 400, 'ID tidak valid');

          db.prepare('DELETE FROM guestbook WHERE id = ?').run(id);
          sendJson(res, { success: true, message: 'Ucapan berhasil dihapus.' });
          return;
        }
      }

      // ── API: RSVP (Public POST, Admin GET, DELETE, EXPORT) ──────────────────
      if (endpoint === 'rsvp') {
        if (req.method === 'POST') {
          const body = await parseJsonBody(req);
          const guest_name = sanitizeText(body.guest_name, 100);
          const attendance = sanitizeText(body.attendance, 20);
          const phone = sanitizeText(body.phone, 20);
          const guest_count = parseInt(body.guest_count) || 1;

          if (!guest_name) return sendJson(res, { success: false, error: 'Nama wajib diisi.', fields: { guest_name: 'Nama wajib diisi.' } }, 422);
          if (attendance !== 'hadir' && attendance !== 'tidak_hadir') return sendJson(res, { success: false, error: 'Kehadiran tidak valid.', fields: { attendance: 'Format salah.' } }, 422);
          if (guest_count < 1 || guest_count > 10) return sendJson(res, { success: false, error: 'Jumlah tamu tidak valid.', fields: { guest_count: 'Batas 1-10.' } }, 422);

          // Cek existing case-insensitive
          const existing = db.prepare('SELECT id FROM rsvp WHERE LOWER(guest_name) = LOWER(:name)').get({ ':name': guest_name });
          
          if (existing) {
            db.prepare(`
              UPDATE rsvp 
              SET guest_name = :name, phone = :phone, attendance = :attendance, guest_count = :count, updated_at = datetime('now','localtime')
              WHERE id = :id
            `).run({
              ':name': guest_name,
              ':phone': phone,
              ':attendance': attendance,
              ':count': guest_count,
              ':id': existing.id
            });
            sendJson(res, {
              success: true,
              message: 'RSVP berhasil diperbarui.',
              data: { id: existing.id, guest_name, attendance, guest_count }
            });
          } else {
            const r = db.prepare(`
              INSERT INTO rsvp (guest_name, phone, attendance, guest_count, submitted_at, updated_at)
              VALUES (:name, :phone, :attendance, :count, datetime('now','localtime'), datetime('now','localtime'))
            `).run({
              ':name': guest_name,
              ':phone': phone,
              ':attendance': attendance,
              ':count': guest_count
            });
            sendJson(res, {
              success: true,
              message: 'RSVP berhasil dikirim.',
              data: { id: r.lastInsertRowid, guest_name, attendance, guest_count }
            }, 201);
          }
          return;
        }

        // Semua route admin rsvp butuh login
        if (!checkAuth(req)) {
          res.writeHead(302, { 'Location': '/admin/login.html' });
          res.end();
          return;
        }

        if (req.method === 'GET') {
          if (action === 'export') {
            const rsvps = db.prepare('SELECT guest_name, phone, attendance, guest_count, submitted_at FROM rsvp ORDER BY submitted_at DESC').all();
            let csv = 'Nama Tamu,Nomor Telepon,Kehadiran,Jumlah Tamu,Tanggal Mengirim\n';
            rsvps.forEach(r => {
              csv += `"${r.guest_name.replace(/"/g, '""')}","${r.phone}","${r.attendance}",${r.guest_count},"${r.submitted_at}"\n`;
            });
            res.writeHead(200, {
              'Content-Type': 'text/csv; charset=utf-8',
              'Content-Disposition': 'attachment; filename=rsvp_export.csv'
            });
            res.end(csv);
            return;
          }

          const rsvps = db.prepare('SELECT * FROM rsvp ORDER BY submitted_at DESC').all();
          sendJson(res, { success: true, data: rsvps });
          return;
        }

        if (req.method === 'DELETE') {
          if (id <= 0) return sendError(res, 400, 'ID tidak valid');
          db.prepare('DELETE FROM rsvp WHERE id = ?').run(id);
          sendJson(res, { success: true, message: 'RSVP berhasil dihapus.' });
          return;
        }
      }

      // Mulai dari sini adalah Modul Admin (Butuh Auth)
      if (!checkAuth(req)) {
        res.writeHead(302, { 'Location': '/admin/login.html' });
        res.end();
        return;
      }

      // ── API: DASHBOARD STATS ────────────────────────────────────────────────
      if (endpoint === 'dashboard') {
        if (req.method !== 'GET') return sendError(res, 405, 'Method tidak diizinkan.');
        
        const hadir = db.prepare("SELECT COUNT(*) AS total FROM rsvp WHERE attendance = 'hadir'").get().total;
        const tidak_hadir = db.prepare("SELECT COUNT(*) AS total FROM rsvp WHERE attendance = 'tidak_hadir'").get().total;
        const total_gb = db.prepare("SELECT COUNT(*) AS total FROM guestbook").get().total;

        sendJson(res, {
          success: true,
          data: {
            rsvp_hadir: hadir,
            rsvp_tidak_hadir: tidak_hadir,
            total_guestbook: total_gb
          }
        });
        return;
      }

      // ── API: SETTINGS (PUT) ────────────────────────────────────────────────
      if (endpoint === 'settings') {
        if (req.method === 'PUT') {
          const body = await parseJsonBody(req);
          const allowedKeys = {
            'opening_text': 500,
            'couple_hashtag': 100,
            'website_title': 200
          };

          const stmt = db.prepare('UPDATE settings SET value = :value, updated_at = datetime("now","localtime") WHERE key = :key');
          for (const [key, maxLen] of Object.entries(allowedKeys)) {
            if (key in body) {
              const val = sanitizeText(body[key], maxLen);
              stmt.run({ ':value': val, ':key': key });
            }
          }

          const settingsRows = db.prepare('SELECT key, value FROM settings').all();
          const settings = {};
          settingsRows.forEach(r => { settings[r.key] = r.value; });

          sendJson(res, { success: true, message: 'Pengaturan berhasil diperbarui.', data: settings });
          return;
        }
      }

      // ── API: COUPLE (PUT & POST Photo) ─────────────────────────────────────
      if (endpoint === 'couple') {
        const role = query.role;
        if (role !== 'groom' && role !== 'bride') return sendError(res, 400, 'Role tidak valid.');

        if (req.method === 'PUT') {
          const body = await parseJsonBody(req);
          const full_name = sanitizeText(body.full_name, 100);
          const nickname = sanitizeText(body.nickname, 50);
          const father_name = sanitizeText(body.father_name, 100);
          const mother_name = sanitizeText(body.mother_name, 100);

          if (!full_name) return sendError(res, 400, 'Nama lengkap tidak boleh kosong.');

          db.prepare(`
            UPDATE couple
            SET full_name = :full_name, nickname = :nickname, father_name = :father_name, mother_name = :mother_name, updated_at = datetime('now','localtime')
            WHERE role = :role
          `).run({
            ':full_name': full_name,
            ':nickname': nickname,
            ':father_name': father_name,
            ':mother_name': mother_name,
            ':role': role
          });

          const data = db.prepare('SELECT * FROM couple WHERE role = ?').get(role);
          sendJson(res, { success: true, data, message: 'Data mempelai berhasil diperbarui.' });
          return;
        }

        if (req.method === 'POST' && action === 'photo') {
          const parts = await parseMultipart(req);
          const photoPart = parts.find(p => p.name === 'photo');
          if (!photoPart || !photoPart.filename) {
            return sendError(res, 400, 'File foto tidak ditemukan dalam request.');
          }

          // Simpan foto
          const ext = path.extname(photoPart.filename) || '.jpg';
          const randName = Math.random().toString(36).substring(2, 10) + Date.now().toString(36) + ext;
          const relativePath = `uploads/couple/${randName}`;
          const absolutePath = path.join(__dirname, relativePath);

          // Buat direktori jika belum ada
          fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
          fs.writeFileSync(absolutePath, photoPart.data);

          // Update database
          db.prepare(`
            UPDATE couple
            SET photo_path = :photo_path, updated_at = datetime('now','localtime')
            WHERE role = :role
          `).run({
            ':photo_path': relativePath,
            ':role': role
          });

          const data = db.prepare('SELECT * FROM couple WHERE role = ?').get(role);
          sendJson(res, { success: true, data, message: 'Foto mempelai berhasil diunggah.' });
          return;
        }
      }

      // ── API: EVENTS (PUT) ──────────────────────────────────────────────────
      if (endpoint === 'events') {
        const type = query.type;
        if (type !== 'akad' && type !== 'resepsi') return sendError(res, 400, 'Tipe acara tidak valid.');

        if (req.method === 'PUT') {
          const body = await parseJsonBody(req);
          const event_date = sanitizeText(body.event_date, 20);
          const start_time = sanitizeText(body.start_time, 10);
          const end_time = sanitizeText(body.end_time, 10);
          const venue_name = sanitizeText(body.venue_name, 100);
          const address = sanitizeText(body.address, 500);
          const maps_url = sanitizeText(body.maps_url, 1000);
          const maps_embed_url = sanitizeText(body.maps_embed_url, 1000);

          db.prepare(`
            UPDATE events
            SET event_date = :event_date, start_time = :start_time, end_time = :end_time,
                venue_name = :venue_name, address = :address, maps_url = :maps_url, maps_embed_url = :maps_embed_url,
                updated_at = datetime('now','localtime')
            WHERE type = :type
          `).run({
            ':event_date': event_date,
            ':start_time': start_time,
            ':end_time': end_time,
            ':venue_name': venue_name,
            ':address': address,
            ':maps_url': maps_url,
            ':maps_embed_url': maps_embed_url,
            ':type': type
          });

          const data = db.prepare('SELECT * FROM events WHERE type = ?').get(type);
          sendJson(res, { success: true, data, message: 'Detail acara berhasil diperbarui.' });
          return;
        }
      }

      // ── API: GALLERY (POST Upload & DELETE) ────────────────────────────────
      if (endpoint === 'gallery') {
        if (req.method === 'POST') {
          const parts = await parseMultipart(req);
          const photoPart = parts.find(p => p.name === 'photo');
          const captionPart = parts.find(p => p.name === 'caption');
          const sortPart = parts.find(p => p.name === 'sort_order');

          if (!photoPart || !photoPart.filename) {
            return sendError(res, 400, 'File foto tidak ditemukan.');
          }

          const caption = captionPart ? sanitizeText(captionPart.data.toString('utf-8'), 200) : '';
          const sort_order = sortPart ? parseInt(sortPart.data.toString('utf-8')) || 0 : 0;

          // Simpan foto
          const ext = path.extname(photoPart.filename) || '.jpg';
          const randName = Math.random().toString(36).substring(2, 10) + Date.now().toString(36) + ext;
          const relativePath = `uploads/gallery/${randName}`;
          const absolutePath = path.join(__dirname, relativePath);

          fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
          fs.writeFileSync(absolutePath, photoPart.data);

          db.prepare(`
            INSERT INTO gallery (file_path, caption, sort_order, created_at)
            VALUES (:file_path, :caption, :sort_order, datetime('now','localtime'))
          `).run({
            ':file_path': relativePath,
            ':caption': caption,
            ':sort_order': sort_order
          });

          sendJson(res, { success: true, message: 'Foto galeri berhasil ditambahkan.' }, 201);
          return;
        }

        if (req.method === 'DELETE') {
          if (id <= 0) return sendError(res, 400, 'ID tidak valid.');

          const row = db.prepare('SELECT file_path FROM gallery WHERE id = ?').get(id);
          if (!row) return sendError(res, 404, 'Foto tidak ditemukan.');

          db.prepare('DELETE FROM gallery WHERE id = ?').run(id);

          // Hapus file fisik
          const absolutePath = path.join(__dirname, row.file_path);
          if (fs.existsSync(absolutePath)) {
            fs.unlinkSync(absolutePath);
          }

          sendJson(res, { success: true, message: 'Foto galeri berhasil dihapus.' });
          return;
        }
      }

      // ── API: LOVE STORY (POST, PUT, DELETE) ───────────────────────────────
      if (endpoint === 'love-story') {
        if (req.method === 'POST') {
          const parts = await parseMultipart(req);
          const titlePart = parts.find(p => p.name === 'title');
          const datePart = parts.find(p => p.name === 'story_date');
          const descPart = parts.find(p => p.name === 'description');
          const photoPart = parts.find(p => p.name === 'photo');
          const sortPart = parts.find(p => p.name === 'sort_order');

          const title = titlePart ? sanitizeText(titlePart.data.toString('utf-8'), 100) : '';
          const story_date = datePart ? sanitizeText(datePart.data.toString('utf-8'), 20) : '';
          const description = descPart ? sanitizeText(descPart.data.toString('utf-8'), 500) : '';
          const sort_order = sortPart ? parseInt(sortPart.data.toString('utf-8')) || 0 : 0;

          if (!title || !story_date) {
            return sendError(res, 400, 'Judul dan Tanggal tidak boleh kosong.');
          }

          let relativePath = null;
          if (photoPart && photoPart.filename && photoPart.data.length > 0) {
            const ext = path.extname(photoPart.filename) || '.jpg';
            const randName = Math.random().toString(36).substring(2, 10) + Date.now().toString(36) + ext;
            relativePath = `uploads/love-story/${randName}`;
            const absolutePath = path.join(__dirname, relativePath);

            fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
            fs.writeFileSync(absolutePath, photoPart.data);
          }

          db.prepare(`
            INSERT INTO love_story (title, story_date, description, photo_path, sort_order, created_at)
            VALUES (:title, :story_date, :description, :photo_path, :sort_order, datetime('now','localtime'))
          `).run({
            ':title': title,
            ':story_date': story_date,
            ':description': description,
            ':photo_path': relativePath,
            ':sort_order': sort_order
          });

          sendJson(res, { success: true, message: 'Item love story berhasil ditambahkan.' }, 201);
          return;
        }

        if (req.method === 'PUT') {
          if (id <= 0) return sendError(res, 400, 'ID tidak valid.');
          const body = await parseJsonBody(req);

          const existing = db.prepare('SELECT * FROM love_story WHERE id = ?').get(id);
          if (!existing) return sendError(res, 404, 'Item love story tidak ditemukan.');

          const title = sanitizeText(body.title !== undefined ? body.title : existing.title, 100);
          const story_date = sanitizeText(body.story_date !== undefined ? body.story_date : existing.story_date, 20);
          const description = sanitizeText(body.description !== undefined ? body.description : existing.description, 500);
          const sort_order = body.sort_order !== undefined ? parseInt(body.sort_order) || 0 : existing.sort_order;

          db.prepare(`
            UPDATE love_story
            SET title = :title, story_date = :story_date, description = :description, sort_order = :sort_order
            WHERE id = :id
          `).run({
            ':title': title,
            ':story_date': story_date,
            ':description': description,
            ':sort_order': sort_order,
            ':id': id
          });

          sendJson(res, { success: true, message: 'Item love story berhasil diperbarui.' });
          return;
        }

        if (req.method === 'DELETE') {
          if (id <= 0) return sendError(res, 400, 'ID tidak valid.');
          
          const row = db.prepare('SELECT photo_path FROM love_story WHERE id = ?').get(id);
          if (!row) return sendError(res, 404, 'Item tidak ditemukan.');

          db.prepare('DELETE FROM love_story WHERE id = ?').run(id);

          if (row.photo_path) {
            const absolutePath = path.join(__dirname, row.photo_path);
            if (fs.existsSync(absolutePath)) {
              fs.unlinkSync(absolutePath);
            }
          }

          sendJson(res, { success: true, message: 'Item love story berhasil dihapus.' });
          return;
        }
      }

      // ── API: DIGITAL ENVELOPE (POST, PUT, DELETE) ─────────────────────────
      if (endpoint === 'envelope') {
        if (req.method === 'POST') {
          const body = await parseJsonBody(req);
          const bank_name = sanitizeText(body.bank_name, 100);
          const account_holder = sanitizeText(body.account_holder, 50);
          const account_number = sanitizeText(body.account_number, 50);
          const sort_order = parseInt(body.sort_order) || 0;

          if (!bank_name || !account_holder || !account_number) {
            return sendError(res, 400, 'Semua field wajib diisi.');
          }

          db.prepare(`
            INSERT INTO digital_envelope (bank_name, account_holder, account_number, sort_order, created_at)
            VALUES (:bank, :holder, :number, :sort, datetime('now','localtime'))
          `).run({
            ':bank': bank_name,
            ':holder': account_holder,
            ':number': account_number,
            ':sort': sort_order
          });

          sendJson(res, { success: true, message: 'Rekening baru berhasil ditambahkan.' }, 201);
          return;
        }

        if (req.method === 'PUT') {
          if (id <= 0) return sendError(res, 400, 'ID tidak valid.');
          const body = await parseJsonBody(req);

          const existing = db.prepare('SELECT * FROM digital_envelope WHERE id = ?').get(id);
          if (!existing) return sendError(res, 404, 'Rekening tidak ditemukan.');

          const bank_name = sanitizeText(body.bank_name !== undefined ? body.bank_name : existing.bank_name, 100);
          const account_holder = sanitizeText(body.account_holder !== undefined ? body.account_holder : existing.account_holder, 50);
          const account_number = sanitizeText(body.account_number !== undefined ? body.account_number : existing.account_number, 50);
          const sort_order = body.sort_order !== undefined ? parseInt(body.sort_order) || 0 : existing.sort_order;

          db.prepare(`
            UPDATE digital_envelope
            SET bank_name = :bank, account_holder = :holder, account_number = :number, sort_order = :sort
            WHERE id = :id
          `).run({
            ':bank': bank_name,
            ':holder': account_holder,
            ':number': account_number,
            ':sort': sort_order,
            ':id': id
          });

          sendJson(res, { success: true, message: 'Rekening berhasil diperbarui.' });
          return;
        }

        if (req.method === 'DELETE') {
          if (id <= 0) return sendError(res, 400, 'ID tidak valid.');
          db.prepare('DELETE FROM digital_envelope WHERE id = ?').run(id);
          sendJson(res, { success: true, message: 'Rekening berhasil dihapus.' });
          return;
        }
      }

      // ── API: MUSIC (POST Upload & DELETE) ──────────────────────────────────
      if (endpoint === 'music') {
        if (req.method === 'POST') {
          const parts = await parseMultipart(req);
          const musicPart = parts.find(p => p.name === 'music');
          if (!musicPart || !musicPart.filename) {
            return sendError(res, 400, 'File musik tidak ditemukan.');
          }

          // Simpan musik
          const ext = path.extname(musicPart.filename) || '.mp3';
          const randName = Math.random().toString(36).substring(2, 10) + Date.now().toString(36) + ext;
          const relativePath = `uploads/music/${randName}`;
          const absolutePath = path.join(__dirname, relativePath);

          fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
          fs.writeFileSync(absolutePath, musicPart.data);

          // Nonaktifkan musik lama
          db.exec("UPDATE music SET is_active = 0");

          // Tambah musik baru
          db.prepare(`
            INSERT INTO music (file_path, original_name, is_active, uploaded_at)
            VALUES (:file_path, :original_name, 1, datetime('now','localtime'))
          `).run({
            ':file_path': relativePath,
            ':original_name': musicPart.filename
          });

          sendJson(res, { success: true, message: 'Musik latar berhasil diunggah.' }, 201);
          return;
        }

        if (req.method === 'DELETE') {
          // Cari musik aktif
          const activeRow = db.prepare('SELECT id, file_path FROM music WHERE is_active = 1').get();
          if (!activeRow) return sendError(res, 404, 'Tidak ada musik aktif.');

          db.prepare('DELETE FROM music WHERE id = ?').run(activeRow.id);

          const absolutePath = path.join(__dirname, activeRow.file_path);
          if (fs.existsSync(absolutePath)) {
            fs.unlinkSync(absolutePath);
          }

          sendJson(res, { success: true, message: 'Musik latar berhasil dihapus.' });
          return;
        }
      }

      // Jika endpoint tidak cocok dengan apapun
      sendError(res, 404, `Endpoint '/api/?endpoint=${endpoint}' tidak ditemukan.`);

    } catch (err) {
      console.error('API Error:', err);
      sendError(res, 500, 'Terjadi kesalahan internal server.');
    }
    return;
  }

  // --- STATIC FILES ROUTE ---
  let filePath = path.join(__dirname, pathname);
  
  // Jika path adalah root atau folder, sajikan index.html
  if (pathname === '/' || pathname === '') {
    filePath = path.join(__dirname, 'index.html');
  } else if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  // Cek apakah file static ada di disk
  if (fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    
    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end('Sorry, check with the site admin for error: ' + err.code + ' ..\n');
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      }
    });
  } else {
    // File tidak ditemukan
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>404 Halaman Tidak Ditemukan</h1><p>Pastikan path file static yang diminta sudah benar.</p>');
  }
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Development server is running at:`);
  console.log(`   👉 http://localhost:${PORT}`);
  console.log(`   👉 http://localhost:${PORT}?to=NamaTamu (untuk test Guest name)`);
  console.log(`   👉 http://localhost:${PORT}/admin/ (untuk login Admin)`);
  console.log(`======================================================\n`);
  console.log(`ℹ️ Login Admin: username 'admin', password 'admin123'`);
  console.log(`Press Ctrl+C to stop the server.\n`);
});
