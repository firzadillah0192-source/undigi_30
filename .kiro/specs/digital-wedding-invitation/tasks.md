# Implementation Plan: Website Undangan Digital Pernikahan

## Overview

Implementasi dilakukan secara bertahap mengikuti urutan: setup project â†’ database â†’ backend PHP (includes + API) â†’ frontend Guest Page (HTML/CSS/animasi/JS) â†’ Admin Panel â†’ testing â†’ konfigurasi deployment. Setiap tahap membangun di atas tahap sebelumnya sehingga tidak ada kode yang tergantung tanpa integrasi.

**Stack:** PHP 7.4+ Â· SQLite via PDO Â· HTML5/CSS3/Vanilla JS (ES6+) Â· GSAP + ScrollTrigger Â· tsParticles Â· Vitest + fast-check Â· PHPUnit + Eris

---

## Tasks

- [x] 1. Setup Struktur Project dan Konfigurasi
  - [x] 1.1 Buat struktur folder lengkap sesuai desain
    - Buat folder: `admin/`, `api/`, `assets/css/`, `assets/js/`, `assets/images/ornaments/`, `uploads/couple/`, `uploads/gallery/`, `uploads/love-story/`, `uploads/music/`, `data/`, `includes/`, `tests/unit/`, `tests/properties/`, `tests/php/`
    - Buat file `.gitkeep` di setiap folder kosong agar folder terlacak di git
    - _Requirements: 18.4_

  - [x] 1.2 Buat file konfigurasi global `includes/config.php`
    - Definisikan konstanta: `DB_PATH`, `UPLOAD_BASE`, `MAX_IMAGE_SIZE` (5 MB), `MAX_AUDIO_SIZE` (10 MB), `ALLOWED_IMAGE_TYPES`, `ALLOWED_AUDIO_TYPES`, `SESSION_LIFETIME` (7200 detik), `LOGIN_MAX_ATTEMPTS` (5), `LOGIN_LOCKOUT_MINUTES` (15)
    - Tambahkan header CORS dan Content-Type JSON default
    - _Requirements: 13.5, 15.6, 19.5_

  - [x] 1.3 Buat file `vitest.config.js` dan `package.json` untuk toolchain JS testing
    - Install devDependencies: `vitest`, `@fast-check/vitest`, `jsdom`
    - Konfigurasi `configureGlobal({ numRuns: 100, verbose: true })` di vitest setup
    - Buat `vitest.config.js` dengan environment `jsdom` dan setup file
    - _Requirements: 18.4_

  - [x] 1.4 Buat file `composer.json` dan install dependensi PHP testing
    - Tambahkan `phpunit/phpunit` dan `giorgiosironi/eris` sebagai dev dependencies
    - Buat `phpunit.xml` dengan konfigurasi test suite untuk `tests/php/`
    - _Requirements: 18.4_


- [x] 2. Database: Schema SQLite dan Seeder
  - [x] 2.1 Buat file migrasi `data/schema.sql` dengan DDL lengkap
    - Tulis semua `CREATE TABLE IF NOT EXISTS` sesuai desain: `settings`, `couple`, `events`, `gallery`, `love_story`, `digital_envelope`, `rsvp`, `guestbook`, `admin_users`, `music`
    - Tambahkan semua `INSERT OR IGNORE` untuk seed data awal (`couple` dua baris, `events` dua baris, `settings` tiga baris)
    - Tambahkan semua `CREATE INDEX IF NOT EXISTS` untuk performa query
    - _Requirements: 9.5, 9.6, 10.4, 15.1, 16.1_

  - [x] 2.2 Buat file `includes/db.php` untuk koneksi PDO SQLite
    - Fungsi `getDB(): PDO` yang mengembalikan singleton PDO dengan `ERRMODE_EXCEPTION` dan `DEFAULT_FETCH_ASSOC`
    - Jalankan schema.sql otomatis saat file database belum ada (`file_exists(DB_PATH)` check)
    - Set `PRAGMA journal_mode = WAL` dan `PRAGMA foreign_keys = ON`
    - _Requirements: 18.4_

  - [x] 2.3 Buat seeder `data/seeder.php` untuk data awal admin dan konten demo
    - Insert admin default: username `admin`, password di-hash dengan `password_hash(..., PASSWORD_BCRYPT)`
    - Insert data mempelai contoh dan settings hashtag
    - Script harus idempoten (gunakan `INSERT OR IGNORE`)
    - _Requirements: 15.1, 19.1_


