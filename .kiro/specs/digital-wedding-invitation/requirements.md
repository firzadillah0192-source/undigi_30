# Dokumen Kebutuhan (Requirements Document)

## Pendahuluan

Website undangan digital pernikahan ini adalah aplikasi web yang memungkinkan pasangan pengantin menyebarkan undangan pernikahan secara digital kepada tamu undangan. Sistem terdiri dari dua komponen utama: **Halaman Undangan (Guest Page)** yang bisa diakses oleh tamu, dan **Panel Admin (CMS)** yang digunakan pengantin atau pengelola untuk mengedit seluruh konten undangan.

Tema desain menggabungkan estetika modern dengan nuansa Heritage (tradisional/batik/floral) menggunakan palet warna hijau dan putih, dilengkapi animasi penuh (full animation) yang responsif dan mobile-first. Sistem mendukung personalisasi nama tamu melalui parameter URL (`?to=NamaTamu`) sehingga setiap tamu menerima undangan yang terasa personal.

**Stack Teknologi:**
- Frontend: HTML5, CSS3, Vanilla JavaScript, GSAP (animasi)
- Penyimpanan data: File `data.json` di server (tidak menggunakan database)
- Penyimpanan foto: Folder `/uploads/` di server, referensi path disimpan di `data.json`
- Admin panel: HTML/JS + PHP minimal (hanya untuk membaca/menulis `data.json` dan menangani upload foto)
- Deployment: VPS dengan PHP dan Nginx atau Apache

---

## Glosarium

- **Sistem**: Aplikasi website undangan digital pernikahan secara keseluruhan
- **Guest_Page**: Halaman undangan yang ditampilkan kepada tamu undangan
- **Admin_Panel**: Halaman pengelolaan konten yang hanya dapat diakses oleh admin
- **Admin**: Pengelola undangan (pengantin atau perwakilannya) yang memiliki akses ke Admin_Panel
- **Tamu**: Individu yang mengakses Guest_Page menggunakan tautan undangan
- **RSVP_System**: Subsistem yang mengelola konfirmasi kehadiran tamu, menyimpan data ke `data.json`
- **Guestbook_System**: Subsistem yang mengelola ucapan dan pesan dari tamu, menyimpan data ke `data.json`
- **Media_Manager**: Subsistem PHP yang mengelola upload foto ke folder `/uploads/` dan memperbarui referensi path di `data.json`
- **Animation_Engine**: Kumpulan animasi GSAP yang berjalan di Guest_Page
- **Data_Store**: File `data.json` di server yang menjadi satu-satunya sumber penyimpanan data aplikasi (menggantikan database)
- **URL_Parameter**: Parameter nama tamu yang disematkan pada URL undangan (`?to=NamaTamu`)
- **Amplop_Digital**: Fitur pengiriman hadiah/uang secara digital melalui rekening bank atau e-wallet
- **Love_Story**: Bagian timeline yang menceritakan perjalanan kisah cinta mempelai
- **Countdown_Timer**: Penghitung mundur waktu menuju hari pernikahan
- **Background_Music**: Musik latar yang diputar otomatis atau manual di Guest_Page

---

## Kebutuhan

---

### Kebutuhan 1: Tampilan Cover dan Animasi Opening

**User Story:** Sebagai Tamu, saya ingin melihat animasi pembuka yang menarik saat pertama membuka undangan, agar saya merasakan pengalaman yang berkesan dan personal sejak awal.

#### Kriteria Penerimaan

