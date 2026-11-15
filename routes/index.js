const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');

// Rate limiter khusus login customer
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 menit
    max: 5, // Maksimal 5 percobaan
    message: 'Terlalu banyak percobaan login. Silakan coba lagi setelah 15 menit.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).render('login', {
            error: 'Terlalu banyak percobaan login. Silakan coba lagi setelah 15 menit.',
            success: null,
            isAdmin: false
        });
    }
});

// Middleware untuk cek apakah customer sudah login
const isCustomerLoggedIn = (req, res, next) => {
    if (req.session && req.session.isCustomer) {
        return next();
    }
    res.redirect('/login');
};

// 1. HALAMAN UTAMA (Beranda)
router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM kamar ORDER BY id ASC');
        res.render('index', { kamar: result.rows, customer: req.session.customerName || null });
    } catch (err) {
        console.error(err);
        res.status(500).send("Terjadi kesalahan pada server.");
    }
});

// 2. REGISTER CUSTOMER (Form & Proses)
router.get('/register', (req, res) => {
    if (req.session.isCustomer) return res.redirect('/');
    res.render('register', { error: null });
});

router.post('/register', async (req, res) => {
    const { nama, email, password } = req.body;
    try {
        // Cek apakah email sudah terdaftar
        const checkEmail = await db.query('SELECT * FROM pelanggan WHERE email = $1', [email]);
        if (checkEmail.rows.length > 0) {
            return res.render('register', { error: 'Email sudah terdaftar. Silakan gunakan email lain.' });
        }

        // Hash password dengan bcrypt
        const hashedPassword = await bcrypt.hash(password, 10);

        // Simpan ke database
        await db.query(
            'INSERT INTO pelanggan (nama, email, password) VALUES ($1, $2, $3)',
            [nama, email, hashedPassword]
        );

        res.redirect('/login');
    } catch (err) {
        console.error(err);
        res.render('register', { error: 'Terjadi kesalahan saat pendaftaran.' });
    }
});

// 3. LOGIN CUSTOMER (Form & Proses)
router.get('/login', (req, res) => {
    res.render('login', { error: null, success: null, isAdmin: false });
});

router.post('/login', loginLimiter, async (req, res) => {
    const { email, password, remember } = req.body;
    try {
        const result = await db.query('SELECT * FROM pelanggan WHERE email = $1', [email]);
        if (result.rows.length > 0) {
            const customer = result.rows[0];
            const isMatch = await bcrypt.compare(password, customer.password);
            if (isMatch) {
                req.session.isCustomer = true;
                req.session.customerId = customer.id;
                req.session.customerName = customer.nama;

                // Atur durasi sesi jika "Remember me" dicentang
                if (remember) {
                    req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000; // Aktif 7 hari
                } else {
                    req.session.cookie.expires = false; // Otomatis logout saat browser ditutup
                }

                return res.redirect('/');
            }
        }
        res.render('login', { error: 'Email atau password salah!' });
    } catch (err) {
        console.error(err);
        res.render('login', { error: 'Terjadi kesalahan pada server.' });
    }
});

// PROSES PENGAJUAN LUPA PASSWORD
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const check = await db.query('SELECT * FROM pelanggan WHERE email = $1', [email]);
        if (check.rows.length === 0) {
            return res.render('login', { error: 'Email tersebut tidak terdaftar.', success: null });
        }

        await db.query('UPDATE pelanggan SET reset_requested = TRUE WHERE email = $1', [email]);
        res.render('login', { 
            error: null, 
            success: 'Permintaan terkirim! Silakan konfirmasi ke resepsionis/admin untuk password baru Anda.' 
        });
    } catch (err) {
        console.error(err);
        res.render('login', { error: 'Terjadi kesalahan pada server.', success: null });
    }
});

// 4. LOGOUT CUSTOMER
router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

// 5. FORM PEMESANAN KAMAR (Wajib Login Customer)
router.get('/pesan/:id', isCustomerLoggedIn, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('SELECT * FROM kamar WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.redirect('/');
        res.render('pesan', { 
            kamar: result.rows[0], 
            customerName: req.session.customerName,
            error: null, 
            success: null 
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Terjadi kesalahan pada server.");
    }
});

// 6. PROSES SIMPAN PEMESANAN
router.post('/pesan/:id', isCustomerLoggedIn, async (req, res) => {
    const { id } = req.params;
    const { email, telepon, tanggal_checkin, tanggal_checkout } = req.body;
    const customerId = req.session.customerId;
    const customerName = req.session.customerName;
    
    try {
        const kamarResult = await db.query('SELECT * FROM kamar WHERE id = $1', [id]);
        if (kamarResult.rows.length === 0) return res.redirect('/');

        // Simpan reservasi dengan menghubungkan pelanggan_id
        await db.query(
            'INSERT INTO reservasi (kamar_id, pelanggan_id, nama_pemesan, email, telepon, tanggal_checkin, tanggal_checkout, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [id, customerId, customerName, email, telepon, tanggal_checkin, tanggal_checkout, 'Pending']
        );

        // Ubah status kamar menjadi 'Disewa'
        await db.query('UPDATE kamar SET status = $1 WHERE id = $2', ['Disewa', id]);

        const updatedKamar = await db.query('SELECT * FROM kamar WHERE id = $1', [id]);

        res.render('pesan', { 
            kamar: updatedKamar.rows[0], 
            customerName: customerName,
            success: 'Pemesanan berhasil dikirim! Silakan cek menu Riwayat Pemesanan Anda.',
            error: null 
        });
    } catch (err) {
        console.error(err);
        const kamarResult = await db.query('SELECT * FROM kamar WHERE id = $1', [id]);
        res.render('pesan', { 
            kamar: kamarResult.rows[0] || {}, 
            customerName: customerName,
            error: 'Gagal melakukan pemesanan. Silakan coba lagi.',
            success: null 
        });
    }
});

// 7. RIWAYAT PEMESANAN CUSTOMER
router.get('/riwayat', isCustomerLoggedIn, async (req, res) => {
    try {
        const customerId = req.session.customerId;
        const reservasi = await db.query(`
            SELECT reservasi.*, kamar.nama_kamar, kamar.harga 
            FROM reservasi 
            JOIN kamar ON reservasi.kamar_id = kamar.id 
            WHERE reservasi.pelanggan_id = $1 
            ORDER BY reservasi.id DESC
        `, [customerId]);

        res.render('riwayat', { 
            reservasi: reservasi.rows, 
            customerName: req.session.customerName 
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Gagal memuat riwayat pemesanan.");
    }
});

module.exports = router;