- [x] 3. Backend PHP: Includes (Helper, Auth, Upload)
  - [x] 3.1 Buat `includes/helpers.php` dengan fungsi utilitas inti
    - Implementasikan `sanitizeText(string $input, int $maxLength): string` â€” strip_tags + trim + htmlspecialchars + mb_substr
    - Implementasikan `validateAttendance(string $value): bool`
    - Implementasikan `validateTimeRange(string $start, string $end): bool` â€” strtotime comparison
    - Implementasikan `sendJson(array $data, int $code = 200): void` dan `sendError(int $code, string $message): void`
    - _Requirements: 4.5, 9.3, 17.4, 19.2, 19.3_

  - [x] 3.2 Buat `includes/auth.php` dengan helper autentikasi sesi
    - Fungsi `requireAuth(): void` â€” cek `$_SESSION['admin_id']` dan expiry 2 jam, redirect ke login jika invalid
    - Fungsi `checkRateLimit(string $username): bool` â€” baca `failed_attempts` dan `locked_until` dari DB
    - Fungsi `recordFailedAttempt(string $username): void` â€” increment counter dan set lockout jika â‰¥ 5
    - Fungsi `clearFailedAttempts(string $username): void` â€” reset counter setelah login berhasil
    - Fungsi `generateCsrfToken(): string` dan `validateCsrfToken(string $token): bool`
    - _Requirements: 15.2, 15.3, 15.5, 15.6, 15.7, 19.4, 19.5_

  - [x] 3.3 Buat `includes/upload.php` dengan fungsi upload file aman
    - Implementasikan `validateAndSaveFile(array $file, string $subdir, array $allowedTypes, int $maxSize): string`
    - Validasi ukuran file, tipe MIME via `finfo`, generate nama acak dengan `bin2hex(random_bytes(16))`, `move_uploaded_file`
    - Fungsi `deleteFile(string $path): void` dengan validasi path tidak keluar dari folder `uploads/`
    - _Requirements: 3.4, 6.5, 6.6, 7.3, 7.4, 13.5_


- [x] 4. API Router dan Endpoint PHP
  - [x] 4.1 Buat `api/index.php` sebagai front controller API
    - Baca `$_GET['endpoint']` dan `$_GET['action']`, routing ke file endpoint yang sesuai
    - Set header `Content-Type: application/json` dan CORS headers di sini
    - Tangani method OPTIONS untuk preflight request
    - _Requirements: 17.4, 19.2_

  - [x] 4.2 Buat `api/auth.php` â€” endpoint login dan logout
    - `POST ?endpoint=auth&action=login`: validasi CSRF, cek rate limit, verifikasi `password_verify`, set `$_SESSION['admin_id']` + timestamp, reset failed attempts
    - `POST ?endpoint=auth&action=logout`: `session_destroy()`, return success
    - Return error 429 saat terkunci beserta sisa waktu dalam detik
    - _Requirements: 15.2, 15.3, 15.5, 15.6, 15.7_

  - [x] 4.3 Buat `api/content.php` â€” endpoint konten publik (GET)
    - `GET ?endpoint=content`: query JOIN semua tabel konten (settings, couple, events, gallery, love_story, digital_envelope, music aktif), return JSON terstruktur
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 6.1, 7.1, 8.1, 11.1, 13.1_

  - [x] 4.4 Buat `api/rsvp.php` â€” endpoint RSVP (publik POST, admin GET/DELETE)
    - `POST ?endpoint=rsvp`: sanitasi input, validasi `guest_name` tidak kosong + `attendance` enum + `guest_count` 1â€“10, upsert berdasarkan `LOWER(guest_name)`
    - `GET ?endpoint=rsvp` (admin): return semua data RSVP terurut
    - `GET ?endpoint=rsvp&action=export` (admin): return CSV dengan header yang benar
    - `DELETE ?endpoint=rsvp&id={id}` (admin): hapus satu entri
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 19.3, 19.6_

  - [x] 4.5 Buat `api/guestbook.php` â€” endpoint buku tamu (publik GET/POST, admin DELETE)
    - `GET ?endpoint=guestbook`: return daftar ucapan newest-first dengan pagination opsional
    - `POST ?endpoint=guestbook`: sanitasi, validasi `sender_name` tidak kosong + `message` tidak kosong + panjang â‰¤ 500 char, insert
    - `DELETE ?endpoint=guestbook&id={id}` (admin): hapus satu ucapan
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 19.3, 19.6_

  - [x] 4.6 Buat endpoint admin PHP: couple, events, settings, gallery, love-story, envelope, music
    - `api/couple.php`: PUT update data mempelai (sanitasi, validasi panjang field), POST upload foto mempelai
    - `api/events.php`: PUT update detail acara (validasi `validateTimeRange`), field `akad` dan `resepsi` independen
    - `api/gallery.php`: POST upload foto (validasi tipe + ukuran), DELETE hapus foto + file fisik
    - `api/love-story.php`: POST tambah item, PUT edit item, DELETE hapus item + file fisik
    - `api/envelope.php`: POST tambah entri, PUT edit entri, DELETE hapus entri
    - `api/music.php`: POST upload MP3/OGG (maks. 10 MB), DELETE hapus musik + file fisik
    - Semua endpoint admin wajib memanggil `requireAuth()` di awal
    - _Requirements: 3.3, 3.4, 4.5, 6.5, 6.6, 6.7, 7.3, 7.4, 7.5, 11.4, 11.5, 11.6, 13.5, 17.1, 17.2, 17.4, 17.5, 17.6_

  - [x] 4.7 Buat `api/dashboard.php` â€” endpoint statistik snapshot (admin)
    - Hitung: `COUNT(*) WHERE attendance='hadir'`, `COUNT(*) WHERE attendance='tidak_hadir'`, total guestbook
    - Return JSON statistik
    - _Requirements: 16.1_