1. WHEN Tamu membuka tautan undangan, THE Guest_Page SHALL menampilkan layar cover dengan nama mempelai dan tanggal pernikahan sebelum konten utama ditampilkan.
2. WHEN Tamu menekan tombol "Buka Undangan", THE Animation_Engine SHALL memainkan animasi opening (amplop terbuka dan bunga bermekaran) dengan durasi tidak lebih dari 4 detik.
3. WHERE URL_Parameter `?to=NamaTamu` disertakan, THE Guest_Page SHALL menampilkan teks personalisasi "Kepada Yth. [NamaTamu]" pada layar cover.
4. IF URL_Parameter `?to=` tidak disertakan atau kosong, THEN THE Guest_Page SHALL menampilkan teks default "Kepada Yth. Tamu Undangan" tanpa error.
5. WHEN animasi opening selesai, THE Guest_Page SHALL melakukan scroll otomatis ke section pertama konten undangan yang berada tepat di bawah layar cover.
6. THE Guest_Page SHALL menampilkan cover dengan motif batik atau floral berwarna hijau dan putih sebagai elemen visual dekoratif.
7. WHEN Tamu menekan tombol skip atau menekan layar selama animasi opening berlangsung, THE Animation_Engine SHALL menghentikan animasi dan langsung menampilkan konten undangan.

---

### Kebutuhan 2: Section Pembuka (Bismillah)

**User Story:** Sebagai Tamu, saya ingin melihat kalimat pembuka religius/formal, agar undangan terasa sakral dan berkesan sesuai budaya.

#### Kriteria Penerimaan

1. THE Guest_Page SHALL menampilkan section pembuka yang berisi teks Bismillah dan kalimat pembuka undangan setelah section cover.
2. WHEN Tamu melakukan scroll hingga section pembuka mencapai 50% area tampilan (viewport), THE Animation_Engine SHALL memainkan entrance animation fade-in pada elemen teks dengan durasi antara 300ms hingga 600ms, dan animasi ini hanya diputar sekali per sesi.
3. THE Admin_Panel SHALL menyediakan form untuk mengedit teks kalimat pembuka/Bismillah dengan batas maksimal 500 karakter.
4. WHEN Admin menyimpan teks kalimat pembuka melalui Admin_Panel, THE Admin_Panel SHALL menampilkan notifikasi konfirmasi keberhasilan atau kegagalan penyimpanan.
5. WHEN Admin berhasil menyimpan perubahan teks kalimat pembuka, THE Guest_Page SHALL menampilkan teks yang diperbarui pada kunjungan berikutnya tanpa perlu deploy ulang.

---

### Kebutuhan 3: Profil Mempelai

**User Story:** Sebagai Tamu, saya ingin melihat profil lengkap kedua mempelai beserta foto, agar saya mengenal lebih baik pasangan yang akan menikah.

#### Kriteria Penerimaan

1. THE Guest_Page SHALL menampilkan section profil yang memuat nama lengkap, foto, dan nama orang tua dari masing-masing mempelai (mempelai pria dan mempelai wanita).
2. WHEN Tamu melakukan scroll ke section profil, THE Animation_Engine SHALL memainkan entrance animation pada kartu profil mempelai.
3. THE Admin_Panel SHALL menyediakan form untuk mengedit nama lengkap (maks. 100 karakter), nama panggilan (maks. 100 karakter), nama ayah (maks. 100 karakter), nama ibu (maks. 100 karakter), dan foto profil (format JPG, PNG, atau WebP, maks. 5 MB) masing-masing mempelai secara independen.
4. WHEN Admin mengunggah foto mempelai melalui Admin_Panel, THE Media_Manager SHALL menyimpan foto dan menampilkannya di Guest_Page dalam waktu tidak lebih dari 5 detik setelah penyimpanan berhasil; IF penyimpanan gagal, THEN THE Admin_Panel SHALL menampilkan indikasi error dan tidak mengubah foto yang sebelumnya ditampilkan di Guest_Page.
5. IF foto mempelai belum diunggah, THEN THE Guest_Page SHALL menampilkan gambar placeholder tanpa ikon broken image atau pesan error yang terlihat oleh Tamu.

---

### Kebutuhan 4: Detail Acara Pernikahan

**User Story:** Sebagai Tamu, saya ingin melihat informasi lengkap jadwal dan lokasi acara, agar saya bisa mempersiapkan kehadiran dengan baik.

#### Kriteria Penerimaan

