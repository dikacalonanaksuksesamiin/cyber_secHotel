require('dotenv').config();
const express = require('express');
const cookieSession = require('cookie-session');
const helmet = require('helmet');
const path = require('path');
const db = require('./config/db');
const indexRoutes = require('./routes/index');
const adminRoutes = require('./routes/admin');

const app = express();

// Wajib untuk Vercel agar mengenali proxy HTTPS
app.set('trust proxy', 1);

// Konfigurasi View Engine (EJS)
app.engine('ejs', require('ejs').renderFile);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware Helmet
app.use(helmet({
    contentSecurityPolicy: false,
}));

// Middleware Dasar
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Konfigurasi Cookie Session untuk Vercel Serverless
app.use(cookieSession({
    name: 'session_hotel_ayong',
    keys: [process.env.SESSION_SECRET || 'rahasia_hotel_ayong'],
    maxAge: 24 * 60 * 60 * 1000, // Berlaku 24 jam
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
}));

// Penyesuaian kompatibilitas method express-session
app.use((req, res, next) => {
    if (req.session) {
        if (!req.session.destroy) {
            req.session.destroy = (cb) => {
                req.session = null;
                if (cb) cb();
            };
        }
        if (!req.session.save) {
            req.session.save = (cb) => {
                if (cb) cb();
            };
        }
    }
    next();
});

// Middleware Global untuk Session Customer & Admin
app.use((req, res, next) => {
    res.locals.customer = req.session.customerName || null;
    res.locals.isAdmin = req.session.isAdmin || false;
    next();
});

// Gunakan Rute
app.use('/', indexRoutes);
app.use('/admin', adminRoutes);

// Ekspor aplikasi untuk Vercel
module.exports = app;

// Jalankan server lokal jika dijalankan di laptop
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server berjalan di http://localhost:${PORT}`);
    });
}