- [ ] 5. Checkpoint â€” Verifikasi Backend
  - Pastikan semua endpoint API merespons JSON yang benar, cek dengan curl atau Postman. Jalankan seeder untuk mengisi data awal. Tanyakan jika ada pertanyaan.


- [x] 6. Frontend Guest Page: HTML dan CSS
  - [x] 6.1 Buat `index.html` â€” shell HTML Guest Page dengan semua section
    - Buat 12 section: `#cover`, `#bismillah`, `#couple`, `#events`, `#countdown`, `#gallery`, `#love-story`, `#maps`, `#rsvp`, `#guestbook`, `#envelope`, `#footer`
    - Tambahkan atribut `data-animate` pada elemen yang perlu scroll animation
    - Import Google Fonts (Playfair Display + Inter), GSAP CDN, tsParticles CDN, Feather Icons
    - Tambahkan `<meta>` OG tags untuk share preview, loading skeleton per section
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1, 10.1, 11.1, 12.1, 14.1_

  - [x] 6.2 Buat `assets/css/guest.css` â€” styling utama Guest Page (tema Modern Heritage)
    - Definisikan CSS custom properties: palet warna (8 warna sesuai desain), font variables, spacing scale
    - Style tiap section: cover (full-height, centered, background ornamen), bismillah, couple (card grid), events (two-column cards), countdown, gallery (masonry grid), love-story (timeline vertikal), maps, rsvp, guestbook, envelope, footer
    - Implementasikan responsive breakpoints: mobile `< 768px` (1 kolom), tablet `768â€“1023px` (2 kolom), desktop `â‰¥ 1024px` (3 kolom)
    - Style tombol, form input, dialog konfirmasi, pesan validasi
    - _Requirements: 1.6, 14.1, 14.2, 14.3, 14.6, 14.7_

  - [x] 6.3 Buat `assets/css/animations.css` â€” CSS keyframes pendukung
    - Definisikan keyframes: `fadeInUp`, `fadeIn`, `scaleIn`, `petalsFloat`, `pulseGold`
    - CSS transitions untuk hover state tombol dan kartu
    - Utility class `[data-animate]` â€” state awal `opacity: 0; transform: translateY(30px)`
    - _Requirements: 14.4, 14.5_

  - [x] 6.4 Tambahkan ornamen SVG inline ke `assets/images/ornaments/`
    - Buat 2â€“3 file SVG motif batik/floral berwarna hijau dan emas untuk dekorasi cover dan section divider
    - _Requirements: 1.6, 14.1_