1. THE Guest_Page SHALL menampilkan section detail acara yang memuat informasi akad nikah dan resepsi secara terpisah, masing-masing mencakup: tanggal, hari, waktu mulai, waktu selesai, nama gedung/tempat, dan alamat lengkap.
2. WHEN Tamu melakukan scroll hingga section detail acara mencapai 50% area tampilan, THE Animation_Engine SHALL memainkan entrance animation pada elemen kartu acara sekali per sesi.
3. THE Guest_Page SHALL menampilkan dua tombol "Simpan ke Kalender" (satu untuk akad, satu untuk resepsi) yang masing-masing mengunduh file `.ics` berisi: judul acara, tanggal, waktu mulai, waktu selesai, dan alamat lokasi.
4. IF pembuatan file `.ics` gagal, THEN THE Guest_Page SHALL menampilkan pesan error kepada Tamu dan tidak mengubah data yang sudah tersimpan.
5. THE Admin_Panel SHALL menyediakan form untuk mengedit semua data detail acara (tanggal, waktu mulai, waktu selesai, nama gedung, alamat, URL Maps) untuk akad dan resepsi secara independen; WHEN Admin menyimpan perubahan, THE Admin_Panel SHALL memvalidasi bahwa waktu selesai tidak lebih awal dari waktu mulai dan menampilkan notifikasi konfirmasi keberhasilan atau kegagalan.
6. IF salah satu atau lebih dari field tanggal, waktu mulai, waktu selesai, nama gedung, atau alamat belum diisi oleh Admin, THEN THE Guest_Page SHALL menampilkan teks "Segera diumumkan" pada setiap field yang kosong tersebut secara individual.

---

### Kebutuhan 5: Countdown Timer

**User Story:** Sebagai Tamu, saya ingin melihat hitungan mundur menuju hari pernikahan, agar saya merasakan antusiasme dan tidak melewatkan acara tersebut.

#### Kriteria Penerimaan

1. THE Guest_Page SHALL menampilkan Countdown_Timer yang menghitung mundur hari, jam, menit, dan detik menuju tanggal dan waktu akad nikah yang dikonfigurasi Admin.
2. WHILE Countdown_Timer berjalan, THE Guest_Page SHALL memperbarui tampilan detik setiap 1 detik secara real-time menggunakan waktu lokal perangkat Tamu.
3. WHEN tanggal dan waktu akad nikah telah berlalu, THE Guest_Page SHALL menampilkan teks "Alhamdulillah, Acara Telah Berlangsung" menggantikan Countdown_Timer.
4. IF tanggal akad nikah belum dikonfigurasi oleh Admin, THEN THE Guest_Page SHALL menyembunyikan section Countdown_Timer tanpa menyebabkan error tampilan.
5. WHEN Admin mengubah tanggal atau waktu akad nikah di Admin_Panel, THE Countdown_Timer SHALL menghitung ulang berdasarkan tanggal dan waktu baru pada kunjungan Guest_Page berikutnya.

---

### Kebutuhan 6: Galeri Foto

**User Story:** Sebagai Tamu, saya ingin melihat galeri foto prewedding atau momen spesial mempelai, agar saya bisa menikmati kenangan visual yang dibagikan.

#### Kriteria Penerimaan

1. THE Guest_Page SHALL menampilkan section galeri foto dalam layout grid atau masonry yang menampilkan minimal 1 dan maksimal 20 foto.
2. WHEN Tamu mengklik salah satu foto di galeri, THE Guest_Page SHALL menampilkan foto tersebut dalam mode lightbox (fullscreen overlay).
3. WHEN Tamu menekan tombol navigasi berikutnya di lightbox dan foto yang ditampilkan adalah foto terakhir, THE Guest_Page SHALL menonaktifkan tombol navigasi berikutnya; WHEN Tamu menekan tombol navigasi sebelumnya dan foto yang ditampilkan adalah foto pertama, THE Guest_Page SHALL menonaktifkan tombol navigasi sebelumnya.
4. WHEN Tamu melakukan scroll ke section galeri, THE Animation_Engine SHALL memainkan entrance animation staggered pada setiap foto.
5. THE Admin_Panel SHALL menyediakan fitur untuk mengunggah foto baru ke galeri dengan format JPG, PNG, atau WebP dan ukuran maksimal 5 MB per file.
6. IF ukuran file foto melebihi 5 MB atau format tidak didukung, THEN THE Media_Manager SHALL menampilkan pesan error spesifik kepada Admin dan tidak menyimpan file tersebut.
7. WHEN Admin menghapus foto dari galeri, THE Admin_Panel SHALL menampilkan dialog konfirmasi sebelum menghapus dan menampilkan notifikasi keberhasilan setelah penghapusan berhasil.

