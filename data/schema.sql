-- ============================================================
-- Schema SQLite — Website Undangan Digital Pernikahan
-- Requirements: 9.5, 9.6, 10.4, 15.1, 16.1
-- ============================================================

-- ------------------------------------------------------------
-- Tabel: settings
-- Menyimpan konfigurasi/pengaturan umum website
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    key        TEXT NOT NULL UNIQUE,
    value      TEXT,
    updated_at TEXT DEFAULT (datetime('now','localtime'))
);

INSERT OR IGNORE INTO settings (key, value) VALUES
    ('opening_text', 'Bismillahirrahmanirrahim'),
    ('couple_hashtag', '#WeddingDay'),
    ('website_title', 'Wedding Invitation');

-- ------------------------------------------------------------
-- Tabel: couple
-- Menyimpan data mempelai pria (groom) dan wanita (bride)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS couple (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    role        TEXT NOT NULL CHECK(role IN ('groom','bride')),
    full_name   TEXT NOT NULL DEFAULT '',
    nickname    TEXT NOT NULL DEFAULT '',
    father_name TEXT NOT NULL DEFAULT '',
    mother_name TEXT NOT NULL DEFAULT '',
    photo_path  TEXT,
    updated_at  TEXT DEFAULT (datetime('now','localtime'))
);

INSERT OR IGNORE INTO couple (role) VALUES ('groom'), ('bride');

-- ------------------------------------------------------------
-- Tabel: events
-- Menyimpan detail acara akad dan resepsi
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    type           TEXT NOT NULL CHECK(type IN ('akad','resepsi')),
    event_date     TEXT,
    start_time     TEXT,
    end_time       TEXT,
    venue_name     TEXT DEFAULT '',
    address        TEXT DEFAULT '',
    maps_url       TEXT DEFAULT '',
    maps_embed_url TEXT DEFAULT '',
    updated_at     TEXT DEFAULT (datetime('now','localtime'))
);

INSERT OR IGNORE INTO events (type) VALUES ('akad'), ('resepsi');

-- ------------------------------------------------------------
-- Tabel: gallery
-- Menyimpan foto-foto galeri pernikahan
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gallery (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path  TEXT NOT NULL,
    caption    TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime'))
);

-- ------------------------------------------------------------
-- Tabel: love_story
-- Menyimpan item timeline kisah cinta mempelai
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS love_story (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT NOT NULL,
    story_date  TEXT NOT NULL,
    description TEXT DEFAULT '',
    photo_path  TEXT,
    sort_order  INTEGER DEFAULT 0,
    created_at  TEXT DEFAULT (datetime('now','localtime'))
);

-- ------------------------------------------------------------
-- Tabel: digital_envelope
-- Menyimpan data rekening untuk amplop digital
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS digital_envelope (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    bank_name      TEXT NOT NULL,
    account_holder TEXT NOT NULL,
    account_number TEXT NOT NULL,
    sort_order     INTEGER DEFAULT 0,
    created_at     TEXT DEFAULT (datetime('now','localtime'))
);

-- ------------------------------------------------------------
-- Tabel: rsvp
-- Menyimpan konfirmasi kehadiran tamu
-- Requirements: 9.5, 9.6
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rsvp (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    guest_name   TEXT NOT NULL,
    phone        TEXT DEFAULT '',
    attendance   TEXT NOT NULL CHECK(attendance IN ('hadir','tidak_hadir')),
    guest_count  INTEGER DEFAULT 1 CHECK(guest_count BETWEEN 1 AND 10),
    submitted_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at   TEXT DEFAULT (datetime('now','localtime'))
);

-- ------------------------------------------------------------
-- Tabel: guestbook
-- Menyimpan ucapan dan doa dari tamu
-- Requirements: 10.4
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS guestbook (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_name  TEXT NOT NULL,
    message      TEXT NOT NULL,
    submitted_at TEXT DEFAULT (datetime('now','localtime'))
);

-- ------------------------------------------------------------
-- Tabel: admin_users
-- Menyimpan akun admin dengan proteksi rate limiting
-- Requirements: 15.1
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_users (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    username        TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    failed_attempts INTEGER DEFAULT 0,
    locked_until    TEXT,
    last_login      TEXT,
    created_at      TEXT DEFAULT (datetime('now','localtime'))
);

-- ------------------------------------------------------------
-- Tabel: music
-- Menyimpan file musik latar belakang
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS music (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path     TEXT NOT NULL,
    original_name TEXT NOT NULL,
    is_active     INTEGER DEFAULT 1,
    uploaded_at   TEXT DEFAULT (datetime('now','localtime'))
);

-- ------------------------------------------------------------
-- Index untuk performa query
-- Requirements: 16.1
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_rsvp_guest_name  ON rsvp(guest_name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_guestbook_time   ON guestbook(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_gallery_sort     ON gallery(sort_order);
CREATE INDEX IF NOT EXISTS idx_love_story_date  ON love_story(story_date ASC);