- [x] 7. Animasi GSAP: Opening, ScrollTrigger, dan Partikel
  - [x] 7.1 Buat `assets/js/animations.js` â€” GSAP opening animation dan scroll triggers
    - Implementasikan `playOpeningAnimation(onComplete)` sesuai desain: amplop (y+100â†’0), lid rotateX, kartu naik, bunga mekaran, cover content fade-in â€” total â‰¤ 4 detik
    - Implementasikan `initScrollAnimations()` dengan `ScrollTrigger` pada semua `[data-animate]` elemen: `opacity: 0 â†’ 1, y: 30 â†’ 0`, `start: "top 80%"`, `once: true`
    - Implementasikan `skipAnimation()` untuk tombol skip dan klik saat animasi berlangsung
    - _Requirements: 1.2, 1.5, 1.7, 2.2, 3.2, 4.2, 6.4, 7.2, 14.4_

  - [x] 7.2 Buat `assets/js/particles.js` â€” konfigurasi tsParticles
    - Konfigurasi partikel: bentuk kelopak bunga atau bulatan emas, jumlah â‰¤ 40 partikel, opacity rendah, gerak lambat (CLS < 0.1)
    - Fungsi `initParticles(containerId)` yang dipanggil setelah opening animation selesai
    - _Requirements: 14.5_


- [x] 8. Logika JavaScript Guest Page
  - [x] 8.1 Buat `assets/js/guest.js` â€” logika utama dan rendering konten dinamis
    - Fungsi `init()`: baca `?to=` dari URL, panggil `GET /api/?endpoint=content`, render semua section dari JSON
    - Implementasikan `buildGreeting(name): string` â€” kembalikan string salam yang mengandung nama tamu
    - Render conditional sections: sembunyikan `#countdown` jika tanggal null, `#maps` jika URL kosong, `#envelope` jika array kosong
    - Fallback: skeleton UI saat loading, konten localStorage jika API gagal, placeholder SVG jika foto 404
    - _Requirements: 1.3, 1.4, 3.5, 4.6, 5.4, 8.4, 8.5, 11.7_

  - [x] 8.2 Tulis property test untuk `buildGreeting` â€” Property 1
    - **Property 1: buildGreeting mengandung nama tamu secara verbatim**
    - **Validates: Requirements 1.3**

  - [x] 8.3 Buat `assets/js/countdown.js` â€” countdown timer
    - Implementasikan `calculateCountdown(targetDate): { days, hours, minutes, seconds, elapsed }` â€” kalkulasi murni tanpa side effect
    - Fungsi `startCountdownTimer(targetDate, elementId)` yang update DOM setiap 1 detik via `setInterval`
    - Tangani elapsed (tanggal lewat): tampilkan teks "Alhamdulillah, Acara Telah Berlangsung"
    - Handle `targetDate === null` tanpa error
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 8.4 Tulis property test untuk `calculateCountdown` â€” Property 5
    - **Property 5: countdown timer non-negatif dan konsisten untuk tanggal masa depan**
    - **Validates: Requirements 5.1, 5.2**

  - [x] 8.5 Buat `assets/js/rsvp.js` â€” logika form RSVP
    - Implementasikan `validateRSVP(data): boolean` â€” cek `guest_name.trim()` tidak kosong, `attendance` enum, `guest_count` 1â€“10
    - Auto-fill `guest_name` dari `?to=` parameter
    - Submit via `fetch POST /api/?endpoint=rsvp`, tampilkan pesan sukses/error inline, jangan reset form jika error
    - Tampilkan pesan validasi per field jika gagal validasi
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 8.6 Tulis property test untuk `validateRSVP` â€” Property 7
    - **Property 7: validateRSVP konsisten dengan semua kombinasi input valid/invalid**
    - **Validates: Requirements 9.3, 9.4, 19.6**

  - [x] 8.7 Buat `assets/js/guestbook.js` â€” logika form buku tamu
    - Implementasikan `validateGuestbook(data): boolean` â€” cek nama tidak kosong, pesan tidak kosong, panjang pesan â‰¤ 500
    - Submit via `fetch POST /api/?endpoint=guestbook`, append ucapan baru ke DOM tanpa reload, reset form jika sukses
    - Load awal guestbook dari `GET /api/?endpoint=guestbook` (newest first)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 8.8 Tulis property test untuk `validateGuestbook` â€” Property 9
    - **Property 9: validateGuestbook konsisten dengan aturan validasi buku tamu**
    - **Validates: Requirements 10.2, 10.3**

  - [x] 8.9 Buat `assets/js/lightbox.js` â€” galeri lightbox
    - Inisialisasi lightbox pada klik foto galeri (fullscreen overlay)
    - Navigasi next/prev dengan tombol yang di-disable di foto pertama/terakhir
    - Tutup lightbox dengan klik overlay atau tombol close
    - Lazy loading foto galeri (IntersectionObserver, threshold 200px dari viewport)
    - _Requirements: 6.2, 6.3, 6.4, 18.3_

  - [x] 8.10 Buat `assets/js/music.js` â€” background music controller
    - `initMusic(audioUrl)`: buat `<audio>` element, tombol play/pause toggle dengan ikon yang sesuai status
    - Jika `audioUrl === null`, set tombol ke `disabled`
    - Mulai putar otomatis setelah tombol "Buka Undangan" ditekan (dipanggil dari animations.js callback)
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.6_

  - [x] 8.11 Implementasikan fitur share dan salin nomor rekening di `assets/js/guest.js`
    - Fungsi `stripToParam(url): string` â€” hapus parameter `?to=` dari URL, pertahankan parameter lain
    - Tombol WhatsApp: buka `https://wa.me/?text=...` dengan encode URL undangan + nama mempelai
    - Tombol salin link: `navigator.clipboard.writeText(stripToParam(location.href))`, tampilkan "Tersalin!" 2 detik, fallback manual jika gagal
    - Tombol salin rekening per entri amplop: `navigator.clipboard.writeText(nomor)`, fallback serupa
    - _Requirements: 11.2, 11.3, 12.1, 12.2, 12.3_

  - [x] 8.12 Tulis property test untuk `stripToParam` â€” Property 10
    - **Property 10: stripToParam menghapus parameter `to` dari URL sambil mempertahankan parameter lain**
    - **Validates: Requirements 12.3**

  - [x] 8.13 Implementasikan `generateICS(event): string` di `assets/js/guest.js`
    - Fungsi murni yang menerima objek event (title, date, start_time, end_time, address) dan kembalikan string iCalendar
    - Tombol "Simpan ke Kalender" trigger download file `.ics` via Blob URL
    - Tampilkan pesan error jika generate gagal
    - _Requirements: 4.3, 4.4_

  - [x] 8.14 Tulis property test untuk `generateICS` â€” Property 3
    - **Property 3: generateICS mengandung semua 5 field event dalam output .ics**
    - **Validates: Requirements 4.3**

  - [x] 8.15 Implementasikan `validateTextLength(text, maxLength): boolean` di `assets/js/guest.js`
    - Fungsi murni: kembalikan `true` jika `text.length <= maxLength`, `false` jika melebihi
    - Gunakan di validasi client-side form RSVP, guestbook, dan preview Admin
    - _Requirements: 2.3, 3.3, 7.3, 10.2, 17.1, 17.2, 17.3_

  - [x] 8.16 Tulis property test untuk `validateTextLength` â€” Property 2
    - **Property 2: validateTextLength konsisten â€” false jika dan hanya jika melebihi batas**
    - **Validates: Requirements 2.3, 3.3, 7.3, 10.2, 17.1, 17.2, 17.3**

  - [x] 8.17 Implementasikan `validateTimeRange(start, end): boolean` (JS) di `assets/js/guest.js`
    - Validasi client-side untuk form Admin Detail Acara
    - _Requirements: 4.5_

  - [x] 8.18 Tulis property test untuk `validateTimeRange` (JS) â€” Property 4
    - **Property 4: validateTimeRange â€” false jika end < start, true jika end >= start**
    - **Validates: Requirements 4.5**

  - [x] 8.19 Implementasikan `sanitizeText(input, maxLength): string` (JS) di `assets/js/guest.js`
    - Strip tag HTML eksekutable, trim whitespace, truncate ke maxLength
    - Digunakan sebagai lapisan client-side sebelum submit form
    - _Requirements: 19.2, 19.3_

  - [x] 8.20 Tulis property test untuk `sanitizeText` (JS) â€” Property 11
    - **Property 11: sanitizeText tidak menghasilkan tag HTML eksekutable dan respeksi maxLength**
    - **Validates: Requirements 19.2, 19.3**


