const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');

const adminLoginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Terlalu banyak percobaan login admin. Coba lagi dalam 15 menit.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Terapkan pada rute login admin
router.post('/login', adminLoginLimiter, async (req, res) => {
    // ... logika login admin Anda yang sudah ada ...
});

// Konfigurasi Penyimpanan Gambar dengan Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../public/uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Nama file unik berdasarkan waktu
    }
});
const upload = multer({ storage: storage });

// Middleware Keamanan Session
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.isAdmin) {
        return next();
    }
    res.redirect('/admin/login');
};

// 1. HALAMAN LOGIN
router.get('/login', (req, res) => {
    res.render('login', { error: null, isAdmin: true });
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await db.query('SELECT * FROM admin WHERE username = $1', [username]);
        if (result.rows.length > 0) {
            const admin = result.rows[0];
            const isMatch = await bcrypt.compare(password, admin.password);
            if (isMatch) {
                req.session.isAdmin = true;
                req.session.adminUser = admin.username;
                return res.redirect('/admin/dashboard');
            }
        }
        res.render('admin_login', { error: 'Username atau password salah!' });
    } catch (err) {
        console.error(err);
        res.render('admin_login', { error: 'Terjadi kesalahan pada server.' });
    }
});

// 2. DASHBOARD (READ Kamar & Reservasi)

router.get('/dashboard', isAuthenticated, async (req, res) => {
    try {
        // Ambil data kamar
        const kamar = await db.query(
            'SELECT * FROM kamar ORDER BY id ASC'
        );

        // Ambil data pelanggan dan permintaan reset password
        const pelanggan = await db.query(
            'SELECT id, nama, email, reset_requested FROM pelanggan ORDER BY reset_requested DESC, id ASC'
        );

        // Ambil data reservasi
        const reservasi = await db.query(`
            SELECT reservasi.*, kamar.nama_kamar
            FROM reservasi
            JOIN kamar ON reservasi.kamar_id = kamar.id
            ORDER BY reservasi.id DESC
        `);

        res.render('dashboard', {
            admin: req.session.adminUser,
            kamar: kamar.rows,
            reservasi: reservasi.rows,
            pelanggan: pelanggan.rows
        });

    } catch (err) {
        console.error(err);
        res.status(500).send("Gagal memuat dashboard admin.");
    }
});


// 3. CREATE (Tambah Kamar - Form & Proses)
router.get('/kamar/tambah', isAuthenticated, (req, res) => {
    res.render('admin_tambah_kamar', { admin: req.session.adminUser });
});

router.post('/kamar/tambah', isAuthenticated, upload.single('foto'), async (req, res) => {
    const { nama_kamar, harga, status, keterangan } = req.body;
    const foto = req.file ? req.file.filename : null;
    try {
        await db.query(
            'INSERT INTO kamar (nama_kamar, harga, status, keterangan, foto) VALUES ($1, $2, $3, $4, $5)',
            [nama_kamar, harga, status, keterangan, foto]
        );
        res.redirect('/admin/dashboard');
    } catch (err) {
        console.error(err);
        res.status(500).send("Gagal menambahkan kamar.");
    }
});

// 4. UPDATE (Edit Kamar - Form & Proses)
router.get('/kamar/edit/:id', isAuthenticated, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('SELECT * FROM kamar WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.redirect('/admin/dashboard');
        res.render('admin_edit_kamar', { admin: req.session.adminUser, k: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).send("Gagal memuat data kamar.");
    }
});