---

### Kebutuhan 7: Love Story / Timeline

**User Story:** Sebagai Tamu, saya ingin membaca kisah perjalanan cinta mempelai, agar saya mengenal lebih dekat cerita di balik pernikahan mereka.

#### Kriteria Penerimaan

1. THE Guest_Page SHALL menampilkan section Love_Story dalam format timeline vertikal yang menampilkan momen-momen penting dalam urutan kronologis ascending (terlama ke terbaru).
2. WHEN Tamu melakukan scroll ke setiap item timeline, THE Animation_Engine SHALL memainkan entrance animation pada item tersebut secara bertahap (staggered).
3. THE Admin_Panel SHALL menyediakan form untuk menambah, mengedit, dan menghapus item Love_Story, masing-masing memuat: judul (maks. 100 karakter), tanggal, deskripsi (maks. 500 karakter), dan foto opsional (format JPG/PNG/WebP, maks. 5 MB).
4. IF Admin mengunggah foto opsional pada item Love_Story dengan format tidak didukung atau ukuran melebihi 5 MB, THEN THE Media_Manager SHALL menampilkan pesan error kepada Admin dan tidak menyimpan foto tersebut.
5. WHEN Admin menyimpan perubahan Love_Story dan terjadi kesalahan Database, THEN THE Admin_Panel SHALL menampilkan pesan error yang deskriptif dan mempertahankan data Love_Story yang sebelumnya tersimpan.
6. WHEN Admin berhasil menyimpan perubahan Love_Story, THE Guest_Page SHALL menampilkan perubahan tersebut pada kunjungan berikutnya tanpa perlu deploy ulang.

---

### Kebutuhan 8: Peta Lokasi

**User Story:** Sebagai Tamu, saya ingin melihat peta lokasi acara, agar saya bisa menemukan tempat acara dengan mudah.

#### Kriteria Penerimaan

1. THE Guest_Page SHALL menampilkan section peta yang memuat Google Maps embed untuk lokasi akad dan resepsi.
2. THE Guest_Page SHALL menampilkan tombol "Buka di Google Maps" yang membuka URL Google Maps dalam tab baru dengan koordinat atau alamat lokasi acara.
3. THE Admin_Panel SHALL menyediakan field untuk memasukkan URL embed Google Maps atau koordinat (latitude/longitude) untuk masing-masing lokasi acara; IF nilai yang dimasukkan bukan URL valid atau koordinat dalam format yang benar, THEN THE Admin_Panel SHALL menampilkan pesan validasi dan tidak menyimpan nilai tersebut.
4. IF URL Maps tidak diisi oleh Admin, THEN THE Guest_Page SHALL menyembunyikan section peta tanpa menyebabkan error tampilan.
5. IF embed Google Maps gagal dimuat (misalnya karena masalah jaringan), THEN THE Guest_Page SHALL menampilkan teks alternatif berupa alamat lengkap lokasi tanpa menyebabkan error tampilan.

---

### Kebutuhan 9: RSVP / Konfirmasi Kehadiran

**User Story:** Sebagai Tamu, saya ingin mengkonfirmasi kehadiran saya melalui undangan digital, agar mempelai dapat mempersiapkan jumlah tamu dengan akurat.

#### Kriteria Penerimaan