- [ ] 9. Checkpoint â€” Verifikasi Guest Page
  - Buka `index.html?to=NamaTamu` di browser, verifikasi animasi opening, rendering konten, countdown, RSVP, guestbook berjalan. Pastikan semua tests JS pass dengan `npx vitest --run`. Tanyakan jika ada pertanyaan.

- [x] 10. Admin Panel: Login dan Dashboard
  - [x] 10.1 Buat `admin/login.html` dan logika login
    - Form HTML dengan field username + password + hidden CSRF token
    - Submit via `fetch POST /api/?endpoint=auth&action=login`
    - Tampilkan pesan error "Username atau password salah" jika gagal
    - Tampilkan sisa waktu lockout jika response 429
    - Redirect ke `admin/index.html` setelah login berhasil
    - _Requirements: 15.1, 15.2, 15.3, 15.6_

  - [x] 10.2 Buat `admin/index.html` â€” halaman dashboard admin
    - Tampilkan statistik: total RSVP hadir, total RSVP tidak hadir, total ucapan tamu (fetch dari `/api/?endpoint=dashboard`)
    - Layout sidebar + content area sesuai desain
    - Tombol "Pratinjau Undangan" yang buka `index.html` di tab baru
    - Tombol logout: `fetch POST /api/?endpoint=auth&action=logout`, redirect ke login
    - Navigasi sidebar ke semua modul
    - _Requirements: 15.4, 15.5, 16.1, 16.2, 16.3_

  - [x] 10.3 Buat `assets/css/admin.css` â€” styling Admin Panel
    - Layout: header sticky + sidebar fixed + content scrollable
    - Style form, tabel data, tombol aksi, dialog konfirmasi, notifikasi sukses/error
    - Responsive: sidebar collapse di mobile
    - _Requirements: 16.2_