router.post('/kamar/edit/:id', isAuthenticated, upload.single('foto'), async (req, res) => {
    const { id } = req.params;
    const { nama_kamar, harga, status, keterangan } = req.body;

    try {
        // Ambil data lama untuk cek foto
        const oldData = await db.query('SELECT foto FROM kamar WHERE id = $1', [id]);
        let foto = oldData.rows[0] ? oldData.rows[0].foto : null;

        // Jika upload foto baru, ganti yang lama
        if (req.file) {
            if (foto) {
                const oldPath = path.join(__dirname, '../public/uploads', foto);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
            foto = req.file.filename;
        }

        await db.query(
            'UPDATE kamar SET nama_kamar = $1, harga = $2, status = $3, keterangan = $4, foto = $5 WHERE id = $6',
            [nama_kamar, harga, status, keterangan, foto, id]
        );
        res.redirect('/admin/dashboard');
    } catch (err) {
        console.error(err);
        res.status(500).send("Gagal memperbarui kamar.");
    }
});

// 5. DELETE (Hapus Kamar)
router.get('/kamar/hapus/:id', isAuthenticated, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('SELECT foto FROM kamar WHERE id = $1', [id]);
        if (result.rows.length > 0) {
            const foto = result.rows[0].foto;
            if (foto) {
                const filePath = path.join(__dirname, '../public/uploads', foto);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }
        }
        await db.query('DELETE FROM kamar WHERE id = $1', [id]);
        res.redirect('/admin/dashboard');
    } catch (err) {
        console.error(err);
        res.status(500).send("Gagal menghapus kamar.");
    }
});

// LOGOUT
router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/admin/login');
    });
});

// 6. UBAH STATUS RESERVASI (Konfirmasi / Batalkan)
router.get('/reservasi/status/:id/:status', isAuthenticated, async (req, res) => {
    const { id, status } = req.params;

    const allowedStatus = ['Pending', 'Dikonfirmasi', 'Dibatalkan'];
    if (!allowedStatus.includes(status)) {
        return res.redirect('/admin/dashboard');
    }

    try {
        // Ambil kamar_id berdasarkan reservasi yang akan diubah statusnya
        const reservasiRes = await db.query('SELECT kamar_id FROM reservasi WHERE id = $1', [id]);

        if (reservasiRes.rows.length > 0) {
            const kamarId = reservasiRes.rows[0].kamar_id;

            // Update status reservasi
            await db.query('UPDATE reservasi SET status = $1 WHERE id = $2', [status, id]);

            // Jika pesanan DIBATALKAN oleh admin, kembalikan status kamar jadi 'Tersedia'
            if (status === 'Dibatalkan') {
                await db.query('UPDATE kamar SET status = $1 WHERE id = $2', ['Tersedia', kamarId]);
            }
        }

        res.redirect('/admin/dashboard');
    } catch (err) {
        console.error(err);
        res.status(500).send("Gagal memperbarui status reservasi.");
    }
});

// Rute Tampilan Laporan PDF Cetak
router.get('/reservasi/pdf', isAuthenticated, async (req, res) => {
    try {
        const reservasi = await db.query(`
            SELECT reservasi.*, kamar.nama_kamar 
            FROM reservasi 
            JOIN kamar ON reservasi.kamar_id = kamar.id 
            ORDER BY reservasi.id ASC
        `);

        // Render view khusus PDF (misal: views/laporan_pdf.ejs)
        res.render('laporan_pdf', { reservasi: reservasi.rows });
    } catch (err) {
        console.error(err);
        res.status(500).send("Gagal memuat laporan PDF.");
    }
});


// 7. RESET PASSWORD PELANGGAN
router.post('/pelanggan/reset-password/:id', isAuthenticated, async (req, res) => {
    const { id } = req.params;
    const { password_baru } = req.body;

    try {
        // Enkripsi password baru
        const hashedPassword = await bcrypt.hash(password_baru, 10);

        // Update password dan matikan status permintaan reset
        await db.query(
            'UPDATE pelanggan SET password = $1, reset_requested = FALSE WHERE id = $2',
            [hashedPassword, id]
        );

        res.redirect('/admin/dashboard');

    } catch (err) {
        console.error(err);
        res.status(500).send("Gagal mereset password pelanggan.");
    }
});

module.exports = router;