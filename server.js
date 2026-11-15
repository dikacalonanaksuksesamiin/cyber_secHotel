require('dotenv').config();
const express = require('express');
const session = require('express-session');
const helmet = require('helmet'); // <-- 1. Import Helmet untuk amankan HTTP headers
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

// 2. Terapkan Middleware Helmet
app.use(helmet({
    contentSecurityPolicy: false, // Dinonaktifkan sementara agar CDN Bootstrap & gambar tidak terblokir
}));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET || 'rahasia',
    resave: false,
    saveUninitialized: false
}));

app.use(session({
    secret: process.env.SESSION_SECRET || 'rahasia',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // true jika di Vercel (HTTPS)
        httpOnly: true,
        sameSite: 'lax'
    }
}));

// Middleware Global untuk Session Customer & Admin
app.use((req, res, next) => {
    res.locals.customer = req.session.customerName || null;
    res.locals.isAdmin = req.session.isAdmin || false;
    next();
});

// Gunakan Rute
app.use('/', indexRoutes);
app.use('/admin', adminRoutes);

// Ekspor aplikasi agar bisa dibaca oleh Vercel
module.exports = app;

// Jalankan server lokal jika dijalankan secara langsung (di laptop)
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server berjalan di http://localhost:${PORT}`);
    });
}