- [x] 11. Admin Panel: Semua Modul Pengelolaan Konten
  - [x] 11.1 Buat `admin/couple.html` â€” modul data mempelai
    - Form edit data mempelai pria dan wanita secara independen (nama lengkap, panggilan, ayah, ibu)
    - Upload foto (preview sebelum simpan, validasi tipe + ukuran di client)
    - Submit via PUT/POST API, tampilkan notifikasi sukses/error dalam â‰¤ 3 detik
    - Validasi panjang field sesuai batas yang ditentukan
    - _Requirements: 3.3, 3.4, 3.5, 17.1, 17.4, 17.5, 17.6_

  - [x] 11.2 Buat `admin/events.html` â€” modul detail acara
    - Form edit detail akad dan resepsi secara independen (tanggal, jam mulai, jam selesai, nama tempat, alamat, URL Maps)
    - Validasi `waktu selesai >= waktu mulai` di client sebelum submit
    - Submit via PUT API, tampilkan notifikasi
    - _Requirements: 4.5, 4.6, 17.2, 17.4, 17.5, 17.6_

  - [x] 11.3 Buat `admin/gallery.html` â€” modul galeri foto
    - Tampilkan grid foto yang sudah ada dengan tombol hapus per foto
    - Upload foto baru dengan dialog konfirmasi sebelum hapus
    - Validasi tipe MIME dan ukuran di client, tampilkan error spesifik jika melanggar
    - _Requirements: 6.5, 6.6, 6.7, 17.4_

  - [x] 11.4 Buat `admin/love-story.html` â€” modul love story
    - Tampilkan daftar item timeline, tombol tambah / edit / hapus
    - Form modal/inline: judul, tanggal, deskripsi, foto opsional
    - Dialog konfirmasi sebelum hapus, notifikasi sukses/error
    - _Requirements: 7.3, 7.4, 7.5, 7.6, 17.4, 17.5, 17.6_

  - [x] 11.5 Buat `admin/envelope.html` â€” modul amplop digital
    - CRUD entri rekening: tambah, edit inline, hapus dengan konfirmasi
    - Validasi panjang nama bank (â‰¤ 100), nama pemilik (â‰¤ 50), nomor rekening (â‰¤ 50)
    - _Requirements: 11.4, 11.5, 11.6, 17.4_

  - [x] 11.6 Buat `admin/rsvp.html` â€” modul lihat dan ekspor RSVP
    - Tabel data RSVP: nama, kehadiran, jumlah tamu, tanggal kirim
    - Tombol hapus per entri dengan dialog konfirmasi
    - Tombol "Ekspor CSV" yang trigger download
    - _Requirements: 9.7, 9.8, 9.9_

  - [x] 11.7 Buat `admin/guestbook.html` â€” modul lihat dan hapus ucapan
    - Tabel ucapan: nama pengirim, pesan, tanggal/waktu
    - Tombol hapus per ucapan dengan dialog konfirmasi
    - _Requirements: 10.6, 10.7_

  - [x] 11.8 Buat `admin/music.html` dan `admin/settings.html` â€” modul musik dan pengaturan umum
    - Upload file musik MP3/OGG (validasi format + ukuran â‰¤ 10 MB), hapus musik aktif
    - Form edit teks pembuka/Bismillah (maks. 500 char) dan hashtag
    - _Requirements: 2.3, 2.4, 2.5, 13.5, 17.3, 17.4, 17.5_

  - [x] 11.9 Buat `assets/js/admin.js` â€” logika JavaScript Admin Panel
    - Auth guard: cek sesi via API, redirect ke login jika expired
    - Fungsi generik: `showNotification(msg, type)`, `showConfirmDialog(msg, onConfirm)`, `handleApiError(response)`
    - Module-specific functions dipanggil dari setiap halaman admin
    - Generate dan validasi CSRF token untuk setiap form submission
    - _Requirements: 15.4, 17.4, 17.5, 17.6, 19.4_