1. THE Guest_Page SHALL menampilkan form RSVP yang memuat field: nama tamu, nomor telepon (opsional), konfirmasi kehadiran (hadir/tidak hadir), dan jumlah tamu yang akan hadir (nilai antara 1 sampai 10).
2. WHERE URL_Parameter `?to=NamaTamu` disertakan, THE RSVP_System SHALL mengisi otomatis field nama tamu dengan nilai dari URL_Parameter tersebut.
3. WHEN Tamu mengirimkan form RSVP, THE RSVP_System SHALL memvalidasi bahwa field nama dan konfirmasi kehadiran telah diisi.
4. IF field wajib pada form RSVP tidak diisi, THEN THE RSVP_System SHALL menampilkan pesan validasi yang spesifik pada setiap field yang kosong dan tidak mengirimkan data.
5. WHEN Tamu berhasil mengirimkan form RSVP, THE RSVP_System SHALL menyimpan data ke Database dan menampilkan pesan konfirmasi kepada Tamu; IF penyimpanan gagal, THEN THE RSVP_System SHALL menampilkan pesan error kepada Tamu dan tidak menyimpan data parsial.
6. WHEN Tamu mengirimkan RSVP dengan nama yang sama persis (case-insensitive) dengan entri yang sudah ada, THE RSVP_System SHALL memperbarui data RSVP yang sudah ada, bukan membuat entri duplikat.
7. THE Admin_Panel SHALL menampilkan daftar seluruh data RSVP dalam format tabel yang mencakup: nama tamu, konfirmasi kehadiran, jumlah tamu, dan tanggal pengiriman.
8. THE Admin_Panel SHALL menyediakan fitur untuk mengekspor data RSVP ke format CSV.
9. WHEN Admin menghapus entri RSVP, THE Admin_Panel SHALL menampilkan dialog konfirmasi sebelum menghapus secara permanen.

---

### Kebutuhan 10: Buku Tamu / Ucapan Selamat

**User Story:** Sebagai Tamu, saya ingin mengirimkan ucapan selamat kepada mempelai, agar saya bisa berbagi kebahagiaan meskipun tidak hadir secara fisik.

#### Kriteria Penerimaan

1. THE Guest_Page SHALL menampilkan form ucapan yang memuat field: nama pengirim (maks. 100 karakter) dan isi pesan ucapan selamat.
2. WHEN Tamu mengirimkan form ucapan, THE Guestbook_System SHALL memvalidasi bahwa field nama pengirim telah diisi, field isi pesan telah diisi, dan panjang pesan tidak melebihi 500 karakter.
3. IF field nama pengirim tidak diisi, THEN THE Guestbook_System SHALL menampilkan pesan validasi spesifik pada field nama; IF field isi pesan tidak diisi atau melebihi 500 karakter, THEN THE Guestbook_System SHALL menampilkan pesan validasi spesifik pada field pesan; dan dalam semua kondisi gagal validasi, data tidak disimpan.
4. WHEN Tamu berhasil mengirimkan ucapan, THE Guestbook_System SHALL menyimpan data ke Database, menampilkan ucapan tersebut di daftar buku tamu tanpa memuat ulang halaman, dan mereset form ke kondisi kosong.
5. THE Guest_Page SHALL menampilkan daftar ucapan tamu dalam urutan terbaru di atas (newest first) dengan tampilan nama pengirim dan isi pesan.
6. THE Admin_Panel SHALL menampilkan daftar seluruh ucapan tamu beserta tanggal dan waktu pengiriman.
7. WHEN Admin menghapus ucapan tamu, THE Admin_Panel SHALL menampilkan dialog konfirmasi sebelum menghapus secara permanen.

---

### Kebutuhan 11: Amplop Digital

**User Story:** Sebagai Tamu, saya ingin mengirimkan hadiah pernikahan secara digital, agar saya dapat memberikan apresiasi meskipun tidak membawa amplop fisik.

#### Kriteria Penerimaan

