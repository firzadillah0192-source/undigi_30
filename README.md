# Digital Wedding Invitation

Website undangan digital pernikahan berbasis PHP, SQLite, HTML, CSS, dan vanilla JavaScript. Project ini memiliki dua area utama: Guest Page untuk tamu dan Admin Panel untuk mengelola konten.

## Kebutuhan

- PHP 7.4 atau lebih baru dengan ekstensi PDO SQLite
- Web server Apache atau Nginx dengan PHP-FPM
- Node.js untuk menjalankan test JavaScript
- Composer untuk menjalankan test PHP

## Instalasi Cepat

1. Salin project ke server.
2. Pastikan folder berikut dapat ditulis oleh proses web server: `data/` dan `uploads/`.
3. Jalankan seeder:

```sh
php data/seeder.php
```

4. Login Admin Panel melalui `admin/login.html`.
5. Akun awal: username `admin`, password `admin123`.
6. Ganti password admin setelah login pertama dengan memperbarui hash di database.

## Struktur Penting

- `index.html`: halaman undangan untuk tamu.
- `admin/`: halaman Admin Panel.
- `api/index.php`: front controller API.
- `api/*.php`: endpoint API.
- `includes/`: konfigurasi, koneksi database, auth, helper, upload.
- `data/schema.sql`: schema SQLite.
- `data/wedding.db`: database produksi/lokal.
- `uploads/`: file foto dan musik yang diunggah.

## Endpoint API

Publik:

- `GET /api/?endpoint=content`
- `GET /api/?endpoint=guestbook`
- `POST /api/?endpoint=rsvp`
- `POST /api/?endpoint=guestbook`
- `GET /api/?endpoint=auth&action=csrf`
- `POST /api/?endpoint=auth&action=login`

Admin:

- `GET /api/?endpoint=dashboard`
- `PUT /api/?endpoint=couple&role=groom`
- `POST /api/?endpoint=couple&role=groom&action=photo`
- `PUT /api/?endpoint=events&type=akad`
- `PUT /api/?endpoint=settings`
- `POST /api/?endpoint=gallery`
- `DELETE /api/?endpoint=gallery&id={id}`
- `POST /api/?endpoint=love-story`
- `PUT /api/?endpoint=love-story&id={id}`
- `DELETE /api/?endpoint=love-story&id={id}`
- `POST /api/?endpoint=envelope`
- `PUT /api/?endpoint=envelope&id={id}`
- `DELETE /api/?endpoint=envelope&id={id}`
- `GET /api/?endpoint=rsvp`
- `GET /api/?endpoint=rsvp&action=export`
- `DELETE /api/?endpoint=rsvp&id={id}`
- `DELETE /api/?endpoint=guestbook&id={id}`
- `POST /api/?endpoint=music`
- `DELETE /api/?endpoint=music&id={id}`
- `POST /api/?endpoint=auth&action=logout`

## Apache

Gunakan `.htaccess` yang sudah disediakan. Pastikan `mod_rewrite` dan `mod_headers` aktif.

## Nginx

Gunakan `nginx.conf.example` sebagai contoh server block. Sesuaikan `server_name`, `root`, sertifikat SSL, dan path PHP-FPM.

## Test

JavaScript:

```sh
npm install
npm test
```

PHP:

```sh
composer install
./vendor/bin/phpunit tests/php
```

## Deploy Helper

Di VPS Linux, jalankan:

```sh
sh deploy.sh
```

Skrip ini membuat folder upload/data, mengatur permission dasar, dan menjalankan seeder jika database belum ada.