- [ ] 12. Checkpoint â€” Verifikasi Admin Panel
  - Login ke Admin Panel, edit semua modul, verifikasi perubahan muncul di Guest Page. Pastikan rate limiting dan lockout berfungsi. Tanyakan jika ada pertanyaan.

- [ ] 13. Property-Based Tests dan Unit Tests PHP
  - [x] 13.1 Tulis unit tests PHPUnit untuk `helpers.php` (`tests/php/HelpersTest.php`)
    - Test `sanitizeText`: strip tag HTML, truncate, preserve teks normal
    - Test `validateAttendance`: true untuk 'hadir'/'tidak_hadir', false untuk yang lain
    - Test `validateTimeRange`: sama valid, end > start valid, end < start invalid
    - _Requirements: 4.5, 19.2, 19.3_

  - [x] 13.2 Tulis property test Eris untuk `sanitizeText` PHP â€” Property 11 (PHP)
    - Generate string acak mengandung `<script>`, SQL injection, teks normal
    - Assert: output tidak mengandung `<script`, output â‰¤ maxLength
    - **Validates: Requirements 19.2, 19.3**

  - [x] 13.3 Tulis unit tests PHPUnit untuk `auth.php` (`tests/php/AuthTest.php`)
    - Test rate limiting: â‰¤ 4 gagal tidak lock, â‰¥ 5 gagal lock 15 menit
    - Test CSRF token: token valid pass, token invalid/expired fail
    - Test session expiry: timestamp > 7200 detik dianggap expired
    - _Requirements: 15.2, 15.6, 15.7, 19.4, 19.5_

  - [x] 13.4 Tulis unit tests PHPUnit untuk `upload.php` (`tests/php/UploadTest.php`)
    - Test file di atas batas ukuran ditolak
    - Test MIME type tidak valid ditolak
    - Test MIME type dan ukuran valid menghasilkan path file
    - _Requirements: 6.6, 7.4, 13.5_

  - [ ] 13.5 Tulis property test Eris untuk `validateFileUpload` PHP â€” Property 6
    - Generate kombinasi ukuran file (valid/invalid) dan MIME type (valid/invalid)
    - Assert: false jika ukuran > batas ATAU MIME tidak valid; true hanya jika keduanya valid
    - **Validates: Requirements 6.6, 7.4, 13.5**

  - [x] 13.6 Tulis unit tests Vitest untuk `countdown.js` (`tests/unit/countdown.test.js`)
    - Test `calculateCountdown(null)` tidak throw error
    - Test tanggal masa lalu mengembalikan `elapsed: true`
    - Test jam selalu 0â€“23, menit 0â€“59, detik 0â€“59
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 13.7 Tulis unit tests Vitest untuk fungsi validasi form (`tests/unit/validation.test.js`)
    - Test `validateRSVP`: nama kosong â†’ false, attendance salah â†’ false, guest_count batas â†’ benar
    - Test `validateGuestbook`: nama kosong â†’ false, pesan > 500 â†’ false, valid â†’ true
    - Test `validateTextLength`: tepat di batas â†’ true, satu karakter di atas â†’ false
    - Test `validateTimeRange` JS: semua edge case
    - _Requirements: 9.3, 9.4, 10.2, 10.3_

  - [ ] 13.8 Tulis property test fast-check untuk `validateFileUpload` JS â€” Property 6 (JS)
    - Generate arbitrary fileSize dan mimeType
    - Assert konsistensi fungsi dengan aturan batas
    - **Validates: Requirements 6.6, 7.4, 13.5**

  - [ ] 13.9 Tulis property test Eris untuk upsert RSVP idempoten â€” Property 8 (PHP)
    - Gunakan in-memory SQLite, submit dua kali dengan nama case-insensitive identik
    - Assert: hanya satu entri tersisa, data terbaru yang dipertahankan
    - **Validates: Requirements 9.6**

  - [ ] 13.10 Tulis integration tests PHPUnit untuk endpoint API (`tests/php/ApiTest.php`)
    - Test `GET /api/?endpoint=content` mengembalikan semua konten dalam struktur yang benar
    - Test `POST /api/?endpoint=rsvp` dengan data valid insert dan data invalid ditolak
    - Test `POST /api/?endpoint=guestbook` dengan data valid/invalid
    - Test endpoint admin ditolak 401 tanpa sesi
    - _Requirements: 9.5, 10.4, 19.3_