1. THE Guest_Page SHALL menampilkan section Amplop_Digital yang memuat informasi nomor rekening bank dan/atau e-wallet beserta nama pemilik rekening.
2. THE Guest_Page SHALL menampilkan tombol "Salin Nomor Rekening" untuk setiap metode pembayaran yang terdaftar.
3. WHEN Tamu menekan tombol "Salin Nomor Rekening" dan penyalinan ke clipboard berhasil, THE Guest_Page SHALL menampilkan konfirmasi visual "Tersalin!" selama 2 detik; IF penyalinan ke clipboard gagal (misalnya karena izin browser), THEN THE Guest_Page SHALL menampilkan pesan error yang meminta Tamu menyalin nomor secara manual.
4. THE Admin_Panel SHALL menyediakan form untuk menambah entri Amplop_Digital baru dengan field: nama bank/e-wallet (maks. 100 karakter), nama pemilik (maks. 50 karakter), dan nomor rekening/akun (maks. 50 karakter).
5. THE Admin_Panel SHALL menyediakan form untuk mengedit entri Amplop_Digital yang sudah ada.
6. WHEN Admin menghapus entri Amplop_Digital, THE Admin_Panel SHALL menampilkan dialog konfirmasi sebelum menghapus secara permanen.
7. IF tidak ada entri Amplop_Digital yang diisi oleh Admin, THEN THE Guest_Page SHALL menyembunyikan section Amplop_Digital tanpa menyebabkan error tampilan.

---

### Kebutuhan 12: Tombol Bagikan

**User Story:** Sebagai Tamu, saya ingin membagikan undangan ini kepada orang lain melalui media sosial atau pesan langsung, agar orang lain juga dapat menghadiri acara pernikahan.

#### Kriteria Penerimaan

1. THE Guest_Page SHALL menampilkan tombol bagikan yang mendukung minimal: WhatsApp, dan salin tautan (copy link).
2. WHEN Tamu menekan tombol bagikan WhatsApp, THE Guest_Page SHALL membuka WhatsApp dengan teks pesan yang sudah terisi berisi tautan undangan dan nama mempelai.
3. WHEN Tamu menekan tombol salin tautan dan penyalinan berhasil, THE Guest_Page SHALL menyalin URL dasar undangan (tanpa parameter `?to=`) ke clipboard dan menampilkan konfirmasi visual selama 2 detik; IF penyalinan gagal, THEN THE Guest_Page SHALL menampilkan pesan error kepada Tamu.

---

### Kebutuhan 13: Background Musik

**User Story:** Sebagai Tamu, saya ingin mendengar musik latar yang sesuai tema saat membuka undangan, agar pengalaman membaca undangan terasa lebih emosional dan berkesan.

#### Kriteria Penerimaan

1. WHEN Guest_Page pertama kali dimuat, THE Background_Music SHALL tidak diputar secara otomatis tanpa interaksi pengguna.
2. WHEN Tamu menekan tombol "Buka Undangan" pada cover, THE Background_Music SHALL mulai diputar secara otomatis.
3. THE Guest_Page SHALL menampilkan tombol kontrol musik (putar/jeda) yang terlihat dan dapat diakses di seluruh halaman, dengan ikon yang mencerminkan status saat ini (ikon putar saat dijeda, ikon jeda saat diputar).
4. WHEN Tamu menekan tombol kontrol musik, THE Background_Music SHALL beralih antara status putar dan jeda sesuai kondisi saat ini.
5. THE Admin_Panel SHALL menyediakan fitur untuk mengunggah file musik latar; IF format file bukan MP3 atau OGG, THEN THE Admin_Panel SHALL menampilkan pesan error format tidak didukung dan tidak menyimpan file; IF ukuran file melebihi 10 MB, THEN THE Admin_Panel SHALL menampilkan pesan error ukuran melebihi batas dan tidak menyimpan file.
6. IF file musik belum diunggah oleh Admin, THEN THE Guest_Page SHALL menampilkan tombol kontrol musik dalam kondisi nonaktif (disabled) tanpa error.

---

### Kebutuhan 14: Animasi dan Desain Visual

**User Story:** Sebagai Tamu, saya ingin menikmati tampilan website yang indah dengan animasi yang halus, agar pengalaman membuka undangan terasa premium dan berkesan.

#### Kriteria Penerimaan

