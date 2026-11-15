# Hotel AYONG - Web Reservation & Management System

> Aplikasi web manajemen reservasi kamar hotel berbasis Node.js dan EJS yang dikembangkan untuk memenuhi tugas mata kuliah **Keamanan Siber** 

---

## 🚀 Fitur Utama

* **Sistem Otentikasi & Registrasi**: Pendaftaran akun pelanggan baru dan login aman dengan enkripsi password menggunakan `bcrypt`.
* **Dashboard Admin (CRUD)**: Manajemen data kamar hotel, pemantauan status reservasi, dan pengelolaan akun secara terpusat.
* **Cetak Laporan PDF (A4 Lanskap)**: Fitur rekapitulasi data reservasi yang dirancang otomatis rapi untuk dicetak atau disimpan sebagai dokumen PDF resmi.
* **Desain Responsif (Mobile-Friendly)**: Tampilan antarmuka yang presisi dan nyaman diakses melalui perangkat *smartphone* maupun laptop.
* **Penguatan Keamanan Siber**:
  * **Helmet.js**: Melindungi aplikasi dari celah keamanan HTTP headers standar (*Clickjacking*, *MIME-sniffing*, dll).
  * **Express-Rate-Limit**: Mencegah serangan *brute-force* pada form login dengan membatasi jumlah percobaan akses.
  * **Parameterized Queries**: Melindungi database dari ancaman *SQL Injection*.

---

## 🛠️ Teknologi yang Digunakan

* **Backend**: Node.js, Express.js
* **View Engine**: EJS (Embedded JavaScript Templates)
* **Database**: Supabase (PostgreSQL)
* **Keamanan**: Bcrypt, Helmet, Express-Rate-Limit
* **Frontend Framework**: Bootstrap 5, CSS3, HTML5

---

## 📁 Struktur Direktori Proyek

```text
hotel-ayong-node/
│
├── config/
│   └── db.js                  # Konfigurasi koneksi database Supabase
├── public/
│   ├── css/
│   │   └── style.css          # Stylesheet utama aplikasi
│   ├── images/                # Aset gambar (Logo, Hero background, dll)
│   └── uploads/               # Folder penyimpanan file unggahan
├── routes/
│   ├── admin.js               # Rute manajemen admin & laporan PDF
│   └── index.js               # Rute publik, autentikasi, & reservasi customer
├── views/
│   ├── partials/              # Komponen modular header & footer
│   ├── admin_edit_kamar.ejs   # Halaman edit data kamar (Admin)
│   ├── admin_login.ejs        # Halaman login khusus admin
│   ├── admin_tambah_kamar.ejs # Halaman tambah kamar baru (Admin)
│   ├── dashboard.ejs          # Panel kontrol admin hotel
│   ├── index.ejs              # Halaman Landing Page responsif
│   ├── laporan_pdf.ejs        # Template cetak laporan PDF A4 Landscape
│   ├── login.ejs              # Halaman login customer
│   ├── pesan.ejs              # Halaman pemesanan / reservasi kamar
│   ├── register.ejs           # Halaman registrasi pelanggan baru
│   └── riwayat.ejs            # Halaman riwayat pemesanan customer
├── .env                       # Variabel lingkungan (Environment Variables)
├── package-lock.json          # Lockfile dependensi npm
├── package.json               # Daftar dependencies & script proyek
├── README.md                  # Dokumentasi proyek
├── seed-admin.js              # Script inisialisasi data admin awal
├── server.js                  # Berkas utama peluncur server Node.js
└── vercel.json                # Konfigurasi deployment/hosting