- [ ] 14. Checkpoint â€” Verifikasi Semua Tests
  - Jalankan `npx vitest --run` (JS) dan `./vendor/bin/phpunit tests/` (PHP). Pastikan semua tests pass termasuk property-based tests. Tanyakan jika ada pertanyaan.

- [x] 15. Konfigurasi Deployment VPS
  - [x] 15.1 Buat `.htaccess` di root project â€” konfigurasi Apache
    - Rewrite rule: semua request ke `api/` route melalui `api/index.php`
    - Proteksi folder: deny direct access ke `data/`, `includes/`, file `.php` di root (kecuali entry point)
    - Security headers: `X-Frame-Options SAMEORIGIN`, `X-Content-Type-Options nosniff`, `X-XSS-Protection`
    - Force HTTPS redirect
    - _Requirements: 18.4, 19.2_

  - [x] 15.2 Buat `nginx.conf.example` â€” konfigurasi Nginx alternatif
    - Server block untuk domain dengan PHP-FPM
    - Location rules setara dengan `.htaccess`: block direct access ke `data/`, `includes/`
    - Gzip compression untuk JS, CSS, HTML, JSON
    - `try_files` untuk routing API
    - _Requirements: 18.1, 18.4_

  - [x] 15.3 Buat `deploy.sh` â€” skrip deployment otomatis
    - Set permission folder: `uploads/` 755, `data/` 755, `data/wedding.db` 644
    - Jalankan seeder jika database belum ada
    - Buat `.env` dari `.env.example` jika belum ada
    - _Requirements: 18.4_

  - [x] 15.4 Buat `README.md` â€” panduan instalasi dan konfigurasi
    - Langkah instalasi: clone, permission, jalankan seeder, konfigurasi web server
    - Dokumentasi struktur folder, endpoint API, cara mengganti password admin
    - _Requirements: 18.4_

- [ ] 16. Checkpoint Final â€” Verifikasi End-to-End
  - Deploy ke VPS uji coba, buka Guest Page dari mobile dan desktop, verifikasi semua animasi dan fitur berjalan. Jalankan semua tests terakhir kali. Pastikan semua selesai, tanyakan jika ada pertanyaan.

---

## Notes

- Task bertanda `*` bersifat opsional dan dapat dilewati untuk MVP yang lebih cepat
- Setiap task merujuk ke requirements spesifik untuk keterlacakan
- Checkpoint memastikan validasi inkremental sebelum melanjutkan ke tahap berikutnya
- Property tests memvalidasi properti universal (min. 100 iterasi), unit tests memvalidasi contoh spesifik dan edge case
- Semua kode PHP wajib melewati `sanitizeText` sebelum data disimpan ke database
- Semua endpoint admin wajib memanggil `requireAuth()` di baris pertama


## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3"] },
    { "id": 3, "tasks": ["3.1", "3.2", "3.3"] },
    { "id": 4, "tasks": ["4.1"] },
    { "id": 5, "tasks": ["4.2", "4.3"] },
    { "id": 6, "tasks": ["4.4", "4.5", "4.6", "4.7"] },
    { "id": 7, "tasks": ["6.1", "6.4"] },
    { "id": 8, "tasks": ["6.2", "6.3"] },
    { "id": 9, "tasks": ["7.1", "7.2"] },
    { "id": 10, "tasks": ["8.1", "8.3", "8.5", "8.7", "8.9", "8.10", "8.13", "8.15", "8.17", "8.19"] },
    { "id": 11, "tasks": ["8.2", "8.4", "8.6", "8.8", "8.11", "8.12", "8.14", "8.16", "8.18", "8.20"] },
    { "id": 12, "tasks": ["10.1", "10.2", "10.3"] },
    { "id": 13, "tasks": ["11.1", "11.2", "11.3", "11.4", "11.5", "11.6", "11.7", "11.8"] },
    { "id": 14, "tasks": ["11.9"] },
    { "id": 15, "tasks": ["13.1", "13.3", "13.4", "13.6", "13.7"] },
    { "id": 16, "tasks": ["13.2", "13.5", "13.8", "13.9", "13.10"] },
    { "id": 17, "tasks": ["15.1", "15.2", "15.3", "15.4"] }
  ]
}
```