1. THE Guest_Page SHALL menampilkan desain dengan elemen visual batik, floral, dan ornamen tradisional yang dikombinasikan dengan tata letak modern bersih.
2. THE Guest_Page SHALL menggunakan palet warna dominan hijau (dalam berbagai shade: hijau tua, hijau muda, sage green) dan putih sebagai warna latar.
3. THE Guest_Page SHALL menggunakan kombinasi font serif (untuk nuansa heritage) dan sans-serif (untuk nuansa modern) yang konsisten di seluruh halaman.
4. WHEN Tamu melakukan scroll ke setiap section, THE Animation_Engine SHALL memainkan scroll-triggered entrance animation dengan durasi antara 200ms hingga 600ms pada elemen-elemen dalam section tersebut.
5. THE Guest_Page SHALL menampilkan efek partikel dekoratif (seperti kelopak bunga atau butiran emas) yang bergerak di latar belakang dengan Cumulative Layout Shift (CLS) kurang dari 0.1 agar tidak mengganggu tata letak konten.
6. THE Guest_Page SHALL dioptimalkan untuk tampilan mobile-first dengan breakpoint: ponsel (lebar < 768px), tablet (768px – 1023px), dan desktop (≥ 1024px).
7. WHEN Guest_Page diakses pada layar dengan lebar kurang dari 768px, THE Guest_Page SHALL menyesuaikan tata letak menjadi tampilan satu kolom tanpa kehilangan fungsionalitas apapun.

---

### Kebutuhan 15: Autentikasi Admin

**User Story:** Sebagai Admin, saya ingin login ke panel admin dengan password, agar hanya saya yang dapat mengelola konten undangan.

#### Kriteria Penerimaan

1. THE Admin_Panel SHALL menampilkan halaman login yang meminta username dan password sebelum memberikan akses ke fitur pengelolaan.
2. WHEN Admin memasukkan username dan password yang benar, THE Admin_Panel SHALL memberikan akses ke dashboard admin dan menyimpan sesi login dengan durasi aktif 2 jam sejak login terakhir.
3. IF Admin memasukkan username atau password yang salah, THEN THE Admin_Panel SHALL menampilkan pesan error "Username atau password salah" dan tidak memberikan akses.
4. WHEN Admin yang belum login mengakses URL Admin_Panel secara langsung, THE Admin_Panel SHALL mengarahkan (redirect) ke halaman login.
5. WHEN Admin menekan tombol logout, THE Admin_Panel SHALL menghapus sesi login dan mengarahkan ke halaman login.
6. WHEN Admin gagal login sebanyak 5 kali berturut-turut, THE Admin_Panel SHALL menolak semua percobaan login berikutnya selama 15 menit dan menampilkan pesan yang memberitahu Admin tentang durasi pemblokiran.
7. WHEN masa pemblokiran 15 menit telah berakhir, THE Admin_Panel SHALL mengizinkan percobaan login kembali dan mereset penghitung percobaan gagal.

---

### Kebutuhan 16: Dashboard dan Navigasi Admin

**User Story:** Sebagai Admin, saya ingin memiliki dashboard yang mudah dinavigasi, agar saya dapat mengelola semua bagian undangan dengan efisien.

#### Kriteria Penerimaan

1. WHEN Admin berhasil login dan halaman dashboard dimuat, THE Admin_Panel SHALL menampilkan ringkasan statistik snapshot: total RSVP yang hadir, total RSVP yang tidak hadir, dan total ucapan tamu berdasarkan data pada saat halaman dimuat.
2. THE Admin_Panel SHALL menyediakan navigasi (sidebar atau menu) yang memuat tautan ke semua modul pengelolaan: Data Mempelai, Detail Acara, Galeri Foto, Love Story, Amplop Digital, RSVP, Buku Tamu, dan Pengaturan Musik.
3. THE Admin_Panel SHALL menampilkan tombol "Pratinjau Undangan" yang membuka Guest_Page di tab baru.

---

### Kebutuhan 17: Pengelolaan Konten Umum Admin

**User Story:** Sebagai Admin, saya ingin mengedit semua konten teks pada undangan dari satu tempat, agar saya tidak perlu mengubah kode program secara langsung.

#### Kriteria Penerimaan

1. THE Admin_Panel SHALL menyediakan form untuk mengedit data mempelai pria dan wanita secara independen, mencakup: nama lengkap (maks. 100 karakter), nama panggilan (maks. 50 karakter), nama ayah (maks. 100 karakter), nama ibu (maks. 100 karakter), dan foto profil.
2. THE Admin_Panel SHALL menyediakan form untuk mengedit detail acara akad dan resepsi secara independen, mencakup: tanggal, waktu mulai, waktu selesai, nama tempat (maks. 200 karakter), alamat lengkap (maks. 500 karakter), dan URL Google Maps.
3. THE Admin_Panel SHALL menyediakan form untuk mengedit teks kalimat pembuka/Bismillah (maks. 500 karakter).
4. WHEN Admin menekan tombol simpan pada form apapun, THE Admin_Panel SHALL memvalidasi bahwa semua field wajib terisi sebelum menyimpan; IF ada field wajib yang kosong, THEN THE Admin_Panel SHALL menampilkan pesan validasi spesifik pada field tersebut dan tidak menyimpan data.
5. WHEN Admin berhasil menyimpan perubahan pada form apapun di Admin_Panel, THE Admin_Panel SHALL menampilkan pesan konfirmasi dalam waktu tidak lebih dari 3 detik.
6. IF terjadi kesalahan saat menyimpan data ke Database, THEN THE Admin_Panel SHALL menampilkan pesan error yang menjelaskan bahwa penyimpanan gagal dan data sebelumnya tetap dipertahankan.

---

### Kebutuhan 18: Performa dan Ketersediaan

**User Story:** Sebagai Tamu, saya ingin undangan terbuka dengan cepat bahkan dengan koneksi internet yang lambat, agar saya tidak menutup halaman sebelum undangan termuat.

#### Kriteria Penerimaan

1. THE Guest_Page SHALL memuat dan menampilkan konten di atas lipatan (above the fold) dalam waktu tidak lebih dari 3 detik pada koneksi 4G (10 Mbps).
2. THE Guest_Page SHALL menggunakan format gambar yang dioptimalkan (WebP dengan fallback JPG) dengan ukuran file per gambar tidak melebihi 200 KB untuk semua foto yang ditampilkan.
3. THE Guest_Page SHALL menerapkan lazy loading pada foto galeri sehingga gambar hanya dimuat ketika berada dalam jarak 200 piksel dari area tampilan (viewport).
4. THE Sistem SHALL dapat di-deploy pada shared hosting standar yang mendukung PHP 7.4 atau Node.js 16 atau lebih baru.
5. THE Database SHALL mendukung setidaknya tiga opsi penyimpanan: MySQL, SQLite, atau JSON file, yang dapat dikonfigurasi melalui file konfigurasi.

---

### Kebutuhan 19: Keamanan Data

**User Story:** Sebagai Admin, saya ingin data tamu dan konten undangan terlindungi dari akses dan manipulasi yang tidak sah, agar privasi tamu terjaga.

#### Kriteria Penerimaan

1. THE Admin_Panel SHALL menyimpan password Admin dalam bentuk hash (bcrypt atau Argon2) di Database, bukan dalam bentuk teks biasa.
2. WHEN Admin mengirimkan form di Admin_Panel dengan input yang mengandung karakter berbahaya (seperti tag HTML atau karakter SQL injection), THEN THE Admin_Panel SHALL menolak atau menetralisir input tersebut sebelum menyimpan ke Database dan menampilkan pesan validasi kepada Admin.
3. WHEN Tamu mengirimkan form RSVP atau ucapan di Guest_Page dengan input yang mengandung karakter berbahaya, THEN THE Sistem SHALL menolak atau menetralisir input tersebut sebelum menyimpan ke Database.
4. THE Admin_Panel SHALL menggunakan token CSRF pada setiap form untuk mencegah serangan cross-site request forgery.
5. IF sesi Admin sudah tidak aktif selama lebih dari 2 jam, THEN THE Admin_Panel SHALL secara otomatis mengakhiri sesi dan mengarahkan ke halaman login.
6. THE Sistem SHALL membatasi panjang input dari form tamu: nama tamu dan nama pengirim ucapan maksimal 100 karakter, isi pesan ucapan maksimal 500 karakter, dan nilai konfirmasi kehadiran hanya menerima nilai enumerated yang valid (hadir/tidak hadir).
